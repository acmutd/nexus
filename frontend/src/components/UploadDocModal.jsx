import React, { useEffect, useRef, useState } from 'react'
import { HiOutlineX, HiUpload } from 'react-icons/hi'
import { motion } from 'motion/react'
import { HiOutlineDocumentArrowUp } from 'react-icons/hi2'
import Button from './Button'

const UploadDocModal = ({onClose, isOpen}) => {

    const [file, setFile] = useState(null);
    const [docName, setDocName] = useState('');
    const fileInputRef = useRef(null);

    const handleFileChange = (e) =>
    {
        const selectedFile = e.target.files[0];
        if (selectedFile) 
        {
            setFile(selectedFile)
        }
            
    };

    const handleUpload = async () => {
        if (!file) return alert("Please select a PDF first!")
        
        const formData = new FormData();
        formData.append('file', file);
        console.log(file?.name)
        try{
            // const response = await fetch('/api/merge',{
            //     method:'POST',
            //     body:formData,
            // });
            // const result = await response.json();
            // console.log("Upload Success: ",result);

        }
        catch(error){
            console.error("Upload Error:",error)
        }
    }


  return (
    <div className='inset-0 fixed flex backdrop-brightness-50 min-w-screen min-h-screen z-50 items-center justify-center font-titilliumweb-regular' onClick={() => {onClose && onClose()}}>
        <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-nexus800 rounded-lg p-8 max-w-2xl mx-4 w-[clamp(300px,30%,500px)] overflow-y-auto shadow-2xl scale-90 "
        >
            <div className="flex flex-col justify-center items-center relative">
                <HiOutlineDocumentArrowUp color='white' size={55}/>
                <h2 className="mt-2 mb-2 text-[clamp(1rem,2.7vw,2.5rem)] font-titilliumWeb-bold text-white">Upload Document</h2>
                <button
                    onClick={() => onClose && onClose()}
                    className="text-gray-500 hover:text-gray-700 cursor-pointer absolute right-0 top-0"
                >
                    <HiOutlineX size={24} />
                </button>

                <div className="flex flex-col text-center bg-nexus900 p-4 rounded-lg w-full items-center justify-center">
                        
                        <span className="bodyText font-titilliumWeb-regular text-white mt-1">
                            Drag and Drop File or
                        </span>
                        <div className='flex w-1/2 my-2'>
                            <Button className="flex" text={'Browse'} onClick={() => fileInputRef.current?.click()}/>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className = "hidden"/>
                        </div>
                        <span className="block tinyText font-titilliumWeb-regular text-gray-500 mt-1">
                            Max file size: 0.5MB
                        </span>

                </div>

                <input className='w-full bg-nexus900 h-10 mt-4 placeholder-gray-400 text-white rounded-lg p-2' placeholder='Enter Document Name'/>
                
                <Button className={"mt-4"} text={'Upload PDF'} onClick={handleUpload}/>
                <Button className={"bg-gray-600 my-4"} text={'Cancel'}/>
            </div>
        </motion.div>
    </div>
  )
}

export default UploadDocModal