import React, { useEffect, useRef, useState } from 'react'
import { HiArrowLeft, HiDocumentAdd, HiOutlineX, HiUpload } from 'react-icons/hi'
import { AnimatePresence, motion } from 'motion/react'
import { HiDocumentPlus, HiOutlineDocumentArrowUp } from 'react-icons/hi2'
import Button from './Button'

const AddDocModal = ({onClose, isOpen}) => {

    const [uploadSelected, setUploadSelected] = useState(false)

    return (
        <div className='inset-0 fixed flex backdrop-brightness-50 min-w-screen min-h-screen z-50 items-center justify-center font-titilliumweb-regular' onClick={() => {onClose && onClose()}}>
        {/* ------------------------- CHOOSE UPLOAD OR CREATE DOCUMENT ------------------------------------ */}
            {!uploadSelected && (       
                <motion.div
                onClick={e => e.stopPropagation()}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-nexus800 rounded-lg p-8 max-w-2xl mx-4 w-[clamp(300px,30%,500px)] overflow-y-auto shadow-2xl scale-90 "
                >
                        <motion.div className="flex flex-col justify-center items-center relative">
                            <HiDocumentAdd color='white' size={55}/>
                            <h2 className="mt-2 text-[clamp(1rem,2.7vw,2.5rem)] font-titilliumWeb-bold text-white">Add A Document</h2>
                            
                            <div className="flex flex-col rounded-lg w-full items-center justify-center mb-4">
                                    
                                    <span className="tinyText font-titilliumWeb-regular text-gray-400 ">
                                        Either create a SuperDoc by uploading your own notes or creating a blank Google doc to merge documents into.
                                    </span>

                            </div>

                            <button
                                onClick={() => onClose && onClose()}
                                className="text-gray-500 hover:text-gray-700 cursor-pointer absolute right-0 top-0"
                            >
                                <HiOutlineX size={24} />
                            </button>
                            
                            <div className='flex flex-row w-full justify-between gap-2'>
                                <Button className={"h-[120px] flex flex-col"} icon={<HiUpload size={30} color='white'/>} text={'Upload Doc'} onClick={() => setUploadSelected(true)}/>
                                <Button className={"h-[120px] flex flex-col"} icon={<HiDocumentPlus size={30} color='white'/>} text={'Create Blank Doc'} onClick={() => onClose() && onClose}/>
                            </div>
                            <Button className={"bg-gray-600 my-4"} text={'Cancel'} onClick={() => onClose() && onClose}/>
                        </motion.div>
                </motion.div> 
            )}    
        {/* ------------------------- UPLOAD DOCUMENT ------------------------------------ */}                 
            {uploadSelected && (       
                <motion.div
                onClick={e => e.stopPropagation()}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-nexus800 rounded-lg p-8 max-w-2xl mx-4 w-[clamp(300px,30%,500px)] overflow-y-auto shadow-2xl scale-90 "
                >
                        <motion.div className="flex flex-col justify-center items-center relative">
                            <HiOutlineDocumentArrowUp color='white' size={55}/>
                            <h2 className="mt-2 mb-2 text-[clamp(1rem,2.7vw,2.5rem)] font-titilliumWeb-bold text-white">Upload Document</h2>
                            <button
                                onClick={() => onClose && onClose()}
                                className="text-gray-500 hover:text-white transition duration-300 cursor-pointer absolute right-0 top-0"
                            >
                                <HiOutlineX size={24} />
                            </button>

                            <button
                                onClick={() => setUploadSelected(false)}
                                className="text-gray-500 hover:text-white transition duration-300 cursor-pointer absolute left-0 top-0"
                            >
                                <HiArrowLeft size={24} />
                            </button>

                            <div className="flex flex-col text-center bg-nexus900 p-4 rounded-lg w-full items-center justify-center">
                                    
                                    <span className="bodyText font-titilliumWeb-regular text-white mt-1">
                                        Drag and Drop File or
                                    </span>
                                    <div className='flex w-1/2 my-2'>
                                        <Button className="flex" text={'Browse'}/>
                                    </div>
                                    <span className="block tinyText font-titilliumWeb-regular text-gray-500 mt-1">
                                        Max file size: 0.5MB
                                    </span>

                            </div>

                            <input className='w-full bg-nexus900 h-10 mt-4 placeholder-gray-400 text-white rounded-lg p-2' placeholder='Enter Document Name'/>
                            
                            <Button className={"mt-4"} text={'Upload PDF'}/>
                            <Button className={"bg-gray-600 my-4"} text={'Cancel'} onClick={() => setUploadSelected(false)}/>
                        </motion.div>
                </motion.div> 
            )}
        </div>
    )
}

export default AddDocModal