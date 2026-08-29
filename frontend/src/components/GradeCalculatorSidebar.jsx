import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HiChevronLeft, HiChevronRight, HiCalculator, HiMenu, HiEye, HiX, HiChevronRight as HiChevronRightSmall } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import { getFirebaseAuth, getFirebaseFirestore } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useMobile } from '../context/mobileContext';
import axios from 'axios';

const GradeCalculatorSidebar = ({ onToggle, onNewCalculation, userCourses: propUserCourses, refreshTrigger, lastSavedGrade }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });
  const [userCourses, setUserCourses] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [hoveredCourseId, setHoveredCourseId] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [courseHistories, setCourseHistories] = useState({});
  const [loadingHistories, setLoadingHistories] = useState({});
  const { isMobile } = useMobile();

  const coursesToUse = propUserCourses && propUserCourses.length > 0 ? propUserCourses : userCourses;

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchUserCourses(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (onToggle) {
      onToggle(isCollapsed);
    }
  }, [isCollapsed, onToggle]);

  // OPTIMISTIC UPDATE: Add new grade immediately without waiting for fetch
  useEffect(() => {
    if (lastSavedGrade && currentUser) {
      const { courseId, gradeData } = lastSavedGrade;
      
      // Immediately add the new grade to the UI
      setCourseHistories(prev => {
        const existingHistories = prev[courseId] || [];
        
        // Check if this is an update (grade already exists)
        const existingIndex = existingHistories.findIndex(h => h.id === gradeData.id);
        
        let updatedHistories;
        if (existingIndex >= 0) {
          // Update existing grade
          updatedHistories = [...existingHistories];
          updatedHistories[existingIndex] = gradeData;
        } else {
          // Add new grade at the beginning (most recent)
          updatedHistories = [gradeData, ...existingHistories];
        }
        
        return {
          ...prev,
          [courseId]: updatedHistories
        };
      });
      
      // Then fetch to ensure data is synced (with shorter delay)
      setTimeout(() => {
        fetchCourseHistory(courseId, true);
      }, 200);
    }
  }, [lastSavedGrade]);

  // Original refresh trigger (as backup)
  useEffect(() => {
    if (refreshTrigger && currentUser) {
      // Only clear and refetch if we don't have lastSavedGrade (fallback)
      if (!lastSavedGrade) {
        setCourseHistories({});
        
        const activeCourse = selectedCourseId || hoveredCourseId;
        if (activeCourse) {
          fetchCourseHistory(activeCourse, true);
        }
      }
    }
  }, [refreshTrigger]);

  const fetchUserCourses = async (uid) => {
    try {
      const db = getFirebaseFirestore();
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const courses = userData.courses || [];
        
        const coursesWithIds = courses
          .map((course, index) => {
            const fallbackKey = `course-${index}-${Date.now()}`;
            
            if (!course || !course.course_id || typeof course.course_id !== 'string') {
              console.log('Invalid course at index', index, ':', course);
              return {
                courseCode: 'Unknown',
                courseNumber: 'Unknown',
                instructor: 'Unknown',
                courseId: fallbackKey,
                displayName: `Unknown Course ${index + 1}`,
                uniqueKey: fallbackKey
              };
            }

            const parts = course.course_id.split('-');
            
            if (parts.length >= 3) {
              const courseCode = parts[0] || 'Unknown';
              const courseNumber = parts[1] || 'Unknown';
              const instructor = parts.slice(2).join('-') || 'Unknown';
              
              return {
                courseCode,
                courseNumber,
                instructor,
                courseId: course.course_id,
                displayName: `${courseCode} ${courseNumber} - ${instructor}`,
                uniqueKey: `${course.course_id}-${index}`
              };
            } else {
              return {
                courseCode: 'Unknown',
                courseNumber: 'Unknown',
                instructor: 'Unknown',
                courseId: course.course_id,
                displayName: course.course_id,
                uniqueKey: `${course.course_id}-${index}`
              };
            }
          });
        
        setUserCourses(coursesWithIds);
      }
    } catch (error) {
      console.error('Error fetching user courses:', error);
    }
  };

  const fetchCourseHistory = async (courseId, forceRefresh = false) => {
    // Skip if already loaded and not forcing refresh
    if (!forceRefresh && (courseHistories[courseId] || loadingHistories[courseId])) {
      return;
    }

    if (!currentUser) {
      return;
    }

    setLoadingHistories(prev => ({ ...prev, [courseId]: true }));

    try {
      // Use your existing API endpoint
      const response = await axios.get(
        `/api/grades/getGradesByCourse/${currentUser.uid}/${courseId}`
      );
      
      const histories = response.data || [];
      
      // Map the histories to the format we need
      const formattedHistories = histories.map(grade => ({
        id: grade.id,
        title: grade.saveTitle || 'Untitled Calculation',
        timestamp: grade.timestamp,
        courseId: grade.courseId,
        currentGrade: grade.currentGrade,
        desiredGrade: grade.desiredGrade,
        requiredGrade: grade.requiredGrade,
        categories: grade.categories
      }));

      setCourseHistories(prev => ({
        ...prev,
        [courseId]: formattedHistories
      }));
    } catch (error) {
      console.error('Error fetching course history:', error);
      // Set empty array on error
      setCourseHistories(prev => ({
        ...prev,
        [courseId]: []
      }));
    } finally {
      setLoadingHistories(prev => ({ ...prev, [courseId]: false }));
    }
  };

  const handleCourseHover = (courseId) => {
    setHoveredCourseId(courseId);
    if (!courseHistories[courseId]) {
      fetchCourseHistory(courseId);
    }
  };

  const handleCourseClick = (courseId) => {
    if (selectedCourseId === courseId) {
      setSelectedCourseId(null);
    } else {
      setSelectedCourseId(courseId);
      if (!courseHistories[courseId]) {
        fetchCourseHistory(courseId);
      }
    }
  };

  const handleHistoryClick = (gradeId, courseId) => {
    // Navigate to grade calculator with edit parameters
    navigate(`/grade-calculator?edit=${gradeId}&courseId=${courseId}`);
  };

  const handleViewAllHistories = (courseId) => {
    navigate(`/grade-history/${courseId}`);
  };

  const handleNewCalculationClick = () => {
    if (onNewCalculation) {
      onNewCalculation();
    } else {
      // Clear query params for new calculation
      navigate('/grade-calculator');
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    onToggle(!isCollapsed);
    if (!isCollapsed) {
      setHoveredCourseId(null);
      setSelectedCourseId(null);
    }
  };
  const MOBILE_SIDEBAR_W = 185; 
  const sidebarVariants = {
  expanded: { width: isMobile ? MOBILE_SIDEBAR_W : 256 },
  collapsed: { width: 64 },
};

  const activeCourseId = selectedCourseId || hoveredCourseId;
  const showHistoryPanel = activeCourseId && !isCollapsed;

  // Helper function to format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  return (
    <>
      {!isCollapsed && isMobile && !showHistoryPanel && (
  <div 
    className='fixed w-screen h-screen backdrop-brightness-50 z-39 inset-0'
    onClick={toggleSidebar}
  />
)}
      
      <motion.aside
        className={`shadow-md flex flex-col h-screen fixed left-0 top-0 pt-16 overflow-visible z-40`}
        initial="expanded"
        animate={isCollapsed ? "collapsed" : "expanded"}
        variants={sidebarVariants}
        transition={{ type: "tween", duration: 0.4 }}
        style={{
          backgroundImage: isMobile && isCollapsed 
            ? 'linear-gradient(transparent)' 
            : isCollapsed 
            ? 'linear-gradient(#002966, #002966)' 
            : 'linear-gradient(#002966, #001433)'
        }}
      >
        {!isMobile && !showHistoryPanel && (
          <button
            onClick={toggleSidebar}
            className="absolute top-24 -right-6 bg-nexus600 text-white p-2 rounded-r-md z-50 shadow-md cursor-pointer"
          >
            {isCollapsed ? <HiChevronRight size={20} /> : <HiChevronLeft size={20} />}
          </button>
        )}
        
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="flex flex-col flex-1 overflow-y-auto p-4 overflow-x-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex-1">
                <h2 className={`font-bold text-nexus100 my-3 ${isMobile ? 'text-lg px-8' : 'text-2xl my-4'}`}>
                  {isMobile ? 'Grades' : 'Grade Calculator'}
                </h2>
                
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-nexus300 mb-3 px-2">Your Courses</h3>
                  
                  <div className="space-y-1">
                    {coursesToUse.length > 0 ? (
                      coursesToUse.map((course, index) => (
                        <div
                          key={course.uniqueKey || `sidebar-course-${index}`}
                          className="relative"
                          onMouseEnter={() => !isMobile && handleCourseHover(course.courseId)}
                          onMouseLeave={() => !isMobile && setHoveredCourseId(null)}
                        >
                          <button
                            onClick={() => handleCourseClick(course.courseId)}
                            className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-between ${
                              selectedCourseId === course.courseId
                                ? 'bg-nexus500 text-white'
                                : hoveredCourseId === course.courseId
                                ? 'bg-nexus600 text-white'
                                : 'text-nexus200 hover:bg-nexus700 hover:text-white'
                            }`}
                          >
                            <span className="truncate">{course.displayName}</span>
                            {(selectedCourseId === course.courseId || hoveredCourseId === course.courseId) && (
                              <HiChevronRightSmall className="flex-shrink-0 ml-2" size={16} />
                            )}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-nexus300">
                        No courses found
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-4 left-0 right-0 px-2">
                <button
                  onClick={handleNewCalculationClick}
                  className={`cursor-pointer w-full rounded-lg bg-nexus600 hover:bg-nexus500 text-white font-semibold transition-colors duration-200
                    ${isMobile ? 'py-2 px-2 text-xs' : 'p-3'}
                  `}
                >
                  {isMobile ? (
                    <div className="flex items-center gap-2 justify-center">
                      <HiCalculator size={20} className="flex-shrink-0" />
                      <span className="flex flex-col leading-tight text-left">
                        <span>Add New</span>
                        <span>Calculation</span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <HiCalculator className="mr-2" />
                      Add New Calculation
                    </div>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          <div className="absolute mt-4">
            {isMobile && (
              <button 
                className="p-3 rounded-full cursor-pointer"
                title="Toggle Menu"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                <HiMenu className='text-nexus100' size={30} />
              </button>
            )}
          </div>
        </AnimatePresence>
      </motion.aside>

      {/* History Panel */}
      <AnimatePresence>
        {showHistoryPanel && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className={`fixed top-16 h-[calc(100vh-4rem)] bg-nexus700 shadow-xl overflow-visible z-30
              ${isMobile ? 'left-[175px] w-[calc(100vw-175px)]' : 'left-64 w-80'}
            `}
            onMouseEnter={() => !isMobile && setHoveredCourseId(activeCourseId)}
            onMouseLeave={() => !isMobile && !selectedCourseId && setHoveredCourseId(null)}
          >
            {!isMobile && (
              <button
                onClick={toggleSidebar}
                className="absolute top-8 -right-6 bg-nexus600 text-white p-2 rounded-r-md z-50 shadow-md cursor-pointer"
              >
                {isCollapsed ? <HiChevronRight size={20} /> : <HiChevronLeft size={20} />}
              </button>
            )}
            <div className="p-4 h-full overflow-y-auto relative">
              {isMobile &&(
              <button
                onClick={() => {
                  setSelectedCourseId(null);
                  setHoveredCourseId(null);
                }}
                className="absolute top-5 right-1.5 text-nexus300 hover:text-white transition-colors cursor-pointer"
                title="Close History"
              >
                <HiX size={20} />
              </button>
                  )}
              <h3 className="text-lg font-semibold text-white mb-1">
                Calculation History
              </h3>
              <p className="text-sm text-nexus300 mb-4">
                {coursesToUse.find(c => c.courseId === activeCourseId)?.displayName}
              </p>

              {loadingHistories[activeCourseId] ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : courseHistories[activeCourseId]?.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {courseHistories[activeCourseId].map((history) => (
                    <motion.button
                      key={history.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => handleHistoryClick(history.id, activeCourseId)}
                      className="w-full text-left p-3 rounded-lg bg-nexus600 hover:bg-nexus500 transition-colors duration-200 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate group-hover:text-nexus100">
                            {history.title}
                          </p>
                          {history.timestamp && (
                            <p className="text-xs text-nexus300 mt-1">
                              {formatTimestamp(history.timestamp)}
                            </p>
                          )}
                          {history.currentGrade !== undefined && history.currentGrade !== null && (
                            <p className="text-xs text-nexus200 mt-1">
                              Current: {history.currentGrade}%
                            </p>
                          )}
                        </div>
                        <HiChevronRightSmall 
                          className="flex-shrink-0 ml-2 text-nexus300 group-hover:text-white" 
                          size={20} 
                        />
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-nexus300">
                  <p className="text-sm">No calculations yet</p>
                  <p className="text-xs mt-1">Create your first calculation!</p>
                </div>
              )}

              <div className="pt-4 border-t border-nexus600">
                <button
                  onClick={() => handleViewAllHistories(activeCourseId)}
                  className="w-full flex items-center justify-center p-3 rounded-lg bg-nexus600 hover:bg-nexus500 text-white font-medium transition-colors duration-200"
                >
                  <HiEye className="mr-2" />
                  View All Histories
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GradeCalculatorSidebar;