import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Link } from 'react-router-dom'
import { useMediaQuery } from 'react-responsive'
import { HiOutlineX } from 'react-icons/hi'
import Button from './Button'
import LoadingScreen from './LoadingScreen'

export default function AccessRequestModal({ isOpen, onClose, onAgree }) {
  const isMed = useMediaQuery({ query: '(max-width: 800px)' })

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50 "
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          onClick={() => {onClose && onClose()}}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-nexus50 rounded-lg p-8 max-w-2xl w-[35%] mx-4 min-w-[300px] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col justify-center items-center mb-4 relative">
              <img src='assets/loginIcon.svg' className='w-[10%] min-w-[50px]'/>
              <h2 className="mt-4 mb-2 headingText font-titilliumWeb-bold text-nexus900">Login via eLearning</h2>
              <h3 className='flex w-[80%] tinyText text-center font-titilliumWeb-semibold text-nexus700'> Allow Nexus to directly access your courses in eLearning via our Web Scraper. </h3>
                <button
                  onClick={() => onClose && onClose()}
                  className="text-gray-500 hover:text-gray-700 cursor-pointer absolute right-0 top-0"
                >
                  <HiOutlineX size={24} />
                </button>
              <div className="flex flex-col bg-white rounded-xl items-center text-center justify-center p-4 my-6">
                <h1 className="font-titilliumWeb-bold text-nexus800 text-2xl">
                  This allows Nexus to:
                </h1>
                <li className="w-4/5 font-titilliumWeb-regular text-nexus800 tinyText items-center justify-center text-center">
                  <span className="font-titilliumWeb-semibold">Scrape</span> data from your classes in order to grant access to classes in each Discord server.
                </li>
                <span className='w-4/5 mt-4 font-titilliumWeb-regular text-nexus800 tinyText items-center justify-center text-center'>
                   By agreeing, you'll give Nexus <span className="font-titilliumWeb-bold">temporary</span> access to your data.
                </span>
              </div>
              <div className="flex flex-col w-full gap-4">
                <Button
                  text={"I Agree"}
                  onClick={() => {
                    if (onAgree) onAgree();
                    if (onClose) onClose();
                  }}
                />
                <Button
                  className="bg-gray-500"
                  text={"Cancel"}
                  onClick={() => onClose && onClose()}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
