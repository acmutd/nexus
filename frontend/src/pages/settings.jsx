import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { HiCog, HiUserCircle, HiLockClosed } from 'react-icons/hi';
import { BsChevronRight } from "react-icons/bs";

function Settings() {
  const [isSelected, setSelected] = useState(1) // useState to keep track which tab the user is in
                                                // 1 = Account, 2 = Security
  return (
    <div className="flex min-h-screen bg-cover max-w-screen bg-gradient-to-b from-nexus700 to-nexus900 relative overflow-hidden"
         style={{backgroundImage: "url(/assets/AccountSettingsBackground.svg"}}>
    { /* --------------------------------------------- SIDE BAR -------------------------------------------------*/ }
        <motion.aside
            className="shadow-md flex flex-col h-screen fixed left-0 top-0 pt-16 overflow-visible z-40 w-[17%]"
            style={{backgroundImage: 'linear-gradient(#002966, #001433)'}}
        >
          <AnimatePresence>
            <motion.div
            className="flex-1 overflow-y-auto p-4 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            >
                <div className="flex flex-row border-b-1 border-nexus600">
                    <HiCog size={30} color='#CCE0FF' className="mt-1 mr-2"/>
                    <h2 className="text-3xl text-nexus100 mb-4" style={{fontFamily: 'titilliumWeb-bold'}}>Settings</h2>
                </div>

                <div className={`flex flex-row mt-4 rounded-md py-2 px-1 ${isSelected == 1 ? 'bg-nexus700' : ''}`} onClick={() => setSelected(1)} style={{cursor: 'pointer'}}>
                    <HiUserCircle size={25} color={`${isSelected==1 ? "#66A3FF" : "#0066FF" }`} className="mt-1 mr-2"/>
                    <h2 className={`text-2xl ${isSelected==1 ? 'text-nexus300' : 'text-nexus500'} `} style={{fontFamily: 'titilliumWeb-semibold'}}>Account</h2>
                </div>

                <div className={`flex flex-row mt-2 rounded-md py-2 px-1 ${isSelected == 2 ? 'bg-nexus700' : ''}`} onClick={() => setSelected(2)} style={{cursor: 'pointer'}}>
                    <HiLockClosed size={25} color={`${isSelected==2 ? "#66A3FF" : "#0066FF" }`} className="mt-1 mr-2"/>
                    <h2 className={`text-2xl ${isSelected==2 ? 'text-nexus300' : 'text-nexus500'} `} style={{fontFamily: 'titilliumWeb-semibold'}}>Security</h2>
                </div>

            </motion.div>
          </AnimatePresence>
        </motion.aside>
    { /* --------------------------- ACTUAL SETTINGS -------------------------------------*/ }
        <motion.h1
          className="w-full mt-4 pt-20 flex justify-center items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {/* ---------------------------- Account Settings Tab ------------------------------ */}
          {isSelected == 1 && 
            <div className="ml-40 flex bg-gradient-to-b from-nexus900 via-nexus800 to-nexus900 w-[30%] h-[60%] z-40 rounded-lg">
              <AnimatePresence>
                  <motion.div className='w-full flex'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}>
                      <div className="flex w-full p-4 flex-col">
                        <h1 className="flex text-nexus100 text-3xl" style={{fontFamily: 'titilliumWeb-bold'}}> Account Settings </h1>
                        {/* ------------------------------------ BUTTONS ----------------------------------------------*/}
                        <div className="flex w-full h-12 bg-nexus700 mt-4 rounded-md items-center shadow-2xl hover:bg-nexus500" style={{cursor: 'pointer'}}>
                          <h1 className="flex w-full items-center pl-2 text-nexus100" style={{font: 'titilliumWeb-regular'}}>
                            Unlink Google
                          </h1>
                          <BsChevronRight className="flex items-center justify-center" size={30} color='#CCE0FF' />
                        </div>
                      </div>
                </motion.div>
              </AnimatePresence>
            </div>
          }

          {/* ---------------------------- Security Tab ------------------------------ */}
          {isSelected == 2 && 
            <div className="ml-40 flex bg-gradient-to-b from-nexus900 via-nexus800 to-nexus900 w-[30%] h-[60%] z-40 rounded-lg">
              <AnimatePresence>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}>
                    <div className="flex p-4">
                      <h1 className="flex text-nexus100 text-3xl" style={{fontFamily: 'titilliumWeb-bold'}}> Security </h1>
                      
                    </div>
                </motion.div>
              </AnimatePresence>
            </div>
          }
          
          <iframe src='/assets/Windmill.html' className="fixed h-200 w-150 -right-40 top-20 z-10 scale-110"/> {/* Windmill */}
      </motion.h1>
    </div>
  )
}

export default Settings