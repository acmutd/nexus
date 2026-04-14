import React, { useRef, useState } from 'react'
import { HiDocumentDuplicate, HiOutlineX } from 'react-icons/hi'
import { motion } from 'motion/react'
import Button from './Button'

const MergeDocModal = ({ onClose, courseId, documentName }) => {
  const [file, setFile] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (selected) setFile(selected)
  }

  const handleMerge = async () => {
    if (!file) return alert('Please select a file!')

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const pdfBase64 = reader.result.split(',')[1]
        const response = await fetch('/api/discord/superdoc/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64, courseId, docName: documentName }),
        })

        if (!response.ok) {
          const text = await response.text()
          console.error('Merge failed:', response.status, text)
          return alert(`Merge failed (${response.status}). Check console for details.`)
        }

        const result = await response.json()
        console.log('Merge worked:', result)
        onClose && onClose()
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Merge error:', error)
    }
  }

  return (
    <div className='inset-0 fixed flex backdrop-brightness-50 min-w-screen min-h-screen z-50 items-center justify-center font-titilliumweb-regular' onClick={() => onClose && onClose()}>
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-nexus800 rounded-lg p-8 max-w-2xl mx-4 w-[clamp(300px,30%,500px)] overflow-y-auto shadow-2xl scale-90"
      >
        <motion.div className="flex flex-col justify-center items-center relative">
          <HiDocumentDuplicate color='white' size={55}/>
          <h2 className="mt-2 mb-2 text-[clamp(1rem,2.7vw,2.5rem)] font-titilliumWeb-bold text-white">Merge Document</h2>

          <div className="flex flex-col text-center bg-nexus900 p-4 rounded-lg w-full items-center justify-center">
            <span className="bodyText font-titilliumWeb-regular text-white mt-1">
              {file ? file.name : 'Drag and Drop File or'}
            </span>
            <div className='flex w-1/2 my-2'>
              <Button className="flex" text={'Browse'} onClick={() => fileInputRef.current?.click()}/>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden"/>
            </div>
            <span className="block tinyText font-titilliumWeb-regular text-gray-500 mt-1">
              Max file size: 0.5MB
            </span>
          </div>

          <button
            onClick={() => onClose && onClose()}
            className="text-gray-500 hover:text-gray-700 cursor-pointer absolute right-0 top-0"
          >
            <HiOutlineX size={24}/>
          </button>

          <Button className={"mt-4"} text={'Merge Document'} onClick={handleMerge}/>
          <Button className={"bg-gray-600 my-4"} text={'Cancel'} onClick={() => onClose && onClose()}/>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default MergeDocModal
