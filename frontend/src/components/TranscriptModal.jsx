import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { HiUpload, HiOutlineX } from 'react-icons/hi'

export default function TranscriptModal({
  isOpen,
  onClose,
  fileInputRef,
  onFileChange,
  uploadingTranscript,
  transcriptSuccess,
  transcriptError,
  parsedCourses,
  onRemoveCourse,
  onContinue,
  onCancel
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          onClick={() => !uploadingTranscript && !transcriptSuccess && onClose && onClose()}
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
                  onClick={() => onClose && onClose()}
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
                  onChange={onFileChange}
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
                            onClick={() => onRemoveCourse(index)}
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
                  onClick={() => onContinue && onContinue()}
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
                  onClick={() => onCancel && onCancel()}
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
}