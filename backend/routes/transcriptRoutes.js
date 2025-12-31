const express = require('express');
const admin = require('firebase-admin');
const pdfParse = require('pdf-parse');

const router = express.Router();

router.post('/parse-transcript', async (req, res) => {
  try {
    const { id, token, pdf_content } = req.body;

    if (!id || !token || !pdf_content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, token, or pdf_content'
      });
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired authentication token'
      });
    }

    if (decodedToken.uid !== id) {
      return res.status(403).json({
        success: false,
        error: 'Token does not match user ID'
      });
    }

    let pdfBuffer;
    try {
      pdfBuffer = Buffer.from(pdf_content, 'base64');
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid base64 PDF content'
      });
    }

    if (pdfBuffer.length > 512 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'PDF file size exceeds 0.5MB limit'
      });
    }

    let pdfData;
    try {
      pdfData = await pdfParse(pdfBuffer);
    } catch (error) {
      console.error('PDF parsing error:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to parse PDF file'
      });
    }

    const transcriptText = pdfData.text;

    if (!transcriptText.includes('Unofficial Transcript - UT-Dallas')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transcript: Not a UTD unofficial transcript'
      });
    }

    if (!transcriptText.includes('Name:') || !transcriptText.includes('Student ID:')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transcript: Missing student information'
      });
    }

    const transcriptData = extractTranscriptData(transcriptText);
    transcriptData.id = id;

    const currentSemesterCourses = extractCurrentSemesterCourses(transcriptData);

    if (currentSemesterCourses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No courses found for the current semester'
      });
    }

    try {
      const userRef = admin.firestore().collection('users').doc(id);
      
      await userRef.set(
        {
          //transcriptData: transcriptData,
          lastTranscriptUpload: new Date().toISOString(),
          courses: currentSemesterCourses
        },
        { merge: true }
      );
    } catch (firestoreError) {
      console.error('Error saving to Firestore:', firestoreError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save transcript data'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Transcript parsed successfully',
      transcript_data: transcriptData,
      current_semester_courses: currentSemesterCourses
    });

  } catch (error) {
    console.error('Error in /api/parse-transcript:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while processing transcript',
      details: error.message
    });
  }
});


function extractTranscriptData(transcriptText) {
  const transcript_data = {
    student_name: null,
    student_id: null,
    courses: {
      transfer_credits: [],
      test_credits: [],
      utd_classes: {}
    }
  };

  const nameMatch = transcriptText.match(/Name:\s*(.+)/);
  if (nameMatch) {
    transcript_data.student_name = nameMatch[1].trim();
  }

  const idMatch = transcriptText.match(/Student ID:\s*(\d+)/);
  if (idMatch) {
    transcript_data.student_id = idMatch[1].trim();
  }

  const lines = transcriptText.split('\n');
  let currentSection = null;
  let currentSemester = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'Transfer Credits') {
      currentSection = 'transfer_credits';
      continue;
    }
    
    if (line === 'Test Credits') {
      currentSection = 'test_credits';
      continue;
    }
    
    if (line === 'Beginning of Undergraduate Record' || line === 'Beginning of Graduate Record') {
      currentSection = 'utd_classes';
      continue;
    }

    // Match semester header: "2025 Fall"
    const semesterMatch = line.match(/^(\d{4})\s+(Fall|Spring|Summer)$/);
    if (semesterMatch) {
      currentSemester = line;
      if (currentSection === 'utd_classes') {
        transcript_data.courses.utd_classes[currentSemester] = [];
      }
      continue;
    }

    // Match course line: "CS 3162PROF RESPONSIBILITY IN CS & SE1.0000.0000.000"
    // Format: [PREFIX] [NUMBER][DESCRIPTION][ATTEMPTED][EARNED][POINTS]
    const courseMatch = line.match(/^([A-Z]{2,4})\s+(\d{4})(.+?)([\d\.]+)([\d\.]+)(?:([\d\.]+))?$/);
    if (courseMatch && currentSection === 'utd_classes' && currentSemester) {
      const courseCode = `${courseMatch[1]} ${courseMatch[2]}`;
      let courseName = courseMatch[3].trim();
      const creditsAttempted = parseFloat(courseMatch[4]);
      const creditsEarned = parseFloat(courseMatch[5]);
      
      let grade = 'In Progress';
      let instructor = null;
      
      // Check following lines for instructor(s)
      let j = i + 1;
      const instructors = [];

      while (j < lines.length) {
        const nextLine = lines[j].trim();
        
        // Check for "Instructor:" line
        const instructorMatch = nextLine.match(/^Instructor:\s*(.+)$/);
        if (instructorMatch) {
          instructors.push(instructorMatch[1].trim());
          j++;
          
          // Continue checking subsequent lines for additional instructors (indented names)
          while (j < lines.length) {
            const additionalLine = lines[j].trim();
            
            // If line appears to be a continuation (name-like pattern) and not a new section
            if (additionalLine && 
                !additionalLine.match(/^[A-Z]{2,4}\s+\d{4}/) && // Not a new course
                !additionalLine.match(/^\d{4}\s+(Fall|Spring|Summer)/) && // Not a semester
                !additionalLine.startsWith('Instructor:') && // Not a new instructor line
                !additionalLine.startsWith('Req Designation:') && // Not req designation
                additionalLine.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/)) { // Looks like a name
              instructors.push(additionalLine);
              j++;
            } else {
              break;
            }
          }
          break;
        }
        
        // Stop if we hit another course or section
        if (nextLine.match(/^[A-Z]{2,4}\s+\d{4}/) || 
            nextLine.match(/^\d{4}\s+(Fall|Spring|Summer)/)) {
          break;
        }
        
        j++;
        if (j > i + 5) break; // Don't search too far
      }

      // Use the first instructor if multiple are listed
      instructor = instructors.length > 0 ? instructors[0] : null;
      
      const course = {
        course_code: courseCode,
        course_name: courseName,
        credits_attempted: creditsAttempted,
        credits_earned: creditsEarned,
        grade: grade,
        instructor: instructor
      };
      
      transcript_data.courses.utd_classes[currentSemester].push(course);
      continue;
    }
  }

  return transcript_data;
}


function extractCurrentSemesterCourses(transcriptData) {
  if (!transcriptData?.courses?.utd_classes) {
    return [];
  }

  const utdClasses = transcriptData.courses.utd_classes;
  
  // Sort semesters by year and then by semester (Fall > Summer > Spring)
  const semesters = Object.keys(utdClasses).sort((a, b) => {
    const [yearA, semA] = a.split(' ');
    const [yearB, semB] = b.split(' ');
    
    if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
    
    const semOrder = { 'Fall': 3, 'Summer': 2, 'Spring': 1 };
    return semOrder[semB] - semOrder[semA];
  });

  if (semesters.length === 0) {
    return [];
  }

  // Get the most recent semester
  const mostRecentSemester = semesters[0];
  const courses = utdClasses[mostRecentSemester] || [];

  // Convert to the format expected by the frontend with instructors
  return courses.map(course => {
    const courseCode = course.course_code.replace(' ', '-');
    
    // Extract last name from instructor
    let instructorSuffix = '';
    if (course.instructor) {
      const nameParts = course.instructor.trim().split(/\s+/);
      const lastName = nameParts[nameParts.length - 1];
      instructorSuffix = `-${lastName}`;
    }
    
    return {
      course_id: `${courseCode}${instructorSuffix}`,
      course_name: course.course_name,
      grade: course.grade,
      credits: course.credits_earned
    };
  });
}

module.exports = router;