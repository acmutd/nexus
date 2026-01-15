// backend/routes/scraperRoutes.js
const express = require('express');
const admin = require('firebase-admin');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Set PARSE_SEMESTER to semester wanting to parse (ex, '2024 Fall', '2025 Spring, 2025 Fall, 2025 Spring', etc).
const PARSE_SEMESTER = '2025 Spring';

/**
 * Expected file(s) ex:
 *   backend/data/classes_25f.json
 *   backend/data/classes_26s.json
 * etc
 */
const coursebookCache = {
  // term -> { byCourseKey: Map<string, Set<string>> }
  terms: new Map()
};

function safeReadJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function loadCoursebookTerm(term) {
  if (coursebookCache.terms.has(term)) return coursebookCache.terms.get(term);

  const filePath = path.join(__dirname, '..', 'data', `classes_${term}.json`);
  if (!fs.existsSync(filePath)) {
    // Cache an empty structure so we don't keep hitting disk
    const empty = { byCourseKey: new Map() };
    coursebookCache.terms.set(term, empty);
    return empty;
  }

  let rows = [];
  try {
    rows = safeReadJson(filePath);
    if (!Array.isArray(rows)) rows = [];
  } catch (e) {
    console.error(`Failed to parse coursebook file for term=${term}:`, e);
    rows = [];
  }

  // Build: key = `${term}|${prefix}|${number}` -> Set(professor full names)
  const byCourseKey = new Map();
  const activityByCourseKey = new Map();

  for (const r of rows) {
    const t = String(r.term || '').trim().toLowerCase();
    const prefix = String(r.course_prefix || '').trim().toLowerCase();
    const num = String(r.course_number || '').trim();
    const prof = String(r.instructors || '').trim();
    const activity = String(r.activity_type || '').trim();

    // Require term/prefix/number; professor/activity are optional
    if (!t || !prefix || !num) continue;
    if (t !== term.toLowerCase()) continue;

    const key = `${t}|${prefix}|${num}`;

    if (prof) {
      if (!byCourseKey.has(key)) byCourseKey.set(key, new Set());
      byCourseKey.get(key).add(prof);
    }

    if (activity) {
      if (!activityByCourseKey.has(key)) activityByCourseKey.set(key, new Set());
      activityByCourseKey.get(key).add(activity);
    }
  }

  const payload = { byCourseKey, activityByCourseKey };
  coursebookCache.terms.set(term, payload);
  return payload;
}

function semesterToTermCode(semesterStr) {
  // "2025 Fall" -> "25f"
  if (!semesterStr) return null;
  const m = String(semesterStr).trim().match(/^(\d{4})\s+(Fall|Spring|Summer)$/i);
  if (!m) return null;

  const yy = m[1].slice(2);
  const sem = m[2].toLowerCase();
  const letter = sem === 'fall' ? 'f' : sem === 'spring' ? 's' : 'u';
  return `${yy}${letter}`;
}

// Compare semester strings like "2025 Fall" for descending order (newest first)
function compareSemestersDesc(a, b) {
  const [yearA, semA] = a.split(' ');
  const [yearB, semB] = b.split(' ');
  if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
  const semOrder = { Fall: 3, Summer: 2, Spring: 1 };
  return semOrder[semB] - semOrder[semA];
}

function normalizeSpaces(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function getNameParts(name) {
  const clean = normalizeSpaces(name);
  if (!clean) return { first: '', last: '', firstInitial: '', lastLower: '' };
  const parts = clean.split(' ');
  const first = parts[0] || '';
  const last = parts[parts.length - 1] || '';
  return {
    first,
    last,
    firstInitial: first ? first[0].toLowerCase() : '',
    lastLower: last.toLowerCase()
  };
}

function isSamePerson(transcriptName, coursebookName) {
  // Strict enough to avoid mismatches, loose enough to handle middle names.
  const a = getNameParts(transcriptName);
  const b = getNameParts(coursebookName);

  if (!a.lastLower || !b.lastLower) return false;
  if (a.lastLower !== b.lastLower) return false;

  // If either lacks first initial, accept last-name match (rare)
  if (!a.firstInitial || !b.firstInitial) return true;

  return a.firstInitial === b.firstInitial;
}

/*
 * Implementation:
 * - Look up all coursebook professors for (term, prefix, number)
 * - Iterate transcript instructor list in order
 * - Return the first that matches a coursebook professor (by name match)
 * - Otherwise return the last transcript instructor
 */
function choosePrimaryInstructor({ term, prefix, number, transcriptInstructors, shouldLog = true }) {
  if (!Array.isArray(transcriptInstructors) || transcriptInstructors.length === 0) return null;

  if (shouldLog) {
    const meta = {};
    if (term) meta.term = term;
    if (prefix) meta.prefix = prefix;
    if (number) meta.number = number;
    if (Array.isArray(transcriptInstructors) && transcriptInstructors.length) meta.transcriptInstructors = transcriptInstructors;
    console.log('choosePrimaryInstructor called with', meta);
  }

  // If transcript provided only one instructor, return it directly (skip coursebook matching)
  if (Array.isArray(transcriptInstructors) && transcriptInstructors.length === 1) {
    const single = String(transcriptInstructors[0] || '').trim();
    if (shouldLog) console.log(`choosePrimaryInstructor: single transcript instructor provided, returning "${single}" (skipping coursebook matching)`);
    return single || null;
  }

  const t = (term || '').toLowerCase();
  const p = (prefix || '').toLowerCase();
  const n = String(number || '').trim();

  if (!t || !p || !n) {
    return transcriptInstructors[transcriptInstructors.length - 1] || null;
  }

  const { byCourseKey } = loadCoursebookTerm(t);
  const key = `${t}|${p}|${n}`;
  const profSet = byCourseKey.get(key);
  const profsRaw = profSet ? Array.from(profSet) : null;
  if (shouldLog) {
    if (profsRaw && profsRaw.length) {
      console.log('coursebook profs for', key, profsRaw);
    } else {
      console.log('coursebook profs for', key, 'none');
    }
  }

  if (!profSet || profSet.size === 0) {
    // No coursebook info -> fallback
    return transcriptInstructors[transcriptInstructors.length - 1] || null;
  }

  // Expand entries that contain multiple names (e.g., "Ignacio Pujana , William Griffin")
  const profs = [];
  for (const p of profsRaw) {
    const parts = String(p).split(/[,&;]/).map(s => s.trim()).filter(Boolean);
    for (const part of parts) profs.push(part);
  }
  if (shouldLog) console.log('expanded profs for', key, profs);

  for (let ci = 0; ci < transcriptInstructors.length; ci++) {
    const candidate = transcriptInstructors[ci];
    for (let pi = 0; pi < profs.length; pi++) {
      const prof = profs[pi];
      const same = isSamePerson(candidate, prof);
      if (shouldLog) console.log(`comparing candidate[${ci}]="${candidate}" with prof[${pi}]="${prof}" -> ${same}`);
      if (same) {
        if (shouldLog) console.log('match candidate', candidate, 'to coursebook prof', prof);
        return candidate;
      }
    }
  }

  return transcriptInstructors[transcriptInstructors.length - 1] || null;
}

// Returns true iff the course (term/prefix/number) has at least one section whose
// activity_type is an allowed lecture-like type. If no coursebook data is found
// for the course, this returns false (conservative: exclude unknown activity types).
function courseHasAllowedActivity({ term, prefix, number }) {
  if (!term || !prefix || !number) return false;
  const { activityByCourseKey } = loadCoursebookTerm(term) || {};
  if (!activityByCourseKey) return false;
  const key = `${String(term).toLowerCase()}|${String(prefix).toLowerCase()}|${String(number).trim()}`;
  const set = activityByCourseKey.get(key);
  if (!set || set.size === 0) return false;

  for (const act of set) {
    const a = String(act || '').trim().toLowerCase();
    if (a === 'lecture' || a === 'combined lec/lab no fee') return true;
  }

  return false;
}

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

    // If the client requested immediate save (save=true), write to Firestore now.
    const shouldSave = req.body.save === true || req.body.save === 'true';

    if (shouldSave) {
      try {
        const userRef = admin.firestore().collection('users').doc(id);

        await userRef.set(
          {
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
    }

    // Return parsed data (client can choose to call /confirm-transcript to save later)
    return res.status(200).json({
      success: true,
      message: 'Transcript parsed successfully',
      transcript_data: transcriptData,
      current_semester_courses: currentSemesterCourses,
      saved: shouldSave
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

  // Only parse courses for this target semester (change via PARSE_SEMESTER env var)
  const targetSemester = PARSE_SEMESTER || null; // e.g. '2025 Fall'
  let collecting = targetSemester ? false : true;
  let parsedTarget = false;

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
        if (targetSemester) {
          if (currentSemester === targetSemester) {
            transcript_data.courses.utd_classes[currentSemester] = [];
            collecting = true;
            parsedTarget = true;
          } else {
            // Not the target semester: stop collecting. If we've already parsed the target, we can stop parsing entirely.
            collecting = false;
            if (parsedTarget) break;
          }
        } else {
          transcript_data.courses.utd_classes[currentSemester] = [];
          collecting = true;
        }
      }
      continue;
    }

    // Match course line
    const courseMatch = line.match(/^([A-Z]{2,4})\s+(\d[A-Z\d]{3})(.+?)([\d\.]+)([\d\.]+)(?:([\d\.]+))?$/);
    if (courseMatch && currentSection === 'utd_classes' && currentSemester) {
      const prefix = courseMatch[1];
      const number = courseMatch[2];

      const courseCode = `${prefix} ${number}`;
      const courseName = courseMatch[3].trim();
      const creditsAttempted = parseFloat(courseMatch[4]);
      const creditsEarned = parseFloat(courseMatch[5]);

      const grade = 'In Progress';

      // Scan following lines for instructor(s)
      let j = i + 1;
      const instructors = [];

      while (j < lines.length) {
        const nextLine = lines[j].trim();

        const instructorMatch = nextLine.match(/^Instructor:\s*(.+)$/);
        if (instructorMatch) {
          const initial = instructorMatch[1].trim();
          const initialParts = initial.split(/[,&;]/).map(s => s.trim()).filter(Boolean);
          for (const p of initialParts) instructors.push(p);
          j++;

          while (j < lines.length) {
            const additionalLine = lines[j].trim();

            if (
              additionalLine &&
              !additionalLine.match(/^[A-Z]{2,4}\s+\d{4}/) &&
              !additionalLine.match(/^[A-Z]{2,4}\s+\d[A-Z\d]{3}/) &&
              !additionalLine.match(/^\d{4}\s+(Fall|Spring|Summer)/) &&
              !additionalLine.startsWith('Instructor:') &&
              !additionalLine.startsWith('Req Designation:') &&
              !additionalLine.startsWith('Course Topic:') &&
              additionalLine.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/)
            ) {
              const parts = additionalLine.split(/[,&;]/).map(s => s.trim()).filter(Boolean);
              for (const p of parts) instructors.push(p);
              j++;
            } else {
              break;
            }
          }
          break;
        }

        if (nextLine.match(/^[A-Z]{2,4}\s+\d[A-Z\d]{3}/) || nextLine.match(/^\d{4}\s+(Fall|Spring|Summer)/)) {
          break;
        }

        j++;
        if (j > i + 5) break;
      }

      // Only process courses when we're collecting (target semester) and in utd_classes
      if (collecting && currentSection === 'utd_classes') {
        const term = semesterToTermCode(currentSemester); // e.g., 25f

        // Exclude non-lecture classes (only allow Lecture or Combined Lec/Lab no Fee)
        if (!courseHasAllowedActivity({ term, prefix, number })) {
          if (collecting) console.log(`Skipping ${prefix} ${number} - activity_type not allowed or missing`);
          continue;
        }

        const chosenInstructor =
          choosePrimaryInstructor({
            term,
            prefix,
            number,
            transcriptInstructors: instructors,
            shouldLog: collecting
          }) || null;

        const course = {
          course_code: courseCode,
          course_name: courseName,
          credits_attempted: creditsAttempted,
          credits_earned: creditsEarned,
          grade,
          instructor: chosenInstructor,
          transcript_instructors: instructors
        };

        transcript_data.courses.utd_classes[currentSemester].push(course);
      }

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

  const semesters = Object.keys(utdClasses).sort(compareSemestersDesc);

  if (semesters.length === 0) {
    return [];
  }

  const mostRecentSemester = semesters[0];
  const courses = utdClasses[mostRecentSemester] || [];

  return courses.map(course => {
    const courseCode = course.course_code.replace(' ', '-');

    let instructorSuffix = '';
    if (course.instructor) {
      const nameParts = normalizeSpaces(course.instructor).split(' ');
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


// Endpoint to save previously-parsed courses (call this when user clicks "Continue")
router.post('/confirm-transcript', async (req, res) => {
  try {
    const { id, token, courses, meta } = req.body;

    if (!id || !token || !Array.isArray(courses)) {
      return res.status(400).json({ success: false, error: 'Missing required fields: id, token, or courses' });
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(403).json({ success: false, error: 'Invalid or expired authentication token' });
    }

    if (decodedToken.uid !== id) {
      return res.status(403).json({ success: false, error: 'Token does not match user ID' });
    }

    try {
      const userRef = admin.firestore().collection('users').doc(id);
      const payload = {
        lastTranscriptUpload: new Date().toISOString(),
        courses
      };
      // allow optional meta: { netId }
      if (meta && typeof meta === 'object') {
        if (meta.netId) payload.netId = meta.netId;
      }

      await userRef.set(payload, { merge: true });
    } catch (firestoreError) {
      console.error('Error saving to Firestore:', firestoreError);
      return res.status(500).json({ success: false, error: 'Failed to save transcript data' });
    }

    return res.status(200).json({ success: true, message: 'Transcript saved' });
  } catch (error) {
    console.error('Error in /api/confirm-transcript:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;