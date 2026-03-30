import React, { useState, useEffect } from 'react';
import StarFieldOverlay from '../components/StarFieldOverlay';
import { HiOutlineDocument, HiUpload, HiChevronLeft, HiChevronRight, HiChevronDown, HiOutlineUpload, HiArrowLeft, HiSearch, HiOutlineFolder, HiPencil, HiDocument } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobile } from '../context/mobileContext';
import 'simplebar-react/dist/simplebar.min.css';
import Button from '../components/Button';
import { HiOutlineDocumentText } from 'react-icons/hi2';
import UploadDocModal from '../components/UploadDocModal';
import UpdateHeadingModal from '../components/UpdateHeadingModal';
import { getFirebaseAuth, getFirebaseFirestore } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

function SuperDoc() {

  const {isMobile} = useMobile()
  const [search, setSearch] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [coursesSideBar, setCoursesSidebar] = useState(true)
  const [documents, setDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState('');
  const [displayCourse, setDisplayCourse] = useState('')
  const [uploadDocumentOpen, setUploadDocumentOpen] = useState(false)
  const [updateHeadingOpen, setUpdateHeadingOpen] = useState(false)
  const [courseMap, setCourseMap] = useState(new Map())
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)


  /* --------------------------  SEARCH STUFF  ----------------------------*/
  const courseOptions = Array.from(courseMap.keys())

  async function handleClickCourse(course)
  {
    //This isnt cached yet but it pulled the doc ids for a specific course
    setSelectedCourse(course)
    setSearch('')
    const response = await fetch("http://localhost:8000/documents/${course}")
    const docs = await response.json()
    setDocuments(Object.keys(docs))
    setCoursesSidebar(false)
  }
  useEffect(() => {
    const formatCourseName = (courseId) => {
      const parts = String(courseId || '').split('-')
      if (parts.length >= 3) {
        return `${parts[0]} ${parts[1]} - ${parts.slice(2).join('-')}`
      }
      return String(courseId || '')
    }

    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCourseMap(new Map())
        setSelectedCourse('')
        setDocuments([])
        setSelectedDocument('')
        setDisplayCourse('')
        setIsLoadingCourses(false)
        return
      }

      try {
        setIsLoadingCourses(true)
        const db = getFirebaseFirestore()
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        const fetchedCourses = userDoc.exists() ? (userDoc.data()?.courses || []) : []
        const nextCourseMap = new Map()

        fetchedCourses.forEach((course, index) => {
          const rawId = (course?.course_id || course?.courseId || course?.id || '').toString().trim()
          const fallbackName = `Course ${index + 1}`
          const displayName = rawId ? formatCourseName(rawId) : fallbackName
          if (!nextCourseMap.has(displayName)) {
            nextCourseMap.set(displayName, [])
          }
        })

        setCourseMap(nextCourseMap)
        setSelectedCourse((prev) => (nextCourseMap.has(prev) ? prev : ''))
      } catch (error) {
        console.error('Failed to fetch SuperDoc courses:', error)
        setCourseMap(new Map())
        setSelectedCourse('')
      } finally {
        setDocuments([])
        setSelectedDocument('')
        setDisplayCourse('')
        setIsLoadingCourses(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const filteredCourseSearch = (search === '' ? courseOptions : 
                                          courseOptions.filter((value) => value.toLowerCase().includes(search.toLowerCase())))
  const filteredDocumentSearch = (search === '' ? documents :
                                          documents.filter((value) => value.toLowerCase().includes(search.toLowerCase()))
  )

  // Make sure the state variable follows whatever user puts in combobox
  const handleInputChange = (event) => {
    setSearch(event.target.value)
  }

  function handleClickCourse(course) {
    setSelectedCourse(course)
    setSearch('')
    // When the user clicks one of the courses from the sidebar, that course will be selected and its respective documents will show 
    if(courseMap.has(course)) {
      setDocuments(courseMap.get(course))
      setCoursesSidebar(false)
    }
  }
    
  return (
    <div className="min-h-screen max-w-screen bg-cover bg-center overflow-x-hidden justify-center bg-gradient-to-b from-nexus900 to-nexus700">
      
      <StarFieldOverlay count={isMobile ? 150 : 200}/>

      <AnimatePresence>
        {uploadDocumentOpen && (
            <UploadDocModal
            onClose={() => setUploadDocumentOpen(false)}
            />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {updateHeadingOpen && (
            <UpdateHeadingModal
            onClose={() => setUpdateHeadingOpen(false)}
            />
        )}
      </AnimatePresence>

      <motion.div 
          initial={{translateX: 0}} 
          animate={{translateX: isMobile ? 400 : 700}}
          transition={{
                        duration: 2.5,
                        type: "spring",
                        bounce: .4
                      }}>
        <img className="absolute top-12 left-10 scale-80" src='/assets/SuperDocPigeon.svg'/>
      </motion.div>
      { /* ------------------------------- DOC SIDE BAR ------------------------------------ */}
      <motion.div
        className="shadow-md flex flex-col h-screen fixed left-0 top-0 pt-20 overflow-visible z-40 w-[clamp(200px,17%,500px)]"
        transition={{ type: "tween", duration: 0.4 }}
        style={{backgroundImage: 'linear-gradient(#002966, #001433)'}}>

        <AnimatePresence>
            <motion.div
              className="flex-1 overflow-y-auto p-4 custom-scroll scrollable-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}>
                {coursesSideBar ?   
                  <motion.div key={"courses"} initial={{opacity: 0, x: 15}} animate={{opacity: 1, x:0}} transition={{duration: 0.5}}>
                    <h2 className="headingText font-titilliumWeb-semibold text-nexus100">Courses</h2> 
                  </motion.div>                
                  : 
                  <motion.div key={"documents"} className='flex flex-row items-center gap-1' 
                              initial={{opacity: 0, x: 15}} animate={{opacity: 1, x:0}} transition={{duration: 0.5}}>
                    <HiArrowLeft className='cursor-pointer' color='#CCE0FF' size={25} onClick={() => {setCoursesSidebar(true)}}/>
                    <h2 className="headingText font-titilliumWeb-semibold text-nexus100">Documents</h2> 
                  </motion.div>
                }
              
              <div className='w-full flex h-10 bg-nexus900 my-2 items-center rounded-lg focus-within:ring-1 focus-within:ring-nexus600'>
                <input className='flex w-full p-2 focus:outline-none bg-transparent rounded-l-lg placeholder-gray-400 text-nexus100 font-titilliumWeb-semibold'
                      value={search}
                      onChange={handleInputChange}
                      placeholder={coursesSideBar ? 'Search Courses' : 'Search Documents'} />
                <HiSearch className="mr-2" size={25} color='gray'/>
              </div>

              {coursesSideBar ? 
              (<motion.div className="space-y-2 mt-4" key={"coursebuttons"}
                          initial={{opacity: 0, x: 20}} animate={{opacity: 1, x: 0}} transition={{duration: 0.5}}>
                {isLoadingCourses && (
                  <p className='text-nexus100 font-titilliumWeb-regular'>Loading courses...</p>
                )}
                {!isLoadingCourses && filteredCourseSearch.length === 0 && (
                  <p className='text-nexus100 font-titilliumWeb-regular'>
                    {courseOptions.length === 0 ? 'No courses found for your account.' : 'No courses match your search.'}
                  </p>
                )}
                {!isLoadingCourses && filteredCourseSearch.map((course, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}>
                    {/* Course Button */}
                    <button
                      className={`cursor-pointer text-start justify-between flex items-center w-full py-4 px-2 rounded-lg ${selectedCourse == course ? 'bg-nexus800 text-white border border-nexus600' : ''} hover:bg-nexus700 text-nexus100 font-titilliumWeb-semibold hover:text-white transition-colors duration-200`}
                                  onClick={() => handleClickCourse(course)}>
                      <div className='flex-row flex items-center gap-1 min-w-0'>
                        <HiOutlineFolder className="mr-2" size={30}/>
                        {/* Text */}
                        <div className='flex flex-col text-[clamp(0.7rem,1.3vw,2rem)] min-w-0'>
                          <span className='truncate'>
                            {course}
                          </span>
                          <span className='text-gray-400 font-titilliumWeb-regular text-[clamp(0.6rem,0.8vw,1.4rem)] truncate'>
                            {courseMap.get(course)?.length || 0} documents
                          </span>
                        </div>
                      </div>
                      <HiChevronRight className="mr-2" size={30}/>
                    </button>
                  </motion.li>
                ))}
              </motion.div>) :
              (<motion.div className="space-y-2 mt-4" key={"documentbuttons"}
                          initial={{opacity: 0, x: 20}} animate={{opacity: 1, x: 0}} transition={{duration: 0.5}}>
                {filteredDocumentSearch.map((document, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}>
                    {/* Document Button */}
                    <button
                      className={`cursor-pointer text-start justify-between flex items-center w-full py-4 px-2 rounded-lg hover:bg-nexus700 text-nexus100 ${selectedDocument == document ? 'bg-nexus800 text-white border border-nexus600' : ''} font-titilliumWeb-semibold hover:text-white transition-colors duration-200`}
                                  onClick={() => {
                                    setSelectedDocument(document)
                                    setDisplayCourse(selectedCourse)
                                  }}>
                      <div className='flex-row flex items-center gap-1 min-w-0'>
                        <HiOutlineDocumentText className="mr-2 w-[17%]" size={30}/>
                        {/* Text */}
                        <div className='flex flex-col text-[clamp(1.0rem,1.3vw,2rem)] min-w-0'>
                          <span className='truncate'>
                            {document}
                          </span>
                          <span className='text-gray-400 font-titilliumWeb-regular text-[clamp(0.8rem,0.8vw,1.4rem)] truncate'>
                            5 Days Ago
                          </span>
                        </div>
                      </div>
                    </button>
                  </motion.li>
                ))}
              </motion.div>
              )}
            </motion.div>
          
        </AnimatePresence>
        <motion.div
          className="p-4 mb-2 mt-auto space-y-2"
          initial={{ opacity: 1 }}
          animate={{ opacity:  1 }}
          transition={{ duration: 0.3 }}
        >
          <Button text={"Upload Document"} icon={<HiUpload color='white' size={20}/>} onClick={() => {setUploadDocumentOpen(true)}}/>
          <Button text={"Update Heading"} icon={<HiPencil color='white' size={20}/>} onClick={() => setUpdateHeadingOpen(true)}/>

        </motion.div>
      </motion.div>
      {/* ---------------------------------- MAIN CONTENT ------------------------------------ */}
      <div className={`flex h-full w-full flex-col items-end px-10`}>
        <AnimatePresence>
          <motion.div transition={{duration: 0.4}}
                      className={`w-full h-full mt-20 z-30 pl-[clamp(200px,17%,500px)]`}>

      {/* ----------------------------- SUPER DOC ----------------------------------- */}
          <h1 className="flex text-3xl font-titilliumWeb-bold pt-4 text-nexus50">
            {selectedDocument == '' ? 'No Document Selected' : selectedDocument }
          </h1>
          <h2 className='flex text-[clamp(0.8rem,1.3vw,2rem)] text-white font-titilliumWeb-regular'>
            SuperDoc - {displayCourse}
          </h2>

          { /*
          <span className="text-gray-400 font-titilliumWeb-regular">
            To make edits to the SuperDoc, link your Google Account in {' '}
            <Link to="/settings" className='hover:underline text-gray-300'>
              Settings.
            </Link>
          </span>
          */ }

          <div className={`flex flex-col p-4 h-full w-[clamp(300px,100%,full)] max-h-[685px] bg-nexus900 py-10 mt-2 rounded-md items-center justify-center`}>
            <h1 className="flex text-lg font-titilliumWeb-regular text-white text-center w-full justify-center mx-4">
                There is currently no document uploaded for this unit.
            </h1>
            <div className='w-1/2 mt-4 flex'>
              <Button fullWidth={"w-[200px]"} icon={<HiUpload color='white'/>} text={'Upload Document'}/>
            </div>
          </div>
          </motion.div>
      {/* ---------------------------------------------------------------------------------- */}

        </AnimatePresence>
      </div>
    </div>
  )
}

export default SuperDoc