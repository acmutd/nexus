import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiChevronLeft, HiChevronRight, HiClipboardList, HiCalculator, HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import { getFirebaseAuth, getFirebaseFirestore } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const GradeCalculatorSidebar = ({ onToggle, onNewCalculation, userCourses: propUserCourses }) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userCourses, setUserCourses] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

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

  const handleNewCalculationClick = () => {
    if (onNewCalculation) {
      onNewCalculation();
    } else {
      navigate('/grade-calculator');
    }
  };

  const handleCourseSelect = (courseId) => {
    navigate(`/grade-history/${courseId}`);
    setIsDropdownOpen(false);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    onToggle(!isCollapsed);
    if (!isCollapsed) {
      setIsDropdownOpen(false);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const sidebarVariants = {
    expanded: { width: 256 },
    collapsed: { width: 64 },
  };

  return (
    <motion.aside 
      className="bg-gradient-to-br from-nexus-blue-800 via-nexus-blue-900 to-nexus-blue-700 shadow-md flex flex-col h-screen fixed left-0 top-0 pt-16 overflow-visible z-40"
      initial="expanded"
      animate={isCollapsed ? "collapsed" : "expanded"}
      variants={sidebarVariants}
      transition={{ type: "tween", duration: 0.4 }}
    >
      <button
        onClick={toggleSidebar}
        className="absolute top-20 -right-6 bg-nexus-blue-600 text-white p-2 rounded-r-md z-50 shadow-md"
      >
        {isCollapsed ? <HiChevronRight size={20} /> : <HiChevronLeft size={20} />}
      </button>
      
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            className="flex-1 overflow-y-auto p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-nexus-blue-100 mb-4">Grade Calculator</h2>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-nexus-blue-200 mb-2">Quick Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={handleNewCalculationClick}
                  className="flex items-center w-full p-2 rounded hover:bg-nexus-blue-700 text-nexus-blue-200 hover:text-white transition-colors duration-200"
                >
                  <HiCalculator className="mr-2" />
                  New Calculation
                </button>
                
                <div className="relative">
                  <button 
                    onClick={toggleDropdown}
                    className="flex items-center justify-between w-full p-2 rounded hover:bg-nexus-blue-700 text-nexus-blue-200 hover:text-white transition-colors duration-200"
                  >
                    <div className="flex items-center">
                      <HiClipboardList className="mr-2" />
                      Grade History
                    </div>
                    {isDropdownOpen ? <HiChevronUp /> : <HiChevronDown />}
                  </button>
                  
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-1 bg-nexus-blue-800 bg-opacity-50 rounded border border-nexus-blue-600 overflow-hidden"
                      >
                        {coursesToUse.length > 0 ? (
                          coursesToUse.map((course, index) => (
                            <button
                              key={course.uniqueKey || `sidebar-course-${index}`}
                              onClick={() => handleCourseSelect(course.courseId)}
                              className="w-full text-left px-3 py-2 text-sm text-nexus-blue-200 hover:bg-nexus-blue-700 hover:text-white transition-colors duration-200"
                            >
                              {course.displayName}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-nexus-blue-300">
                            No courses found
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCollapsed && (
          <motion.div
            className="flex-1 pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center space-y-4">
              <button 
                onClick={handleNewCalculationClick}
                className="p-3 rounded-full hover:bg-nexus-blue-700 text-nexus-blue-200 hover:text-white transition-colors duration-200"
                title="New Calculation"
              >
                <HiCalculator size={20} />
              </button>
              
              <div className="relative group">
                <button 
                  className="p-3 rounded-full hover:bg-nexus-blue-700 text-nexus-blue-200 hover:text-white transition-colors duration-200"
                  title="Grade History"
                >
                  <HiClipboardList size={20} />
                </button>
                
                <div className="absolute left-full ml-2 top-0 bg-nexus-blue-800 bg-opacity-95 border border-nexus-blue-600 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-48">
                  <div className="p-2">
                    <div className="text-white text-sm font-medium mb-2 px-2">Select Course:</div>
                    {coursesToUse.length > 0 ? (
                      coursesToUse.map((course, index) => (
                        <button
                          key={course.uniqueKey || `tooltip-course-${index}`}
                          onClick={() => handleCourseSelect(course.courseId)}
                          className="w-full text-left px-2 py-1 text-sm text-nexus-blue-200 hover:bg-nexus-blue-700 hover:text-white transition-colors duration-200 rounded"
                        >
                          {course.displayName}
                        </button>
                      ))
                    ) : (
                      <div className="px-2 py-1 text-sm text-nexus-blue-300">
                        No courses found
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
};

export default GradeCalculatorSidebar;