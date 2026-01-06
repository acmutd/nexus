import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import SimpleBar from 'simplebar-react'
import { useMediaQuery } from 'react-responsive';
import { HiChevronDown, HiOutlineX, HiUpload } from "react-icons/hi";
import { AnimatePresence, motion } from "motion/react";
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, "").replace(/-/g, "");
const makeCode = (prefix, number) => `${String(prefix || "").toUpperCase()}-${String(number || "").toUpperCase()}`;
const titleCaseOne = (s) =>
  (s || "")
    .trim()
    .toLowerCase()
    .replace(/^[a-z]/, (m) => m.toUpperCase());
const buildCourseId = (code, instructor) =>
  instructor ? `${code}-${titleCaseOne(instructor)}` : code;

function CourseEntry() {
  const isMed = useMediaQuery({ query: '(max-width: 1223px)' });
  const comboboxRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Firebase
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);
  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState('');

  // UI/Form
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isDropDownVisible, setDropDownVisible] = useState(false);
  const [isWarningVisible, setWarningVisible] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Transcript Upload States
  const [uploadingTranscript, setUploadingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState("");
  const [transcriptSuccess, setTranscriptSuccess] = useState(false);

  // Catalog from JSON
  const [codeToProfs, setCodeToProfs] = useState(new Map());

  // Search Parameters
  const [searchParams] = useSearchParams();


  // --- Firebase init or reuse ---
  useEffect(() => {
    let unsub = () => { };
    (async () => {
      try {
        if (getApps().length) {
          const app = getApp();
          const a = getAuth(app);
          const fdb = getFirestore(app);
          setAuth(a);
          setDb(fdb);
          unsub = onAuthStateChanged(a, (u) => { if (!u) navigate('/login'); });
        } else {
          const res = await fetch(`${API_BASE}/api/firebase-config`);
          if (!res.ok) throw new Error(`Config fetch failed: ${res.status} ${res.statusText}`);
          const cfg = await res.json();
          if (!cfg?.apiKey) throw new Error('Config missing required keys.');
          const app = initializeApp(cfg);
          const a = getAuth(app);
          const fdb = getFirestore(app);
          setAuth(a);
          setDb(fdb);
          unsub = onAuthStateChanged(a, (u) => { if (!u) navigate('/login'); });
        }
      } catch (e) {
        console.error('Firebase init error:', e);
        setInitError(String(e?.message || e));
      } finally {
        setInitLoading(false);
      }
    })();

    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    const coursesParam = searchParams.get('courses');
    let importedCourses = [];

    if (coursesParam) {
      try {
        importedCourses = JSON.parse(decodeURIComponent(coursesParam));
      } catch (error) {
        console.error("Error parsing course data:", error);
      }
    }

    if(importedCourses){
      setSelectedCourses(importedCourses); 
    }
  },[searchParams])
  
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch("/all_courses.json");
        const data = await res.json();
        if (!live) return;

        const map = new Map();
        for (const row of data) {
          const code = makeCode(row.course_prefix, row.course_number);
          if (!map.has(code)) map.set(code, new Set());
          if (row.instructors) map.get(code).add(String(row.instructors).trim());
        }
        setCodeToProfs(map);
      } catch (e) {
        console.error("Failed to load all_courses.json", e);
      }
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 100);
    return () => clearTimeout(t);
  }, [search]);

  const suggestions = useMemo(() => {
    const keys = [...codeToProfs.keys()];
    if (!debouncedSearch) {
      return keys
        .sort()
        .slice(0, 30)
        .flatMap(code => {
          const profs = Array.from(codeToProfs.get(code) || []);
          if (profs.length === 0) return [{ code, instructor: undefined, label: code.replace("-", " ") }];
          return profs.slice(0, 3).map(p => ({ code, instructor: p, label: `${code.replace("-", " ")} • ${p}` }));
        });
    }

    const q = norm(debouncedSearch);
    const out = [];
    for (const code of keys) {
      const profs = Array.from(codeToProfs.get(code) || []);
      const codePlain = code.replace("-", " ");
      const matchesCode = norm(codePlain).includes(q) || norm(code).includes(q);

      if (matchesCode) {
        if (profs.length === 0) out.push({ code, instructor: undefined, label: codePlain });
        else for (const p of profs) out.push({ code, instructor: p, label: `${codePlain} • ${p}` });
      } else {
        for (const p of profs) {
          if (norm(p).includes(q)) out.push({ code, instructor: p, label: `${codePlain} • ${p}` });
        }
      }
      if (out.length > 50) break;
    }
    return out.slice(0, 50);
  }, [debouncedSearch, codeToProfs]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target)) {
        setDropDownVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (event) => {
    setSearch(event.target.value);
    if (!isDropDownVisible) setDropDownVisible(true);
  };

  function handleAddCourseFromSuggestion(item) {
    const code = item.code;
    const instructor = item.instructor || "";
    const courseId = buildCourseId(code, instructor);

    if (selectedCourses.some(c => (c.course_id || c) === courseId)) {
      setWarningVisible(true);
      setWarningMessage("You've Already Added " + courseId + "!");
    } else {
      setWarningVisible(false);
      setSelectedCourses(prev => [...prev, { course_id: courseId }]);
    }
    setDropDownVisible(false);
    setHighlightedIndex(-1);
    setSearch('');
  }

  function handleAddCourse(freeText) {
    const s = String(freeText);
    const m = s.match(/^([A-Za-z]{2,4})\s*-?\s*(\d{4})(?:\s*[- ]\s*([A-Za-z][A-Za-z\-']+))?/);
    if (!m) return;
    const code = `${m[1].toUpperCase()}-${m[2]}`;
    const instructor = m[3] ? titleCaseOne(m[3]) : "";
    handleAddCourseFromSuggestion({ code, instructor, label: s });
  }

  const handleKeyPress = (event) => {
    if (!isDropDownVisible && event.key !== "Escape") {
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        setHighlightedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
        break;
      case "ArrowUp":
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
        break;
      case "Enter": {
        const item = suggestions[highlightedIndex];
        if (item) handleAddCourseFromSuggestion(item);
        else if (search) handleAddCourse(search);
        break;
      }
      case "Escape":
        setDropDownVisible(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Handle transcript file upload
  const handleTranscriptUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setTranscriptError('Please upload a PDF file');
      return;
    }

    // Validate file size (0.5MB limit)
    if (file.size > 512 * 1024) {
      setTranscriptError('File size must be less than 0.5MB');
      return;
    }

    setUploadingTranscript(true);
    setTranscriptError('');
    setTranscriptSuccess(false);

    try {
      const user = auth?.currentUser;
      if (!user) {
        throw new Error('You must be logged in to upload a transcript');
      }

      // Get Firebase ID token
      const token = await user.getIdToken();

      // Convert PDF to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64String = reader.result.split(',')[1]; // Remove data URL prefix

          // Send to backend
          const response = await fetch(`${API_BASE}/api/parse-transcript`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              id: user.uid,
              token: token,
              pdf_content: base64String,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to parse transcript');
          }

          // Use the formatted courses from backend (already has instructors!)
          const currentSemesterCourses = data.current_semester_courses;
          
          if (currentSemesterCourses.length === 0) {
            setTranscriptError('No courses found for the current semester');
            return;
          }

          // Add courses to selected courses
          setSelectedCourses(currentSemesterCourses);
          setTranscriptSuccess(true);
          setWarningVisible(false);
          
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }

        } catch (error) {
          console.error('Error parsing transcript:', error);
          setTranscriptError(error.message || 'Failed to parse transcript');
        } finally {
          setUploadingTranscript(false);
        }
      };

      reader.onerror = () => {
        setTranscriptError('Failed to read file');
        setUploadingTranscript(false);
      };

      reader.readAsDataURL(file);

    } catch (error) {
      console.error('Error uploading transcript:', error);
      setTranscriptError(error.message || 'Failed to upload transcript');
      setUploadingTranscript(false);
    }
  };

  // Extract the most recent semester's courses
  const extractCurrentSemesterCourses = (transcriptData) => {
    if (!transcriptData?.courses?.utd_classes) {
      return [];
    }

    const utdClasses = transcriptData.courses.utd_classes;
    const semesters = Object.keys(utdClasses).sort((a, b) => {
      // Sort by year and semester (Fall > Summer > Spring)
      const [yearA, semA] = a.split(' ');
      const [yearB, semB] = b.split(' ');
      
      if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
      
      const semOrder = { 'Fall': 3, 'Summer': 2, 'Spring': 1 };
      return semOrder[semB] - semOrder[semA];
    });

    if (semesters.length === 0) return [];

    // Get the most recent semester
    const mostRecentSemester = semesters[0];
    const courses = utdClasses[mostRecentSemester] || [];

    // Convert to the format expected by the app
    return courses.map(course => ({
      course_id: course.course_code.replace(' ', '-'),
      course_name: course.course_name,
      grade: course.grade,
      credits: course.credits_earned
    }));
  };

  // Save to Firestore and navigate
  const handleSaveAll = async () => {
    setError('');
    if (!auth || !db) {
      setError('App not initialized.');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setError('Your session expired. Please log in again.');
      return;
    }

    if (selectedCourses.length === 0) {
      setError('Please add at least one course before continuing.');
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          email: user.email || null,
          courses: selectedCourses,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );
      navigate('/home');
    } catch (e) {
      console.error('Save courses error:', e);
      setError('Failed to save courses. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (initLoading) {
    return (
      <div className="bg-gradient-to-b from-nexus900 to-nexus700 min-h-screen flex items-center justify-center">
        <div className="text-white/80">Loading…</div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="bg-gradient-to-b from-nexus900 to-nexus700 min-h-screen flex items-center justify-center">
        <div className="bg-white/90 rounded-lg p-6 text-red-700 w-[480px]">
          <div className="font-semibold mb-2">Initialization failed</div>
          <div className="text-sm whitespace-pre-wrap">{initError}</div>
          <div className="mt-4">
            <Link to="/login" className="text-nexus600 underline">Return to login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="min-h-screen flex flex-col items-center justify-center bg-blue-950 bg-cover bg-center"
        style={{ backgroundImage: isMed ? "url('/assets/AccessRequestBGLong.svg')" : "url('/assets/AccessRequestBG.svg')" }}>
        <SimpleBar className={` relative flex-1 max-h-130 w-2/5 bg-gradient-to-b from-nexus100 from-10% via-nexus50 to-nexus100 to-90% rounded-xl mt-16 p-6`}
          style={{ border: '1px solid #ccc', zIndex: 1 }}>
          <div className="items-center justify-center flex flex-row">
            <img src="/assets/Logo.svg" style={{ scale: isMed ? .6 : 1, margin: isMed ? -12 : 24 }} />
            <img src="/assets/UTDLogo.svg" style={{ scale: isMed ? .6 : 1, margin: isMed ? -12 : 24 }} />
          </div>
          <div className="relative flex items-center justify-center text-center flex-col">
            <h1 className="font-titilliumWeb-semibold text-nexus900 text-2xl pb-2">
              Enter All Your Courses for the Semester Here
            </h1>
            <p className="font-titilliumWeb-regular text-nexus700 text-sm pb-4">
              Upload your transcript or manually add courses below
            </p>

            <div className="w-full mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleTranscriptUpload}
                className="hidden"
                id="transcript-upload"
              />
              <label
                htmlFor="transcript-upload"
                className={`flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg border-2 border-dashed 
                           cursor-pointer transition-all duration-200
                           ${uploadingTranscript 
                             ? 'bg-gray-100 border-gray-400 cursor-not-allowed' 
                             : 'bg-white border-nexus400 hover:border-nexus600 hover:bg-nexus50'
                           }`}
              >
                <HiUpload size={24} className={uploadingTranscript ? 'text-gray-400' : 'text-nexus600'} />
                <span className={`font-titilliumWeb-semibold ${uploadingTranscript ? 'text-gray-400' : 'text-nexus700'}`}>
                  {uploadingTranscript ? 'Processing Transcript...' : 'Upload Unofficial Transcript (PDF)'}
                </span>
              </label>

              {transcriptSuccess && (
                <div className="mt-2 p-2 bg-green-100 border border-green-400 rounded text-green-700 text-sm">
                  ✓ Transcript parsed successfully! Courses have been added below.
                </div>
              )}
              {transcriptError && (
                <div className="mt-2 p-2 bg-red-100 border border-red-400 rounded text-red-700 text-sm">
                  {transcriptError}
                </div>
              )}
            </div>


            {isWarningVisible && (
              <h2 className="text-red-600 text-md font-titilliumWeb-regular pb-2">
                {warningMessage}
              </h2>
            )}
            {error && (
              <h2 className="text-red-600 text-md font-titilliumWeb-regular pb-2">
                {error}
              </h2>
            )}

            
          </div>

          <div className="bg-gray-400 mt-5 h-[1px] w-full" />

          <div className="flex flex-col rounded-xl items-center text-center justify-center w-full" style={{ marginTop: 16 }}>
            <h1 className="font-titilliumWeb-semibold text-nexus900 text-xl ">
              Selected Courses
            </h1>
            <div className="flex flex-wrap w-full items-center justify-center">
              {selectedCourses.length === 0 ? (
                <h2 className="font-titilliumWeb-regular text-gray-500 text-lg">Nothing Here, Add Some Courses!</h2>
              ) : null}

              {selectedCourses.map((c, index) => (
                <div key={`${c.course_id}-${index}`} className="py-2 pr-2 flex flex-wrap">
                  <ul className="flex flex-row rounded-full w-auto h-auto bg-nexus300 px-5 max-w-[260px] min-w-[120px] text-lg font-titilliumWeb-regular 
                                   transition duration-200 hover:scale-105 hover:bg-red-400">
                    {c.course_id}
                    <HiOutlineX
                      size={20}
                      color={'#364153'}
                      className="mt-1 ml-2 cursor-pointer"
                      onClick={() => setSelectedCourses(prev => prev.filter((_, i) => i !== index))}
                    />
                  </ul>
                </div>
              ))}
            </div>
          </div>


          <div className="flex flex-row justify-center items-center">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAll}
              className={`text-white bg-nexus500 py-3 text-xl font-titilliumWeb-bold rounded-lg mt-8 flex flex-row 
                          transition duration-300 drop-shadow-black items-center justify-center
                          ${saving ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105'}`}
              style={{ width: isMed ? '45%' : '33.3333%' }}
            >
              {saving ? 'Saving…' : 'All Done!'}
            </button>
          </div>
        </SimpleBar>
      </div>
    </div>
  );
}

export default CourseEntry;