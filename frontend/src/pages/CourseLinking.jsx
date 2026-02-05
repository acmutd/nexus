import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import { HiUpload, HiOutlineX } from 'react-icons/hi';
import { AnimatePresence } from 'motion/react';
import { getAuth } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import AccessRequestModal from '../components/AccessRequestModal';
import TranscriptModal from '../components/TranscriptModal';
import LoginWithNetIDModal from '../components/LoginWithNetIDModal';
import Button from '../components/Button';
import { useAuth } from '../context/authContext';
import { initFirebase } from '../firebase';
import { motion } from 'motion/react';
import FloatingClouds from '../components/FloatingClouds';
import { useMobile } from '../context/mobileContext';

export default function CourseLinking() {
  const {isMobile} = useMobile()

  const navigate = useNavigate();
  const location = useLocation();
  const isRedoFlow = Boolean(location.state?.skipAccountLinking || location.state?.forceCourseRelink);
  const fileInputRef = useRef(null);
  const { refreshOnboarding, onboarding, loading: authLoading } = useAuth();
  const popupRef = useRef(null);
  const [popupVisible, setPopupVisible] = useState(false);

  const shadowAccentColor = 'bg-gray-400';

  // Transcript Upload States
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [uploadingTranscript, setUploadingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState('');
  const [transcriptSuccess, setTranscriptSuccess] = useState(false);
  const [savingTranscript, setSavingTranscript] = useState(false);
  const [parsedCourses, setParsedCourses] = useState([]);
  const [parsedMeta, setParsedMeta] = useState(null);

  // Access Request Modal state
  const [showAccessRequestModal, setShowAccessRequestModal] = useState(false);
  // Login via NetID modal state
  const [showLoginNetIDModal, setShowLoginNetIDModal] = useState(false);

  // Check if user is in pre-Firestore onboarding flow
  const [isPreFirestoreOnboarding, setIsPreFirestoreOnboarding] = useState(false);

  useEffect(() => {
    const pendingOnboarding = sessionStorage.getItem('pendingOnboarding');
    setIsPreFirestoreOnboarding(!!pendingOnboarding);
  }, []);

  // Open modal automatically if we were redirected from the old accessrequest page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('from') === 'accessrequest') setShowAccessRequestModal(true);
  }, []);

  // If onboarding already has courses and we weren't explicitly asked to relink, bounce to /home immediately.
  useEffect(() => {
    if (authLoading || !onboarding?.loaded) return;
    if (onboarding.hasCourses && !location.state?.forceCourseRelink && !isPreFirestoreOnboarding) {
      navigate('/home', { replace: true });
    }
  }, [authLoading, onboarding, location.state, navigate, isPreFirestoreOnboarding]);

  // Entry animation similar to login/signup popup (skip if we're going to redirect)
  useEffect(() => {
    if (onboarding?.hasCourses && !location.state?.forceCourseRelink && !isPreFirestoreOnboarding) return;
    setPopupVisible(false);
    const t = setTimeout(() => {
      if (popupRef.current) popupRef.current.offsetHeight;
      setPopupVisible(true);
    }, 60);
    return () => clearTimeout(t);
  }, [location.pathname, location.key, onboarding?.hasCourses, location.state, isPreFirestoreOnboarding]);

  // Handle removing courses
  const handleRemoveCourse = (indexToRemove) => {
    setParsedCourses(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // Handle Transcript Upload
  const handleTranscriptUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setTranscriptError('Please upload a PDF file');
      return;
    }

    if (file.size > 512 * 1024) {
      setTranscriptError('PDF file size must be less than 0.5MB');
      return;
    }

    setUploadingTranscript(true);
    setTranscriptError('');
    setTranscriptSuccess(false);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        setTranscriptError('Please log in first');
        setUploadingTranscript(false);
        return;
      }

      const token = await user.getIdToken();
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = async () => {
        try {
          const base64Data = reader.result.split(',')[1];

          const response = await fetch(`/api/parse-transcript`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: user.uid,
              token: token,
              pdf_content: base64Data,
            }),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to parse transcript');
          }

          setTranscriptSuccess(true);
          setParsedCourses(data.current_semester_courses || []);

        } catch (error) {
          console.error('Transcript upload error:', error);
          setTranscriptError(error.message || 'Failed to process transcript');
        } finally {
          setUploadingTranscript(false);
        }
      };

      reader.onerror = () => {
        setTranscriptError('Failed to read PDF file');
        setUploadingTranscript(false);
      };

    } catch (error) {
      console.error('Upload error:', error);
      setTranscriptError(error.message || 'An error occurred during upload');
      setUploadingTranscript(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const handleConfirmAndContinue = async (coursesArg = null, metaArg = null) => {
    setSavingTranscript(true);
    setTranscriptError('');

    const coursesToSave = Array.isArray(coursesArg) ? coursesArg : parsedCourses;
    const metaToSave = {
      ...(metaArg || parsedMeta || {}),
      ...(isRedoFlow ? { skipAccountLinking: true } : {})
    };

    try {
      console.log('[CourseLinking] handleConfirmAndContinue start', {
        coursesCount: coursesToSave?.length || 0,
        meta: metaToSave,
        isPreFirestoreOnboarding,
      });
      
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        setTranscriptError('Please log in first');
        setSavingTranscript(false);
        return;
      }

      // Check if this is the initial onboarding flow (before Firestore document exists)
      const pendingOnboarding = sessionStorage.getItem('pendingOnboarding');
      
      if (pendingOnboarding) {
        console.log('[CourseLinking] Storing courses in sessionStorage for later');
        const onboardingData = JSON.parse(pendingOnboarding);
        onboardingData.courses = coursesToSave;
        onboardingData.meta = metaToSave;
        sessionStorage.setItem('pendingOnboarding', JSON.stringify(onboardingData));
        
        console.log('[CourseLinking] navigating to /accountlinking');
        navigate('/accountlinking');
      } else {
        const token = await user.getIdToken();

        const response = await fetch(`/api/confirm-transcript`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.uid, token, courses: coursesToSave, meta: metaToSave })
        });

        const data = await response.json();
        console.log('[CourseLinking] confirm-transcript response', { ok: response.ok, status: response.status, data });
        if (!response.ok || !data.success) throw new Error(data.error || 'Failed to save transcript');

        // Refresh onboarding state
        let onboardingResult = null;
        try {
          let onboarding = await refreshOnboarding(user);
          onboardingResult = onboarding;
          console.log('[CourseLinking] onboarding after save', onboarding);
          const maxAttempts = 6;
          for (let i = 0; i < maxAttempts && onboarding && !onboarding.hasCourses; i++) {
            await new Promise((r) => setTimeout(r, 500));
            onboarding = await refreshOnboarding(user);
            onboardingResult = onboarding;
            console.log(`[CourseLinking] onboarding poll ${i + 1}`, onboarding);
          }
          if (!onboarding || !onboarding.hasCourses) {
            console.warn('[CourseLinking] onboarding still reports no courses after polling; proceeding anyway');
          }
        } catch (e) {
          console.warn('refreshOnboarding failed after transcript save', e);
        }

        // For redo flow, mark account linking as skipped
        if (isRedoFlow) {
          try {
            const { db } = await initFirebase();
            await setDoc(
              doc(db, 'users', user.uid),
              {
                accountLinkingSkipped: true,
                accountLinkingSkippedAt: new Date().toISOString(),
              },
              { merge: true }
            );
            await refreshOnboarding(user);
          } catch (e) {
            console.warn('Failed to mark accountLinkingSkipped after relink', e);
          }
        }
        const skipAccountStep = isRedoFlow || 
          (onboardingResult && onboardingResult.accountLinkingSkipped) ||
          (onboardingResult && onboardingResult.discordLinked);


        if (skipAccountStep) {
          console.log('[CourseLinking] navigating to /home (skip/accountLinkingSkipped)');
          navigate('/home');
        } else {
          console.log('[CourseLinking] navigating to /accountlinking');
          navigate('/accountlinking');
        }
      }
    } catch (error) {
      console.error('Confirm transcript error:', error);
      setTranscriptError(error.message || 'Failed to save transcript');
    } finally {
      console.log('[CourseLinking] handleConfirmAndContinue finished');
      setSavingTranscript(false);
    }
  };

  const OptionBox = ({ icon, title, description, details, buttonText, onClick }) => (
      <div className="relative w-full flex">
          <div className={`absolute inset-0 rounded-lg bg-gray-400 shadow-md`}
                style={{ transform: 'translate(6px, 6px)', zIndex: 0 }}
          />

          <div
              className="flex flex-col min-h[265px] items-start bg-white rounded-lg p-6 border border-gray-200 
                      transition duration-300 ease-in-out relative z-10 
                      font-titilliumWeb"
              style={{ height: '100%', width: '100%' }}
          >
              <div className="mb-4 self-start">{icon}</div>
              <h3 className="font-bold bodyText text-gray-800 mb-2 text-left w-full">{title}</h3>
              <p className="text-nexus900 text-left tinyText mb-2 flex-1 w-full">
              {description}
              </p>
              <ul className="list-disc list-inside tinyText text-left text-nexus900 w-full mb-6 pl-4">
              {details.map((detail, index) => (
                  <li key={index} className="mb-1">{detail}</li>
              ))}
              </ul>
              <Button text={buttonText} onClick={onClick} />
          </div>
      </div>
  );


  if ((authLoading || !onboarding?.loaded) || (onboarding?.hasCourses && !location.state?.forceCourseRelink && !isPreFirestoreOnboarding)) {
    return null;
  }
  
  const floatVariants = {
    float: (custom) => ({
      y: [0, custom.y, 0],
      x: [0, custom.x, 0],
      rotate: [custom.startRotate, custom.endRotate, custom.startRotate],
      transition: {
          duration: custom.duration,
          repeat: Infinity,
          ease: "easeInOut",
      }
    })
  };

  const objects = [
    {
        name: 'calculator',
        path: '/assets/Calculator.svg',
        style: {
            position: 'fixed',
            top: '16%',
            right: '5%',
            width: '18%',
        },
        custom: { x: 5, y: 6, startRotate: 0, endRotate: 6, duration: 10 }
    },
    {
        name: 'book',
        path: '/assets/Book.svg',
        style: {
            position: 'fixed',
            bottom: '5%',
            right: '2%',
            width: '18%',
        },
        custom: { x: -5, y: -6, startRotate: 0, endRotate: -6, duration: 10 }
    },
    {
        name: 'peechi',
        path: '/assets/LoginPipelineAssets/LoginPipelinePeechi.svg',
        style: {
            position: 'fixed',
            bottom: '8%',
            left: '5%',
            width: '12%',
        },
        custom: { x: 5, y: -6, startRotate: 0, endRotate: -6, duration: 10 }
    },
    {
        name: 'microphone',
        path: '/assets//Megaphone.svg',
        style: {
            position: 'fixed',
            top: '20%',
            left: '5%',
            width: '18%',
        },
        custom: { x: -5, y: -6, startRotate: 0, endRotate: -6, duration: 10 }
    },
  ]

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center bg-blue-950 bg-cover bg-center pt-16 pb-6 justify-center"
      style={{
        backgroundImage: "url('/assets/BasicBG.svg')"
      }}
    >
    {/* FLOATING ICONS */}
    <div className='fixed overflow-hidden w-full h-full'>
      <FloatingClouds />
    </div>
    {objects.map((obj) => (
      !isMobile && 
      <motion.div 
        key={obj.name}
        style={obj.style}
        custom={obj.custom}
        variants={floatVariants}
        animate="float"
        className='will-change-transform pointer-events-none'>
          <img src={obj.path} style={{ width: '100%', height: 'auto' }}/>
      </motion.div>
    ))}

    <AccessRequestModal
      isOpen={showAccessRequestModal}
      onClose={() => setShowAccessRequestModal(false)}
      onAgree={() => {
        // close access request and open the standalone login modal
        setShowAccessRequestModal(false);
        setShowLoginNetIDModal(true);
      }}/>

    <LoginWithNetIDModal
      isOpen={showLoginNetIDModal}
      onClose={() => setShowLoginNetIDModal(false)}
      onSuccess={(courses, meta) => {
        setParsedCourses(courses || []);
        setParsedMeta(meta || null);
        setShowLoginNetIDModal(false);
        // If login modal requested auto-save, save immediately
        if (meta && meta.autoSave) {
          handleConfirmAndContinue(courses || [], meta || null);
        }
      }}
    />

    <TranscriptModal
      isOpen={showTranscriptModal}
      onClose={() => setShowTranscriptModal(false)}
      fileInputRef={fileInputRef}
      onFileChange={handleTranscriptUpload}
      uploadingTranscript={uploadingTranscript}
      transcriptSuccess={transcriptSuccess}
      savingTranscript={savingTranscript}
      transcriptError={transcriptError}
      parsedCourses={parsedCourses}
      onRemoveCourse={handleRemoveCourse}
      onContinue={handleConfirmAndContinue}
      onCancel={() => {
        setShowTranscriptModal(false);
        setTranscriptSuccess(false);
        setParsedCourses([]);
        setTranscriptError('');
      }}
    />

    <div
      ref={popupRef}
      className={`flex items-center justify-center flex-col scale-90 mt-4 transition-all duration-500 transform ${popupVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
    >
      <h1
        className="font-titilliumWeb-bold text-white headingText mb-2"
        style={{ zIndex: 1 }}
      >
        Course Linking
      </h1>

      <div
        className="flex flex-col bg-nexus50 rounded-xl shadow-2xl p-6"
        style={{
          zIndex: 2,
          width: isMobile ? "90%" : "50rem",
          minHeight: isMobile ? "auto" : "28rem",
        }}
      >
        <div className="text-center mb-6">
          <p className="headingText font-titilliumWeb-bold text-nexus900 mb-2">
            Nexus Needs Access to Your Courses
          </p>
          <p className="bodyText font-titilliumWeb-regular text-nexus800 mb-2">
            Login through eLearning and let Nexus do the rest
          </p>
          <p className="bodyText font-titilliumWeb-bold text-nexus900 mb-2">
            OR
          </p>
          <p className="bodyText font-titilliumWeb-regular text-nexus800">
            Upload your transcript for automatic parsing
          </p>
        </div>

        <div
          className={`flex ${isMobile ? "flex-col" : "flex-row"} w-full h-full gap-8 justify-center`}
        >
          <OptionBox
            icon={
              <img
                src="/assets/loginIcon.svg"
                alt="Login"
                className="w-10 h-10"
              />
            }
            title="Login via eLearning"
            description="Allow Nexus to directly access your courses in eLearning."
            details={["Quick Login", "Real-Time Sync"]}
            buttonText="Click to Login"
            onClick={() => setShowAccessRequestModal(true)}
          />


          <OptionBox
            icon={
              <img
                src="/assets/uploadIcon.svg"
                alt="Upload"
                className="w-10 h-10"
              />
            }
            title="Upload Transcript"
            description="Directly upload your latest transcript and let Nexus parse your courses."
            details={["Quick Upload", "No Login"]}
            buttonText="Click to Upload"
            onClick={() => setShowTranscriptModal(true)}
          />
        </div>
        <p className="text-nexus900 text-center mt-6" style={{ zIndex: 1 }}>
          Don't worry, your data is secure and we only access schedule-related info.
        </p>
      </div>
    </div>
  </div>
  );
}