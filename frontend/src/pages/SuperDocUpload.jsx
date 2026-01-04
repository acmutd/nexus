import React from 'react'
import { useMediaQuery } from 'react-responsive';
import { animate, AnimatePresence, motion, scale } from "motion/react"

function Upload() {
    const isMed = useMediaQuery({ query: '(max-width: 800px)' })

    return (
    <div className="min-h-screen flex items-center justify-center bg-blue-950 bg-cover bg-center"
      style={{ backgroundImage: isMed ? "url('/assets/UploadDocLongBG.svg')" : "url('/assets/UploadDocBG.svg')" }}>
{/*--------------------------------------- UPLOAD DOC CONTAINER ---------------------------------------*/}
            <motion.div className={`flex flex-col ${isMed ? "w-[45%]" : "w-[35%]"} h-4/5 bg-gradient-to-b from-nexus800 to-nexus900 rounded-3xl z-10 mt-15 py-5 items-center`}
                        initial={{y: 20, opacity: 0}} animate={{y:0, opacity: 1}} transition={{duration: 0.5}}>
                <img className="w-[65px] h-[65px] mt-7" src="/assets/DocIcon.svg" />
                <h1 className={`font-titilliumWeb-bold ${isMed ? "text-2xl" : "text-4xl"} text-nexus50 mt-3 text-center`}>
                    Upload Document
                </h1>
{/*--------------------------------------- DRAG AND DROP BOX ---------------------------------------*/}
                <div className="flex flex-col w-4/5 h-[25%] border-1 border-gray-400 mt-3 items-center">
                    <h2 className={`font-titilliumWeb-semibold ${isMed ? "text-lg" : "text-2xl"} text-nexus50 text-center mt-3`}>
                        Drag and Drop File or
                    </h2>
                    <button className={`items-center justify-center flex w-3/5 h-[40px] bg-nexus600 rounded-xl font-titilliumWeb-semibold 
                                        ${isMed ? "text-lg" : "text-xl"} text-nexus50 hover:bg-nexus500 hover:scale-105 transition duration-300 my-2`}>
                        Browse Files
                    </button>
                    <h3 className="flex font-titilliumWeb-regular text-nexus100 text-lg ">
                        PDF
                    </h3>
                </div>
{/*------------------------------------ INPUT BOXES + UPLOAD BUTTON ------------------------------------*/}
                <input className="flex w-4/5 h-[40px] focus:outline-blue-500 bg-white border-1 border-gray-500 mt-5 rounded-lg pl-2"
                       placeholder='Document Name'/>
                <input className="flex w-4/5 h-[40px] focus:outline-blue-500 bg-white border-1 border-gray-500 mt-5 rounded-lg pl-2"
                       placeholder='Select Location'/>
                <input className="flex w-4/5 h-[40px] focus:outline-blue-500 bg-white border-1 border-gray-500 mt-5 rounded-lg pl-2"
                    placeholder='Select Unit'/>
                <button className="flex w-3/5 h-[40px] mb-4 bg-nexus600 rounded-lg font-titilliumWeb-semibold text-2xl text-nexus50 items-center justify-center
                                    hover:bg-nexus500 hover:scale-105 transition duration-300 mt-6">
                    Upload
                </button>
            </motion.div>
        </div>
    )
}

export default Upload