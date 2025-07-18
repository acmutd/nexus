import React, { useState, useRef, useEffect } from 'react'
import CourseCard from '../components/CourseCard';
import { Link } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import { HiChevronDown, HiOutlineX } from "react-icons/hi";
import { animate, AnimatePresence, motion, scale } from "motion/react"

function CourseEntry() {
  const isMed = useMediaQuery({ query: '(max-width: 1223px)' })
  const comboboxRef = useRef(null);
  const [search, setSearch] = useState("")
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [isDropDownVisible, setDropDownVisible] = useState(false)
  const [isWarningVisible, setWarningVisible] = useState(false)
  const [warningMessage, setWarningMessage] = useState("")
  const [selectedCourses, setSelectedCourses] = useState([])

  const testOptions = ["MATH 2418", "CS 1337", "ECS 2390", "MUSI 1306", "SCI 3607", "MATH 1228", "CS 2336"]

  const filteredSearch = search === '' ? testOptions 
                                       : testOptions.filter((course) => course.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target)) {
        setDropDownVisible(false);
      }
    };

    // Adds listener when component mounts
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Removes listener when component unmounts
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (event) => {
    setSearch(event.target.value)
  }

  // Whenever the user adds a course, gives a warning if the user selects a course that's already been added
  function handleAddCourse(course) {
    if(selectedCourses.includes(course)) {
      setWarningVisible(true)
      setWarningMessage("You've Already Added " + course + "!")
    } else {
      setWarningVisible(false)
      selectedCourses.push(course)
    }
    setDropDownVisible(false)
  }

  const handleRemoveCourse = (courseToRemove) => {
    const newSelectedCourses = selectedCourses.filter(course => selectedCourses.indexOf(course) !== courseToRemove)
    setSelectedCourses(newSelectedCourses)
  }

  // Whenever the user uses down, up, enter, or escape key when the options are pulled up
  const handleKeyPress = (event) => {
    if (!isDropDownVisible) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          setDropDownVisible(true);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        setHighlightedIndex(prevIndex =>
          prevIndex < filteredSearch.length - 1 ? prevIndex + 1 : 0
        );
        break;
      case "ArrowUp":
        setHighlightedIndex(prevIndex =>
          prevIndex > 0 ? prevIndex - 1 : filteredSearch.length - 1
        );
        break;
      case "Enter":
        if (highlightedIndex >= 0 && filteredSearch[highlightedIndex]) {
          handleAddCourse(filteredSearch[highlightedIndex]);
        }
        break;
      case "Escape":
        setDropDownVisible(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative">
      <div className={`relative flex flex-col items-center justify-center w-full h-screen ${isMed ? "pt-80 ":"pt-20"}`}>
        {isMed ? (
          <img
            className="w-screen bg-gradient-to-b from-nexus900 to-nexus700 flex items-center justify-center"
            src="/assets/AccessRequestLongBG.svg"
            style={{ position: 'absolute', zIndex: 0, top: 0, bottom: 0, left: 0, right: 0}}
          />
        ) : (
          <img
            className="w-screen bg-gradient-to-b from-nexus900 to-nexus700 flex items-center justify-center"
            src="/assets/AccessRequestBG.svg"
            style={{ position: 'absolute', zIndex: 0, top: 0, bottom: 0, left: 0, right: 0}}
          />
        )}

        {/* --------------------------------- DISCLAIMER BOX --------------------------------- */}
        <div className="relative flex-1 w-2/5 bg-gradient-to-b from-nexus100 from-10% via-nexus50 to-nexus100 to-90% rounded-xl mt-6 p-6" style={{ zIndex: 1 }}>
          <div className="items-center justify-center flex flex-row">
            <img src="/assets/Logo.svg" style={{ scale: isMed ? .6 : 1, margin: isMed ? -12 : 24 }} />
            <img src="/assets/UTDLogo.svg" style={{ scale: isMed ? .6 : 1, margin: isMed ? -12 : 24 }} />
          </div>
          <div className="relative flex items-center justify-center text-center flex-col">
            <h1 className="font-titilliumWeb-semibold text-nexus900 text-2xl pb-2">
              Enter All Your Courses for the Semester Here
            </h1>
            {/* --------------------------------- COMBO BOX --------------------------------- */}
            {isWarningVisible && (
              <h2 className="text-red-600 text-md font-titilliumWeb-regular pb-2">
                {warningMessage}
              </h2>
            )}
            <div className="relative flex w-full h-full flex-col" ref={comboboxRef}>
              <div className="relative flex flex-row w-full h-[35px] bg-white border-1 border-gray-400 rounded-lg">
                <input className="w-full h-[35px] rounded-l-lg pl-2 focus:outline-blue-400" 
                      onFocus={() => setDropDownVisible(true)}
                      placeholder='ex. CS 1337 Klyne Smith'
                      value={search}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyPress}/>
                <motion.ul onClick={() => setDropDownVisible(!isDropDownVisible)} animate={{rotate: isDropDownVisible ? 180 : 0}}>
                  <HiChevronDown size={35} color='#4a5565' className=''/>
                </motion.ul>
              </div>
              <AnimatePresence>
                {isDropDownVisible ? (
                  <motion.div
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{transformOrigin: 'top'}}
                  className="absolute mt-[40px] z-10 w-full overflow-auto bg-white border border-gray-300 rounded-lg shadow-lg max-h-60">
                    {filteredSearch.map((course, index) => {
                      return(
                        <ul className={`py-2 ${highlightedIndex === index ? "bg-nexus500 text-white" : "hover:bg-white"}`} 
                            onMouseOver={() => setHighlightedIndex(index)}
                            onClick={() => handleAddCourse(course)}>                      
                          {course}
                        </ul>
                      )})}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
          <div className="bg-gray-400 mt-5 h-[1px] w-full"/>
          {/* --------------------------------- COURSES LIST --------------------------------- */}
          <div className="flex flex-col rounded-xl items-center text-center justify-center w-full" style={{ marginTop: 16 }}>
            <h1 className="font-titilliumWeb-semibold text-nexus900 text-xl ">
              Selected Courses
            </h1>
            <div className="flex flex-wrap w-full items-center justify-center">
              {selectedCourses.length === 0 ? 
                (<h2 className="font-titilliumWeb-regular text-gray-500 text-lg">Nothing Here, Add Some Courses!</h2>) : null}
              {selectedCourses.map((course, index) => {
                return(
                  <div className="py-2 pr-2 flex flex-wrap">
                    <ul className="flex flex-row rounded-full w-auto h-auto bg-nexus300 px-5 max-w-[250px] min-w-[100px] text-lg font-titilliumWeb-regular 
                                 transition duration-200 hover:scale-105 hover:bg-red-400">
                      {course}
                      <HiOutlineX size={20} color={'#364153'} className="mt-1 ml-2"
                                  onClick={() => handleRemoveCourse(index)}/>
                    </ul>
                  </div> 
                )
              })}
            </div>
          </div>
          {/* --------------------------------- BUTTONS --------------------------------- */}
          <div className="flex flex-row justify-center items-center">
            <Link to="/" className="text-white bg-nexus500 py-3 text-xl font-titilliumWeb-bold rounded-lg mt-8 flex flex-row 
                        transition duration-300 hover:scale-105 drop-shadow-black items-center justify-center"
              style={{ width: isMed ? '45%' : '33.3333%' }}>
              All Done!
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourseEntry;
