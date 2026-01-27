import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import { HiUpload, HiOutlineX } from 'react-icons/hi';
import { AnimatePresence } from 'motion/react';
import { getAuth } from 'firebase/auth';
import AccessRequestModal from '../components/AccessRequestModal';
import TranscriptModal from '../components/TranscriptModal';
import LoginWithNetIDModal from '../components/LoginWithNetIDModal';
import Button from '../components/Button';

export default function CourseLinking() {
  const isMed = useMediaQuery({ query: '(max-width: 800px)' });
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

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

  // Open modal automatically if we were redirected from the old accessrequest page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('from') === 'accessrequest') setShowAccessRequestModal(true);
  }, []);

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

  // Save parsed courses when user clicks "Continue"
  const handleConfirmAndContinue = async (coursesArg = null, metaArg = null) => {
    setSavingTranscript(true);
    setTranscriptError('');

    const coursesToSave = Array.isArray(coursesArg) ? coursesArg : parsedCourses;
    const metaToSave = metaArg || parsedMeta;

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        setTranscriptError('Please log in first');
        setSavingTranscript(false);
        return;
      }

      const token = await user.getIdToken();

      const response = await fetch(`/api/confirm-transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.uid, token, courses: coursesToSave, meta: metaToSave })
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to save transcript');

      // Navigate on success -> go to account linking
      navigate('/accountlinking');
    } catch (error) {
      console.error('Confirm transcript error:', error);
      setTranscriptError(error.message || 'Failed to save transcript');
    } finally {
      setSavingTranscript(false);
    }
  };

  const OptionBox = ({ icon, title, description, details, buttonText, onClick }) => (
      <div className="relative w-full flex">
          <div className={`absolute inset-0 rounded-lg bg-gray-400 shadow-md`}
                style={{ transform: 'translate(6px, 6px)', zIndex: 0 }}
          />

          <div
              className="flex flex-col min-h-[265px] items-start bg-white rounded-lg p-6 border border-gray-200 
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

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center bg-blue-950 bg-cover bg-center pt-16 pb-6 justify-center"
      style={{
        backgroundImage: "url('/assets/AccessRequestBG.svg')"
      }}
    >

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

    <div className="flex items-center justify-center flex-col scale-90 mt-4">
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
          width: isMed ? "90%" : "50rem",
          minHeight: isMed ? "auto" : "28rem",
        }}
      >
        <div className="text-center mb-6">
          <p className="headingText font-titilliumWeb-bold text-nexus900 mb-2">
            Nexus Needs Access to Your Courses:
          </p>
          <p className="bodyText font-titilliumWeb-regular text-nexus800 mb-2">
            Login through eLearning and let Nexus' Web Scraper do the rest
          </p>
          <p className="bodyText font-titilliumWeb-bold text-nexus900 mb-2">
            OR
          </p>
          <p className="bodyText font-titilliumWeb-regular text-nexus800">
            Upload your transcript for automatic parsing
          </p>
        </div>

        <div
          className={`flex ${isMed ? "flex-col" : "flex-row"} w-full h-full gap-8 justify-center`}
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
            description="Allow Nexus to directly access your courses in eLearning via our Web Scraper."
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
