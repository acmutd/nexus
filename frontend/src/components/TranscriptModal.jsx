import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { HiUpload, HiOutlineX } from 'react-icons/hi'
import Button from './Button';

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
          className="fixed inset-0 flex items-center justify-center z-50 "
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          onClick={() => !uploadingTranscript && !transcriptSuccess && onClose && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-nexus50 rounded-lg p-8 max-w-2xl w-[35%] mx-4 min-w-[300px] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col justify-center items-center mb-4 relative">
              <img src='assets/uploadIcon.svg' className='w-[10%] min-w-[50px]'/>
              <h2 className="mt-4 mb-2 headingText font-titilliumWeb-bold text-nexus900">Upload Transcript</h2>
              <h3 className='tinyText text-center font-titilliumWeb-semibold text-nexus900'> Directly upload your latest transcript and let Nexus parse your courses. </h3>
              {!uploadingTranscript && !transcriptSuccess && (
                <button
                  onClick={() => onClose && onClose()}
                  className="text-gray-500 hover:text-gray-700 cursor-pointer absolute right-0 top-0"
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
                    <span className={`block bodyText font-titilliumWeb-semibold ${uploadingTranscript ? 'text-gray-400' : 'text-blue-700'}`}>
                      {uploadingTranscript ? 'Processing Transcript...' : 'Click to Upload PDF'}
                    </span>
                    <span className="block tinyText font-titilliumWeb-regular text-gray-500 mt-1">
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

              <div className="tinyText font-titilliumWeb-regular text-gray-600">
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
                          className="px-3 py-1 w-fit text-sm bg-blue-100 text-blue-800 rounded-full font-semibold border border-blue-300 flex items-center justify-between gap-2"
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
                  <p className="tinyText font-titilliumWeb-regular text-gray-500 text-center mt-3">
                    Click the X to remove any courses you don't want to include
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <Button
                  onClick={() => onContinue && onContinue()}
                  disabled={parsedCourses.length === 0}
                  text={"Continue"}
                />
              <Button
                onClick={() => {
                  onCancel && onCancel()
                }}
                className={"bg-gray-500"}
                text={"Cancel"}
              />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}