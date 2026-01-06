import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import { HiOutlineDocument, HiUpload, HiChevronLeft, HiChevronRight, HiChevronDown, HiOutlineUpload } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';

function SuperDoc() {
  const isMed = useMediaQuery({ query: '(max-width: 800px)' })
  const comboboxRef = useRef()
  const [isDropdownVisible, setDropDownVisible] = useState(false)
  const [search, setSearch] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('')
  const [units, setUnits] = useState([])
  const [selectedUnit, setSelectedUnit] = useState('');

  /* -------------------------- SIDEBAR STUFF -------------------------------*/

  const handleUploadClick = () => {
    navigate('/upload');
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const sidebarVariants = {
    expanded: { width: isMed ? 150 : 256 },
    collapsed: { width: 32 },
  };

  const mainVariants = {
    expanded: {x: isMed ? 180 : 300},
    collapsed: {x: isMed ? 120 : 170}
  }

  /* ------------------------------------------------------------------------*/

  /* --------------------------  COMBOBOX STUFF  ----------------------------*/
  const courseUnits = new Map()
  // courseUnits will be a map that uses the section name as the key and the individual unit notes as values
  courseUnits.set("MATH 1448", ['MATH 1448 Unit 1', 'MATH 1448 Unit 2', 'MATH 1448 Unit 3'])
  courseUnits.set("CS 1337", ['CS 1337 Unit 1', 'CS 1337 Unit 2'])

  const courseOptions = []
  courseUnits.forEach((unit, course) => {courseOptions.push(course)})

  const filteredSearch = (search === '' ? courseOptions : 
                                          courseOptions.filter((value) => value.toLowerCase().includes(search.toLowerCase())))

  // Whenever user clicks outside combobox, close combobox options
  useEffect(() => {
    const handleClickOutside = (event) => {
      if(comboboxRef.current && !comboboxRef.current.contains(event.target)) {
        setDropDownVisible(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return() => {document.removeEventListener("mousedown", handleClickOutside)}
  }, [])

  // Make sure the state variable follows whatever user puts in combobox
  const handleInputChange = (event) => {
    setSearch(event.target.value)
  }

  function handleClickCourse(course) {
    setSearch(course)
    setSelectedCourse(course)
    // When the user clicks one of the courses from the combobox, that course will be selected and its respective units will show 
    if(courseUnits.has(course)) {
      setUnits(courseUnits.get(course))
      setSelectedUnit(null)
    }
    setDropDownVisible(false)
  }
    
  return (
    <div className="min-h-screen max-w-screen bg-cover bg-center overflow-x-hidden justify-center bg-gradient-to-b from-nexus700 to-nexus900"
         style={{backgroundImage: "url('/assets/SuperdocBG.svg')"}}>
      <div className="fixed inset-0 z-0">

      </div>
      <img className="absolute top-25" src='/assets/SuperDocClouds.svg' />
      <motion.div 
          initial={{translateX: 0}} 
          animate={{translateX: isMed ? 400 : 700}}
          transition={{
                        duration: 2.5,
                        type: "spring",
                        bounce: .4
                      }}>
        <img className="absolute top-20 left-10 scale-90" src='/assets/SuperDocPigeon.svg'/>
      </motion.div>
      { /* ------------------------------- DOC SIDE BAR ------------------------------------ */}
      <motion.aside
        className="shadow-md flex flex-col h-screen fixed left-0 top-0 pt-16 overflow-visible z-40"
        initial="expanded"
        animate={isCollapsed ? "collapsed" : "expanded"}
        variants={sidebarVariants}
        transition={{ type: "tween", duration: 0.4 }}
        style={{backgroundImage: isCollapsed ? 'linear-gradient(#002966, #002966)' : 'linear-gradient(#002966, #001433)'}}>
        <button
          onClick={toggleSidebar}
          className="absolute top-20 -right-6 bg-nexus600 text-white p-2 rounded-r-md z-50 shadow-md">
          {isCollapsed ? <HiChevronRight size={20} /> : <HiChevronLeft size={20} />}
        </button>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="flex-1 overflow-y-auto p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}>
              <h2 className="text-2xl font-bold text-nexus100 mb-4">Units</h2>
              {selectedUnit === '' ? 
              (<ul className="text-center font-titilliumWeb-regular text-nexus50">
                Select a Course in the Box to the Right to populate Units.
              </ul>) :
              (
              <ul className="space-y-2">
                {units.map((unit, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}>
                    <button
                      className={`bg-nexus900 flex items-center w-full p-1 rounded hover:bg-nexus700 text-nexus200 hover:text-white transition-colors duration-200`}
                                  onClick={() => setSelectedUnit(unit)}>
                      <HiOutlineDocument className="mr-2" />
                      {unit}
                    </button>
                  </motion.li>
                ))}
              </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          className="p-4 mt-auto"
          initial={{ opacity: 1 }}
          animate={{ opacity: isCollapsed ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            to="/upload"
            className="flex items-center justify-center w-full bg-nexus600 text-white py-2 px-4 rounded-md hover:bg-nexus500
                       hover:scale-105 duration-300 transition">
            <HiUpload className="mr-2" size={20}/>
            Upload Document
          </Link>
        </motion.div>
      </motion.aside>
      {/* ---------------------------------------------------------------------------------- */}
      <div className={`flex h-full w-full flex-col`}>
        <AnimatePresence>
          <motion.div
          variants={mainVariants}
          animate={isCollapsed ? "collapsed" : "exapnded"}
          initial="expanded"
          transition={{duration: 0.4}}
          className={`${isMed ? "w-[65%]" : "w-[75%]"} h-full mt-25`}>
      {/* ----------------------------------- COMBOBOX ------------------------------------- */}
            <div className={`flex h-[37px] ${isMed ? "w-[150px]" : "w-[300px]"} bg-white rounded-t-md border-1 border-gray-400`} 
                 ref={comboboxRef}>
              <input className="flex w-full rounded-tl-md pl-2 focus:outline-blue-400" 
                    placeholder='Enter Course'
                    value={search}
                    onFocus={() => setDropDownVisible(true)}
                    onChange={handleInputChange}>
              </input>
              <motion.ul onClick={() => setDropDownVisible(!isDropdownVisible)} animate={{rotate: isDropdownVisible ? 180 : 0}}>
                <HiChevronDown size={35} color='#4a5565' className=''/>
              </motion.ul>
              {isDropdownVisible ? (
                <motion.div 
                  className={`absolute ${isMed ? "w-[150px]" : "w-[300px]"} bg-white max-h-[200px] overflow-auto font-titilliumWeb-regular mt-[37px]`}
                  initial={{scaleY: 0, opacity: 0}}
                  animate={{scaleY: 1, opacity: 1}}
                  exit={{scaleY: 0, opacity: 0}}
                  style={{transformOrigin: 'top'}}
                  transition={{duration: .1}}>
                  {filteredSearch.map((course, index) => {
                    return(
                      <ul className={`hover:bg-nexus500 hover:text-white py-2 p-1 `}
                          onClick={() => {handleClickCourse(course)}}>
                        {course}
                      </ul>
                    )
                  })}
                </motion.div>)
              : null}
            </div>
      {/* ----------------------------- SUPER DOC ----------------------------------- */}
          <h1 className="flex text-3xl font-titilliumWeb-bold pt-4 text-nexus50">
            SuperDoc - {selectedUnit}
          </h1>
          <span className="text-gray-400 font-titilliumWeb-regular">
            To make edits to the SuperDoc, link your Google Account in {' '}
            <Link to="/settings" className='hover:underline text-gray-300'>
              Settings.
            </Link>
          </span>
          <div className={`flex flex-col h-full w-full max-h-[685px] bg-gradient-to-b from-nexus800 to-nexus900 mt-2 rounded-md items-center justify-center`}>
            <h1 className="flex text-lg font-titilliumWeb-regular text-white text-center w-full justify-center py-10 mx-4">
                There is currently no document uploaded for this unit.
            </h1>
            <Link className="flex w-2/5 h-[50px] bg-nexus600 hover:bg-nexus500 mb-10 items-center justify-center rounded-md hover:scale-105 duration-300 transition
                             text-center text-xl font-titilliumWeb-semibold text-nexus50"
                  to="/upload">
                <HiOutlineUpload className="" size={25}/>
                Upload Document
            </Link>
          </div>
          </motion.div>
      {/* ---------------------------------------------------------------------------------- */}

        </AnimatePresence>
      </div>
    </div>
  )
}

export default SuperDoc