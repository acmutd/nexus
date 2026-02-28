import React, { useEffect, useRef, useState } from 'react'
import { HiOutlinePencil, HiOutlineX, HiSearch } from 'react-icons/hi'
import { motion } from 'motion/react'
import { HiOutlineDocumentArrowUp } from 'react-icons/hi2'
import Button from './Button'

const UpdateHeadingModal = ({onClose}) => {

    const [search, setSearch] = useState('')
    const [selectedHeading, setSelectedHeading] = useState('')
    const handleInputChange = (event) => {
        setSearch(event.target.value)
    }

    const headings = ["Heading 1", "Heading 2", "Heading 3", "Heading 4", "Heading 5", "Heading 6"]
    const filteredHeadings = search == '' ? headings : headings.filter((heading) => heading.toLowerCase().includes(search.toLowerCase()))
    
    return (
        <div className='inset-0 fixed flex backdrop-brightness-50 min-w-screen min-h-screen z-50 items-center justify-center font-titilliumWeb-regular' onClick={() => {onClose && onClose()}}>
            <motion.div
            onClick={e => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="scale-85 bg-nexus800 rounded-lg p-8 max-w-2xl mx-4 w-[clamp(300px,30%,500px)] overflow-y-auto shadow-2xl"
            >
                <div className="flex flex-col justify-center items-center relative">
                    <HiOutlinePencil color='white' size={55}/>
                    <h2 className="mt-2 mb-2 text-[clamp(1rem,2.7vw,2.5rem)] font-titilliumWeb-bold text-white">Update Heading</h2>
                    <button
                        onClick={() => onClose && onClose()}
                        className="text-gray-500 hover:text-gray-700 cursor-pointer absolute right-0 top-0"
                    >
                        <HiOutlineX size={24} />
                    </button>

                    <div className="flex flex-col text-center bg-nexus900 p-4 rounded-lg w-full items-center justify-center h-full">
                            
                        <div className='w-full flex h-10 bg-nexus900 my-2 items-center rounded-lg focus-within:ring-1 focus-within:ring-nexus600 ring-1 ring-gray-500'>
                            <input className='flex-1 p-2 focus:outline-none bg-transparent rounded-l-lg placeholder-gray-400 text-nexus100 font-titilliumWeb-semibold'
                                    value={search}
                                    onChange={handleInputChange}
                                    placeholder={'Search headings'} />
                            <HiSearch className='mr-2' color='gray' size={25}/>
                        </div>

                        <div className='bg-gray-500 h-px w-full my-2'/>

                            <div className='flex flex-col w-full h-[150px] my-2 gap-2 scroll-fade custom-scroll'>
                                {filteredHeadings.map((heading, index) => (
                                    <div className={`cursor-pointer flex w-full p-2 rounded-lg text-nexus100 font-titilliumWeb-semibold text-center items-center justify-center hover:bg-nexus600 transition duration-300 ${selectedHeading == heading ? 'bg-nexus700' : ' bg-nexus800'}`} 
                                        key={index} onClick={() => {setSelectedHeading(heading)}}>
                                        {heading}
                                    </div>   
                                ))}
                            </div>

                    </div>

                    <label className='text-white font-titilliumWeb-semibold mt-4 mb-1 text-[clamp(0.5rem,1.2vw,1.5rem)] w-full text-start'>
                        New Heading Name
                    </label>
                    <input className='w-full bg-nexus900 h-10 placeholder-gray-400 text-white rounded-lg p-2' placeholder='Enter New Heading Name'/>
                    
                    <Button className={"mt-4"} text={'Update Heading'}/>
                    <Button className={"bg-gray-600 my-4"} text={'Cancel'}/>
                </div>
            </motion.div>
        </div>
    )
}

export default UpdateHeadingModal