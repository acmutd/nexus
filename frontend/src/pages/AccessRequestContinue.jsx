import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import { HiUpload, HiOutlineX } from 'react-icons/hi';
import { AnimatePresence, motion } from 'motion/react';
import { getAuth } from 'firebase/auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function AccessRequestContinue() {
  const isMed = useMediaQuery({ query: '(max-width: 800px)' });
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const shadowAccentColor = 'bg-gray-400';

  // Transcript Upload States
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [uploadingTranscript, setUploadingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState('');
  const [transcriptSuccess, setTranscriptSuccess] = useState(false);
  const [parsedCourses, setParsedCourses] = useState([]);
  
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

          const response = await fetch(`${API_BASE}/api/parse-transcript`, {
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

  const OptionBox = ({ icon, title, description, details, buttonText, onClick }) => (
    <div
      className="relative"
      style={{ width: isMed ? "100%" : "45%", minHeight: "300px" }}
    >
      <div
        className={`absolute inset-0 rounded-lg ${shadowAccentColor} shadow-md`}
        style={{ transform: 'translate(6px, 6px)', zIndex: 0 }}
      />

      <div
        className="flex flex-col items-start bg-white rounded-lg p-6 border border-gray-200 
                  transition duration-300 ease-in-out cursor-pointer relative z-10 
                  font-titilliumWeb"
        style={{ height: '100%', width: '100%' }} 
        onClick={onClick}
      >
        <div className="text-4xl text-blue-600 mb-4 self-start">{icon}</div>
        <h3 className="font-bold text-xl text-gray-800 mb-2 text-left w-full">{title}</h3>
        <p className="text-blue-900 text-left text-sm mb-4 flex-1 w-full">
          {description}
        </p>
        <ul className="list-disc list-inside text-sm text-left text-blue-900 w-full mb-6 pl-4">
          {details.map((detail, index) => (
            <li key={index} className="mb-1">{detail}</li>
          ))}
        </ul>
        <button
          className="w-full py-2 rounded-lg font-bold text-white transition duration-300 bg-blue-600 hover:bg-blue-700"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );

  const TranscriptModal = () => (
    <AnimatePresence>
      {showTranscriptModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          onClick={() => !uploadingTranscript && !transcriptSuccess && setShowTranscriptModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Upload Transcript</h2>
              {!uploadingTranscript && !transcriptSuccess && (
                <button
                  onClick={() => setShowTranscriptModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <HiOutlineX size={24} />
                </button>
              )}
            </div>

            {/* Upload View */}
            <div className={transcriptSuccess ? 'hidden' : 'block'}>
              <div className="mb-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleTranscriptUpload}
                  className="hidden"
                  id="transcript-upload"
                  disabled={uploadingTranscript}
                />
                <label
                  htmlFor="transcript-upload"
                  className={`flex items-center justify-center gap-2 w-full py-4 px-4 rounded-lg border-2 border-dashed 
                             cursor-pointer transition-all duration-200
                             ${uploadingTranscript
                      ? 'bg-gray-100 border-gray-400 cursor-not-allowed'
                      : 'bg-white border-blue-400 hover:border-blue-600 hover:bg-blue-50'
                    }`}
                >
                  <HiUpload size={32} className={uploadingTranscript ? 'text-gray-400' : 'text-blue-600'} />
                  <div className="text-center">
                    <span className={`block font-semibold ${uploadingTranscript ? 'text-gray-400' : 'text-blue-700'}`}>
                      {uploadingTranscript ? 'Processing Transcript...' : 'Click to Upload PDF'}
                    </span>
                    <span className="block text-sm text-gray-500 mt-1">
                      Max file size: 0.5MB
                    </span>
                  </div>
                </label>

                {transcriptError && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded text-red-700 text-sm">
                    {transcriptError}
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-600">
                <p className="mb-2">• Upload your unofficial UTD transcript</p>
                <p className="mb-2">• PDF format only, max 0.5MB</p>
                <p>• We'll automatically extract your current semester courses</p>
              </div>
            </div>

            {/* Success View */}
            <div className={!transcriptSuccess ? 'hidden' : 'block'}>
              <div className="mb-6 p-4 bg-green-100 border border-green-400 rounded text-green-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">✓</span>
                  <span className="font-semibold text-lg">Transcript Parsed Successfully!</span>
                </div>
                <p className="text-sm">Found {parsedCourses.length} course{parsedCourses.length !== 1 ? 's' : ''} for the current semester</p>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
                  Courses Found:
                </h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {parsedCourses.length === 0 ? (
                    <p className="text-gray-500">No courses found</p>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {parsedCourses.map((course, index) => (
                        <motion.div
                          key={course.course_id}
                          layout
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-semibold 
                                     border border-blue-300 transition duration-200 hover:scale-105
                                     flex items-center gap-2"
                        >
                          <span>{course.course_id}</span>
                          <HiOutlineX
                            size={20}
                            className="cursor-pointer text-blue-600 hover:text-red-600 transition duration-200"
                            onClick={() => handleRemoveCourse(index)}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
                {parsedCourses.length > 0 && (
                  <p className="text-sm text-gray-500 text-center mt-3">
                    Click the X to remove any courses you don't want to include
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    navigate('/home');
                  }}
                  disabled={parsedCourses.length === 0}
                  className={`flex-1 py-3 px-6 font-bold rounded-lg transition duration-200
                             ${parsedCourses.length === 0 
                               ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                               : 'bg-blue-600 text-white hover:bg-blue-700'
                             }`}
                >
                  Continue to Home {parsedCourses.length > 0 && `(${parsedCourses.length})`}
                </button>
                <button
                  onClick={() => {
                    setShowTranscriptModal(false);
                    setTranscriptSuccess(false);
                    setParsedCourses([]);
                    setTranscriptError('');
                  }}
                  className="py-3 px-6 bg-gray-200 text-gray-700 font-bold rounded-lg 
                             hover:bg-gray-300 transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center bg-blue-950 bg-cover bg-center pt-20 pb-16"
      style={{
        backgroundImage: isMed
          ? "url('/assets/AccessRequestBGLong.svg')"
          : "url('/assets/AccessRequestBG.svg')",
      }}
    >
      <div className="flex items-center justify-center flex-col">
        <h1
          className="font-titilliumWeb-bold text-white text-4xl mb-4"
          style={{ zIndex: 1 }}
        >
          Before We Begin:
        </h1>

        <div
          className="flex flex-col bg-blue-100 rounded-xl shadow-2xl p-8"
          style={{
            zIndex: 2,
            width: isMed ? "90%" : "50rem",
            minHeight: isMed ? "auto" : "28rem",
          }}
        >
          <div className="text-center mb-6">
            <p className="text-lg font-semibold text-blue-800 mb-2">
              Nexus Needs Access to your Courses:
            </p>
            <p className="text-md text-blue-600">
              Login Through eLearning and let Nexus' Web Scraper do the Rest.
            </p>
            <p className="text-md font-bold text-blue-800 mt-3 mb-4">
              OR
            </p>
            <p className="text-md text-blue-600">
              Upload Your Transcript for Automatic Parsing
            </p>
          </div>

          <div
            className={`flex ${isMed ? "flex-col" : "flex-row"} w-full h-full gap-8 justify-center items-stretch`}
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
              onClick={() => navigate('/elearning-login')}
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
          <p className="text-blue-900 text-center mt-6" style={{ zIndex: 1 }}>
            Don't worry, your data is secure and we only access schedule-related info.
          </p>
        </div>
      </div>

      <TranscriptModal />
    </div>
  );
}