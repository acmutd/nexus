import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { HiOutlineX } from 'react-icons/hi'
import { IoMdEye, IoMdEyeOff } from 'react-icons/io'
import { getAuth, onAuthStateChanged } from 'firebase/auth' 
import { getFirestore, doc, setDoc } from 'firebase/firestore'
import { getApps, getApp, initializeApp } from 'firebase/app'
import LoadingScreen from './LoadingScreen'
import Button from './Button'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

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
        // If backend returned an enriched object, preserve all useful fields
        if (typeof c === 'object' && c?.course_id) {
          return {
            course_id: String(c.course_id),
            course_name: c.course_name || null,
            credits: typeof c.credits === 'number' ? c.credits : (c.credits ? Number(c.credits) : 0),
            grade: c.grade || 'In Progress',
          };
        }

        // If we got a plain string, try to parse it into a course_id as before
        const s = String(c);
        const m = s.match(/^([A-Za-z]{2,4})\s*-?\s*(\d{4})(?:\s*[- ]\s*([A-Za-z][A-Za-z\-']+))?/);
        if (!m) return { course_id: s.toUpperCase(), course_name: null, credits: 0, grade: 'In Progress' };
        const prefix = m[1].toUpperCase();
        const number = m[2];
        const prof = m[3] ? titleCaseOne(m[3]) : '';
        const code = `${prefix}-${number}`;
        return { course_id: buildCourseId(code, prof), course_name: null, credits: 0, grade: 'In Progress' };
      });

      // Do not persist to Firestore here; let the parent confirm+save on Continue
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
            className="w-[35%] min-w-[300px] p-8 bg-nexus50 rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto items-center justify-center flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex flex-col items-center justify-center mb-4'>
              <img src='assets/loginIcon.svg' className='w-[10%] min-w-[50px]'/>
              <h2 className="mt-4 mb-2 headingText font-titilliumWeb-bold text-nexus900">Login via eLearning</h2>
              <h3 className='flex w-[80%] tinyText text-center font-titilliumWeb-semibold text-nexus700'> Allow Nexus to directly access your courses in eLearning via our Web Scraper. </h3>
            </div>
            <div className="mb-4 p-4 w-full bg-green-100 border border-green-400 rounded text-green-700 text-center">
              <div className="flex items-center gap-2 mb-1 justify-center">
                <span className="text-xl">✓</span>
                <span className="font-semibold text-base">eLearning Parsed Successfully!</span>
              </div>
              <p className="text-sm">Found {parsedCourses.length} course{parsedCourses.length !== 1 ? 's' : ''} from eLearning</p>
            </div>

            <div className="flex flex-col mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Courses Found:</h3>
              <div className="flex flex-wrap gap-2 justify-center mx-auto">
                {parsedCourses.length === 0 ? (
                  <p className="text-gray-500">No courses found</p>
                ) : (
                  parsedCourses.map((course, index) => (
                    <div key={`${course.course_id}-${index}`} className="px-3 py-1 w-fit text-sm bg-blue-100 text-blue-800 rounded-full font-semibold border border-blue-300 flex items-center justify-between gap-2">
                      <span>{course.course_id}</span>
                      <HiOutlineX size={16} className="cursor-pointer text-blue-600 hover:text-red-600 transition duration-200 " onClick={() => setParsedCourses(prev => prev.filter((_, i) => i !== index))} />
                    </div>
                  ))
                )}
              </div>
              {parsedCourses.length > 0 && (
                <p className="text-sm text-gray-500 text-center mt-3">Click the X to remove any courses you don't want to include</p>
              )}
            </div>

            <div className="flex flex-col w-full gap-4">
              <Button
                onClick={() => {
                  // pass autoSave=true so parent can immediately confirm+save
                  if (onSuccess) onSuccess(parsedCourses, { netId, autoSave: true });
                  setParsedSuccess(false);
                  setParsedCourses([]);
                  if (onClose) onClose();
                }}
                disabled={parsedCourses.length === 0}
                text={"Continue"}
              />
              <Button
                onClick={() => {
                  setParsedSuccess(false);
                  setParsedCourses([]);
                  setError('');
                  onClose && onClose();
                }}
                className={"bg-gray-500"}
                text={"Cancel"}
              />
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  if (!isOpen && !embedded) return null;

  if (submitting) {
    return <LoadingScreen message={"Please wait while we fetch your courses from eLearning..."} />
  }

  const innerPanel = (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className={`bg-nexus50 rounded-xl min-w-[300px] ${embedded ? 'p-2 w-[35%] mx-auto' : 'p-6 w-[35%] mx-4'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col justify-center items-center mb-4 relative">
        <img src='assets/loginIcon.svg' className='w-[10%] min-w-[50px]'/>
        <h2 className="mt-4 mb-2 headingText font-titilliumWeb-bold text-nexus900">Login via eLearning</h2>
        <h3 className='flex w-[80%] tinyText text-center font-titilliumWeb-semibold text-nexus700'> Allow Nexus to directly access your courses in eLearning via our Web Scraper. </h3>
        {!submitting && (
          <button onClick={() => onClose && onClose()} className="absolute top-0 right-0 text-gray-500 hover:text-gray-700">
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
              <div className='bg-white p-4 rounded-xl mb-4'>
                <div className="mb-4">
                  <h1 className="tinyText font-titilliumWeb-semibold text-nexus700 mb-2">
                    NetID
                  </h1> 
                  <input
                    type="text"
                    placeholder="Enter NetID"
                    className="font-titilliumWeb-semibold w-full px-4 py-3 border border-gray-300 rounded pr-10 focus:outline-none bg-white text-black placeholder-gray-400"
                    value={netId}
                    onChange={(e) => setNetId(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="mb-4">
                  <h1 className="tinyText font-titilliumWeb-semibold text-nexus700 mb-2">
                    eLearning Password
                  </h1> 
                  <div className="relative flex items-center">
                    <input
                      type={elearnPwVisible ? 'text' : 'password'}
                      placeholder="Enter Password"
                      className="font-titilliumWeb-semibold w-full px-4 py-3 border border-gray-300 rounded pr-10 focus:outline-none bg-white text-black placeholder-gray-400"
                      value={elearnPw}
                      onChange={(e) => setElearnPw(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      aria-label="Toggle password visibility"
                      onClick={() => setElearnPwVisible(!elearnPwVisible)}
                      className="absolute cursor-pointer right-3 flex items-center text-gray-600 hover:text-gray-800 focus:outline-none"
                    >
                      {elearnPwVisible ? <IoMdEye size={20} /> : <IoMdEyeOff size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

              <div className="mb-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  text={`${submitting ? 'Fetching…' : 'Login'}`}
                />
              </div>

              <Button
                 onClick={() => onClose && onClose()}
                 className={'bg-gray-500'}
                 text={"Cancel"}/>
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