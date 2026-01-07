import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { HiOutlineX } from 'react-icons/hi'
import { IoMdEye, IoMdEyeOff } from 'react-icons/io'
import { getAuth, onAuthStateChanged } from 'firebase/auth' 
import { getFirestore, doc, setDoc } from 'firebase/firestore'
import { getApps, getApp, initializeApp } from 'firebase/app'
import LoadingScreen from './LoadingScreen'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

const titleCaseOne = (s) =>
  (s || '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z]/, (m) => m.toUpperCase());

const buildCourseId = (code, instructor) =>
  instructor ? `${code}-${titleCaseOne(instructor)}` : code;

export default function LoginWithNetIDModal({ isOpen, onClose, onSuccess, embedded = false, maxWidthClass = '' }) {
  const [auth, setAuth] = useState(null);
  const dbRef = useRef(null);

  // allow parent to control max width via Tailwind max-w-* class
  const embeddedMax = maxWidthClass || 'max-w-md';
  const modalMax = maxWidthClass || 'max-w-xl';

  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState('');
  const [netId, setNetId] = useState('');
  const [elearnPw, setElearnPw] = useState('');
  const [elearnPwVisible, setElearnPwVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [parsedCourses, setParsedCourses] = useState([]);
  const [parsedSuccess, setParsedSuccess] = useState(false);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        let app;
        if (getApps().length) {
          app = getApp();
        } else {
          const res = await fetch(`${API_BASE}/api/firebase-config`);
          if (!res.ok) throw new Error(`Config fetch failed: ${res.status} ${res.statusText}`);
          const cfg = await res.json();
          app = initializeApp(cfg);
        }
        
        const a = getAuth(app);
        const db = getFirestore(app);
        setAuth(a);
        dbRef.current = db;
        unsub = onAuthStateChanged(a, () => {});
      } catch (e) {
        console.error('Firebase init error:', e);
        setInitError(String(e?.message || e));
      } finally {
        setInitLoading(false);
      }
    })();

    return () => unsub();
  }, []);

  const onSubmit = async (e) => {
    e && e.preventDefault();
    setError('');

    if (!auth || !dbRef.current) {
      setError('App not initialized.');
      return;
    }
    if (!netId || !elearnPw) {
      setError('Please enter your NetID and eLearning password.');
      return;
    }

    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Your session expired. Please log in again.');
        setSubmitting(false);
        return;
      }

      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/scraper/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ netid: netId, password: elearnPw }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }

      // If the scraper returns an error status and display error message
      if (!res.ok) {
        const serverMsg = (data && (data.error || data.message)) || `Request failed: ${res.status}`;
        // If upstream returned HTML (e.g., an internal server error page), show a friendly message
        if (/<\s*(!doctype|html)/i.test(serverMsg) || (typeof serverMsg === 'string' && serverMsg.trim().startsWith('<'))) {
          console.error('Upstream scraper returned non-JSON error:', serverMsg);
          setError('Scraper service error — please try again later.');
          setSubmitting(false);
          return;
        }
        // Specifically handle the invalid credentials case returned by the scraper
        if (res.status === 500 && /invalid username|invalid password|login failed/i.test(serverMsg)) {
          setError('E-Learning login failed: Invalid NetID or password.');
          setSubmitting(false);
          return;
        }

        setError(serverMsg);
        setSubmitting(false);
        return;
      }

      if (data?.status !== 'success') {
        setError(data?.error || 'Failed to fetch course data. Please try again or skip.');
        setSubmitting(false);
        return;
      }

      const raw = data.courses || [];
      const courses = raw.map((c) => {
        if (typeof c === 'object' && c?.course_id) {
          return { course_id: String(c.course_id).toUpperCase() };
        }
        const s = String(c);
        const m = s.match(/^([A-Za-z]{2,4})\s*-?\s*(\d{4})(?:\s*[- ]\s*([A-Za-z][A-Za-z\-']+))?/);
        if (!m) return { course_id: s.toUpperCase() };
        const prefix = m[1].toUpperCase();
        const number = m[2];
        const prof = m[3] ? titleCaseOne(m[3]) : '';
        const code = `${prefix}-${number}`;
        return { course_id: buildCourseId(code, prof) };
      });

      const userDocRef = doc(dbRef.current, 'users', user.uid);
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          email: user.email || null,
          netId,
          courses,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );

      setParsedCourses(courses);
      setParsedSuccess(true);
    } catch (e) {
      console.error('Scraper error:', e);
      setError('Failed to fetch course data. Please try again or skip.');
    } finally {
      setSubmitting(false);
    }
  };

  // Show the success screen as an independent modal so its size is unaffected by embedded parents
  if (parsedSuccess) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          // don't close on outside click; user should explicitly continue or cancel
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="mx-auto w-full max-w-2xl p-8 bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded text-green-700 text-center">
              <div className="flex items-center gap-2 mb-1 justify-center">
                <span className="text-xl">✓</span>
                <span className="font-semibold text-base">eLearning Parsed Successfully!</span>
              </div>
              <p className="text-sm">Found {parsedCourses.length} course{parsedCourses.length !== 1 ? 's' : ''} from eLearning</p>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Courses Found:</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 justify-center max-w-sm mx-auto">
                {parsedCourses.length === 0 ? (
                  <p className="text-gray-500">No courses found</p>
                ) : (
                  parsedCourses.map((course, index) => (
                    <div key={`${course.course_id}-${index}`} className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full font-semibold border border-blue-300 flex items-center gap-2">
                      <span>{course.course_id}</span>
                      <HiOutlineX size={16} className="cursor-pointer text-blue-600 hover:text-red-600 transition duration-200" onClick={() => setParsedCourses(prev => prev.filter((_, i) => i !== index))} />
                    </div>
                  ))
                )}
              </div>
              {parsedCourses.length > 0 && (
                <p className="text-sm text-gray-500 text-center mt-3">Click the X to remove any courses you don't want to include</p>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  if (onSuccess) onSuccess(parsedCourses);
                  setParsedSuccess(false);
                  setParsedCourses([]);
                  if (onClose) onClose();
                }}
                disabled={parsedCourses.length === 0}
                className={`flex-1 py-3 px-6 font-bold rounded-lg transition duration-200
                  ${parsedCourses.length === 0 ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                Continue to Home {parsedCourses.length > 0 && `(${parsedCourses.length})`}
              </button>

              <button
                onClick={() => {
                  setParsedSuccess(false);
                  setParsedCourses([]);
                  setError('');
                }}
                className="py-3 px-6 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition duration-200"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  if (!isOpen && !embedded) return null;

  if (submitting) {
    return <LoadingScreen message={"Please wait while we fetch your courses from eLearning"} />
  }

  const innerPanel = (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className={`bg-white rounded-xl w-full ${embedded ? 'p-2 w-full mx-auto' : 'p-6 max-w-xl mx-4'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Login with eLearning Credentials</h2>
        {!submitting && (
          <button onClick={() => onClose && onClose()} className="text-gray-500 hover:text-gray-700">
            <HiOutlineX size={22} />
          </button>
        )}
      </div>

      {initLoading ? (
        <div className="min-h-[150px] flex items-center justify-center text-gray-500">Loading…</div>
      ) : initError ? (
        <div className="min-h-[150px] p-4 bg-red-50 text-red-700 rounded">{initError}</div>
      ) : (
        <>
          {!parsedSuccess ? (
            <form onSubmit={onSubmit}>
              <div className="mb-4">
                <label className="block text-left text-blue-700 mb-2 font-semibold">NetID</label>
                <input
                  type="text"
                  placeholder="Enter NetID"
                  className="w-full bg-white px-4 py-2 border placeholder-gray-400 rounded-md focus:outline-none"
                  value={netId}
                  onChange={(e) => setNetId(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-left text-blue-700 mb-2 font-semibold">eLearning Password</label>
                <div className="relative flex items-center">
                  <input
                    type={elearnPwVisible ? 'text' : 'password'}
                    placeholder="Enter Password"
                    className="w-full bg-white px-4 py-2 border placeholder-gray-400 rounded-md focus:outline-none pr-12"
                    value={elearnPw}
                    onChange={(e) => setElearnPw(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setElearnPwVisible(!elearnPwVisible)}
                    className="absolute right-3 flex items-center text-gray-600 hover:text-gray-800 focus:outline-none"
                  >
                    {elearnPwVisible ? <IoMdEye size={20} /> : <IoMdEyeOff size={20} />}
                  </button>
                </div>
              </div>

              {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

              <div className="mb-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full rounded-md py-2 px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                    ${submitting ? 'bg-blue-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {submitting ? 'Fetching…' : 'Login'}
                </button>
              </div>

              <div className="text-center text-sm text-gray-700 font-bold">
                <button type="button" onClick={() => onClose && onClose()} className="font-bold text-blue-700 hover:underline">Cancel</button>
              </div>
            </form>
          ) : null}
        </>
      )}
    </motion.div>
  )

  if (embedded) return innerPanel

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        onClick={() => !submitting && onClose && onClose()}
      >
        {innerPanel}
      </motion.div>
    </AnimatePresence>
  )
}