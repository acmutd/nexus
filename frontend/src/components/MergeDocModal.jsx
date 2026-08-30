import React, { useRef, useState } from 'react'
import { HiDocumentDuplicate, HiOutlineX } from 'react-icons/hi'
import { motion } from 'motion/react'
import Button from './Button'
import { uploadPdfAndCreateJob, pollJob } from '../utils/superdocJobs'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const MergeDocModal = ({ onClose, courseId, documentId, documentName, onMergeSuccess }) => {
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('idle') // idle | uploading | merging | success | failed
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (!selected) return
    if (selected.size > MAX_UPLOAD_BYTES) {
      alert('File is too large. Max size is 10MB.')
      return
    }
    console.log(`[superdoc] file selected: ${selected.name} (${selected.size} bytes)`)
    setFile(selected)
  }

  const handleMerge = async () => {
    if (!file) return alert('Please upload a file!')

    try {
      console.log(`[superdoc] starting merge into "${documentName}" for course ${courseId}`)
      setStatus('uploading')
      const { jobId } = await uploadPdfAndCreateJob(file, { docName: documentName, courseId, documentId }, setProgress)
      setStatus('merging')
      await pollJob(jobId)
      console.log(`[superdoc] "${file.name}" merged successfully`)
      setStatus('success')
      onMergeSuccess && onMergeSuccess()
      setTimeout(() => onClose && onClose(), 1200)
    } catch (error) {
      console.error('[superdoc] merge failed:', error)
      setStatus('failed')
    }
  }

  const statusText = {
    uploading: `Uploading... ${Math.round(progress * 100)}%`,
    merging: 'Merging document...',
    failed: 'Merge failed. Please try again.',
  }[status]

  return (
    <div className='inset-0 fixed flex backdrop-brightness-50 min-w-screen min-h-screen z-50 items-center justify-center font-titilliumweb-regular' onClick={() => onClose && onClose()}>
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-nexus800 rounded-lg p-8 max-w-2xl mx-4 w-[clamp(300px,30%,500px)] overflow-y-auto shadow-2xl scale-90 "
      >
        <motion.div className="flex flex-col justify-center items-center relative">
          <HiDocumentDuplicate color='white' size={55} />
          <h2 className="mt-2 mb-2 text-[clamp(1rem,2.7vw,2.5rem)] font-titilliumWeb-bold text-white">Merge Document</h2>

          <button
            onClick={() => onClose && onClose()}
            className="text-gray-500 hover:text-gray-700 cursor-pointer absolute right-0 top-0"
          >
            <HiOutlineX size={24} />
          </button>

          {status === 'success' ? (
            <div className="w-full mt-2 p-4 bg-green-900/30 border border-green-500 rounded-lg text-green-400 text-center">
              <span className="text-2xl">✓</span>
              <p className="bodyText font-titilliumWeb-semibold mt-1">"{file?.name}" merged into {documentName}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col text-center bg-nexus900 p-4 rounded-lg w-full items-center justify-center">
                <span className="bodyText font-titilliumWeb-regular text-white mt-1">
                  {file ? file.name : 'Drag and Drop File or'}
                </span>
                <div className='flex w-1/2 my-2'>
                  <Button className="flex" text={'Browse'} onClick={() => fileInputRef.current?.click()} disabled={status === 'uploading' || status === 'merging'} />
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />
                </div>
                <span className="block tinyText font-titilliumWeb-regular text-gray-500 mt-1">
                  PDF only, max file size: 8MB
                </span>
              </div>

              {status === 'uploading' && (
                <div className="w-full mt-3">
                  <div className="w-full h-2 bg-nexus900 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-nexus400" animate={{ width: `${Math.round(progress * 100)}%` }} transition={{ duration: 0.2 }} />
                  </div>
                  <span className="tinyText font-titilliumWeb-regular text-gray-400 mt-1 block">{statusText}</span>
                </div>
              )}

              {status === 'merging' && (
                <div className="flex items-center gap-2 mt-3">
                  <motion.div
                    className="w-4 h-4 border-2 border-nexus400 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  <span className="tinyText font-titilliumWeb-regular text-gray-400">{statusText}</span>
                </div>
              )}

              {status === 'failed' && (
                <span className="tinyText font-titilliumWeb-regular mt-2 text-red-400">{statusText}</span>
              )}

              <Button className={"mt-4"} text={status === 'uploading' || status === 'merging' ? 'Merging...' : 'Merge Document'} disabled={status === 'uploading' || status === 'merging'} onClick={handleMerge} />
              <Button className={"bg-gray-600 my-4"} text={'Cancel'} onClick={() => onClose && onClose()} />
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}

export default MergeDocModal
