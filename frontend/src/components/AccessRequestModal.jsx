import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Link } from 'react-router-dom'
import { useMediaQuery } from 'react-responsive'

export default function AccessRequestModal({ isOpen, onClose, onAgree }) {
  const isMed = useMediaQuery({ query: '(max-width: 800px)' })

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50 backdrop-brightness-50"
          onClick={() => onClose && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-nexus50 rounded-xl p-6 w-[40%] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center justify-center">
              <div className="flex flex-row items-center justify-center mb-4">
                <img src="/assets/Logo.svg" style={{ scale: isMed ? .6 : 1, marginInline: isMed ? -12 : 24 }} />
                <img src="/assets/UTDLogo.svg" style={{ scale: isMed ? .6 : 1, marginInline: isMed ? -12 : 24 }} />
              </div>

              <h1 className="font-titilliumWeb-bold text-nexus800 text-3xl">
                Nexus
              </h1>
              <h2 className="font-titilliumWeb-regular text-nexus800 text-center text-lg mb-4">
                Would like to access your UTD data
              </h2>

              <div className="flex flex-col bg-white rounded-xl items-center text-center justify-center p-4 mb-6">
                <h1 className="font-titilliumWeb-bold text-nexus800 text-2xl pt-2">
                  This allows Nexus to:
                </h1>
                <p className="w-4/5 font-titilliumWeb-regular text-nexus800 text-base items-center justify-center text-center mt-2">
                  <span className="font-titilliumWeb-bold">Scrape</span> data from your classes in order to grant access to classes in each Discord server. By agreeing, you'll give Nexus <span className="font-titilliumWeb-bold">temporary</span> access to your data.
                </p>
                <p className="w-4/5 font-titilliumWeb-regular text-nexus800 text-base items-center justify-center text-center mt-4">
                  If you want to cancel, all you’ll have to do is upload your transcript instead.
                </p>
              </div>

              <div className="flex w-full gap-4">
                <button
                  className="cursor-pointer flex-1 text-white bg-gray-500 py-3 text-lg font-titilliumWeb-bold rounded-lg transition duration-200 hover:bg-gray-600"
                  onClick={() => onClose && onClose()}
                >
                  Cancel
                </button>
                <button
                  className="cursor-pointer flex-1 text-white bg-nexus500 py-3 text-lg font-titilliumWeb-bold rounded-lg transition duration-200 hover:bg-nexus600"
                  onClick={() => {
                    if (onAgree) onAgree();
                    if (onClose) onClose();
                  }}
                >
                  I Agree
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
