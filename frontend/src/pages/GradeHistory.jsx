import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { HiChevronLeft, HiTrash, HiRefresh, HiPencil } from 'react-icons/hi';
import { getFirebaseAuth, getFirebaseFirestore } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import pigeonIcon from '../assets/gradeistoryPigeon.svg'

const GradeHistory = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseName, setCourseName] = useState('');
  const [error, setError] = useState(null);
  const [selectedHistoryDetails, setSelectedHistoryDetails] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        if (courseId) {
          fetchCourseInfo(user.uid);
          fetchGradeHistories(user.uid);
        }
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [courseId, navigate]);

  const fetchCourseInfo = async (uid) => {
    try {
      const db = getFirebaseFirestore();
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const courses = userData.courses || [];
        const course = courses.find(c => c.course_id === courseId);
        
        if (course) {
          const parts = course.course_id.split('-');
          if (parts.length >= 3) {
            const courseCode = parts[0];
            const courseNumber = parts[1];
            const instructor = parts.slice(2).join('-');
            setCourseName(`${courseCode} ${courseNumber} - ${instructor}`);
          } else {
            setCourseName(course.course_id);
          }
        } else {
          setCourseName('Course Not Found');
        }
      }
    } catch (error) {
      console.error('Error fetching course info:', error);
      setError('Failed to load course information.');
    }
  };

  const fetchGradeHistories = async (uid) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3000/api/grades/getGradesByCourse/${uid}/${courseId}`);
      setHistories(response.data);
    } catch (error) {
      console.error('Error fetching grade histories:', error);
      setError('Failed to load grade histories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryDetails = async (historyId) => {
    try {
      const history = histories.find(h => (h.id || `history-${histories.indexOf(h)}`) === historyId);
      if (history) {
        setSelectedHistoryDetails(history);
      }
    } catch (error) {
      console.error('Error fetching history details:', error);
      setError('Failed to load history details.');
    }
  };

  const handleDeleteHistory = async (historyId) => {
    try {
      await axios.delete(`http://localhost:3000/api/grades/deleteGrade/${currentUser.uid}/${courseId}/${historyId}`);
      
      setHistories(histories.filter(h => (h.id || `history-${histories.indexOf(h)}`) !== historyId));
      if (selectedHistoryDetails?.id === historyId) {
        setSelectedHistoryDetails(null);
      }
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting history:', error);
      setError('Failed to delete history.');
    }
  };

  const handleEditHistory = (historyId) => {
    navigate(`/grade-calculator?edit=${historyId}&courseId=${courseId}`);
  };

  const loadInCalculator = (historyId) => {
    navigate(`/grade-calculator`, { 
      state: { historyId, courseId } 
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center bg-gradient-to-br from-nexus800 via-nexus900 to-nexus700">
        <div className="text-white text-xl">Loading grade histories...</div>
      </div>
    );
  }

  return (
      <div className="min-h-screen flex items-center justify-center bg-blue-950 bg-cover bg-center bg-fixed"
           style={{ backgroundImage: "url('/assets/GradeHistoryBG.svg')", fontFamily: "titilliumWeb-Regular" }}>
      <div className="container mx-auto px-4 py-8 mt-20">
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <button
            onClick={() => navigate('/grade-calculator')}
            className="flex items-center text-nexus200 hover:text-white mb-4"
          >
            <HiChevronLeft className="mr-1" />
            Back to Calculator
          </button>
          
          <h1 className="text-3xl font-bold text-white mt-4">
            Grade History for {courseName}
          </h1>
        </motion.div>

        {error && (
          <div className="bg-red-500 text-white p-4 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="bg-gradient-to-b from-nexus900 via-nexus800 to-nexus900 bg-opacity-30 border-2 border-nexus400 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl text-white font-bold">Saved Grades</h2>
                <button 
                  onClick={() => navigate('/grade-calculator')}
                  className="bg-nexus300 text-white py-1 px-3 rounded hover:bg-nexus400"
                >
                  New Calculation
                </button>
              </div>
              
              {histories.length === 0 ? (
                <p className="text-nexus300">No saved grade histories found for this course.</p>
              ) : (
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {histories.map((history, index) => (
                    <li 
                      key={history.id || `history-${index}`}
                      className={`p-3 rounded cursor-pointer transition duration-200 ${
                        selectedHistoryDetails?.id === (history.id || `history-${index}`)
                          ? 'bg-nexus500 text-white'
                          : 'bg-nexus700 text-nexus100 hover:bg-nexus600'
                      }`}
                      onClick={() => fetchHistoryDetails(history.id || `history-${index}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold">{history.saveTitle}</h3>
                          <p className="text-sm mt-1">
                            Current: {history.currentGrade}% | Desired: {history.desiredGrade}%
                          </p>
                          <p className="text-xs mt-1">
                            {new Date(history.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      {confirmDelete === (history.id || `history-${index}`) ? (
                        <div className="mt-2 bg-nexus800 p-2 rounded">
                          <p className="text-sm mb-2">Are you sure you want to delete this grade history?</p>
                          <div className="flex justify-between">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteHistory(history.id || `history-${index}`);
                              }}
                              className="cursor-pointer bg-red-700 text-white text-md py-1 px-2 rounded transition duration-200 hover:bg-red-800"
                            >
                              Delete
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDelete(null);
                              }}
                              className="cursor-pointer bg-nexus300 text-white text-md py-1 px-2 rounded transition duration-300 hover:bg-nexus400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditHistory(history.id || `history-${index}`);
                            }}
                            className="flex-1 bg-nexus800 text-white py-1 px-2 rounded text-sm transition duration-200 hover:bg-900"
                          >
                            <HiPencil className="inline mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(history.id || `history-${index}`);
                            }}
                            className="flex-1 bg-red-700 text-white py-1 px-2 rounded text-sm transition duration-200 hover:bg-red-800"
                          >
                            <HiTrash className="inline mr-1" />
                            Delete
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-2 "
          >
            
            {selectedHistoryDetails ? (
              <div className="bg-nexus900 bg-opacity-30 border-2 border-nexus400 rounded-lg p-6 relative">
                <img className="absolute -top-34 right-0 w-[175px] h-[175px]" src="/assets/GradeHistoryPigy.svg"/>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl text-white font-bold">{selectedHistoryDetails.saveTitle}</h2>
                  <div className="flex space-x-2">
                    
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-nexus800 bg-opacity-50 p-4 rounded">
                    <h3 className="text-xl text-white font-semibold mb-2">Overall Results</h3>
                    <div className="space-y-2">
                      <p className="text-white">
                        <span className="font-medium">Current Grade:</span> {selectedHistoryDetails.currentGrade}%
                      </p>
                      <p className="text-white">
                        <span className="font-medium">Desired Grade:</span> {selectedHistoryDetails.desiredGrade || 'N/A'}%
                      </p>
                      <p className="text-white">
                        <span className="font-medium">Required Grade on Remaining:</span> {selectedHistoryDetails.requiredGrade || 'Not possible'}%
                      </p>
                      <p className="text-white">
                        <span className="font-medium">Date Created:</span> {new Date(selectedHistoryDetails.timestamp).toLocaleString()}
                      </p>
                      {selectedHistoryDetails.lastModified && (
                        <p className="text-white">
                          <span className="font-medium">Last Modified:</span> {new Date(selectedHistoryDetails.lastModified).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-nexus800 bg-opacity-50 p-4 rounded">
                    <h3 className="text-xl text-white font-semibold mb-2">Grade Distribution</h3>
                    <div className="space-y-4">
                      {selectedHistoryDetails.categories.map((category, idx) => {
                        let gradeValue = 0;
                        if (typeof category.categoryGrade === 'string') {
                          gradeValue = parseFloat(category.categoryGrade.replace('%', '')) || 0;
                        } else {
                          gradeValue = parseFloat(category.categoryGrade) || 0;
                        }
                        
                        const circumference = 2 * Math.PI * 30;
                        const strokeDasharray = `${(gradeValue / 100) * circumference} ${circumference}`;
                        const colors = ['#60A5FA', '#34D399', '#F59E0B', '#EF4444', '#8B5CF6'];
                        
                        return (
                          <div key={idx} className="flex items-center space-x-4">
                            <div className="relative w-16 h-16">
                              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 70 70">
                                <circle
                                  cx="35"
                                  cy="35"
                                  r="30"
                                  stroke="#1E3A8A"
                                  strokeWidth="6"
                                  fill="transparent"
                                  opacity="0.3"
                                />
                                <circle
                                  cx="35"
                                  cy="35"
                                  r="30"
                                  stroke={colors[idx % colors.length]}
                                  strokeWidth="6"
                                  fill="transparent"
                                  strokeDasharray={strokeDasharray}
                                  strokeLinecap="round"
                                  className="transition-all duration-1000"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold text-white">{gradeValue.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="text-white font-medium">{category.categoryName}</div>
                              <div className="text-nexus300 text-sm">Weight: {category.categoryWeight}%</div>
                              <div className="text-nexus400 text-xs">
                                Contribution: {((gradeValue * parseFloat(category.categoryWeight)) / 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <h3 className="text-xl text-white font-semibold mb-3">Categories</h3>
                <div className="space-y-4">
                  {selectedHistoryDetails.categories.map((category, index) => (
                    <div key={index} className="bg-nexus700 p-4 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-lg text-white font-medium">
                          {category.categoryName} ({category.categoryWeight}%)
                        </h4>
                        <span className="bg-nexus500 text-white px-2 py-1 rounded text-sm">
                          Grade: {category.categoryGrade}
                        </span>
                      </div>
                      
                      {category.assignments && category.assignments.length > 0 && (
                        <div className="mt-2">
                          <h5 className="text-sm text-nexus300 mb-1">Assignments</h5>
                          <div className="bg-nexus800 rounded p-2">
                            <div className="grid grid-cols-3 text-xs text-nexus300 mb-1">
                              <div>Name</div>
                              <div>Grade</div>
                              <div>Weight</div>
                            </div>
                            {category.assignments.map((assignment, idx) => (
                              <div key={idx} className="grid grid-cols-3 text-white text-sm py-1 border-t border-nexus600">
                                <div>{assignment.assignmentName || 'Unnamed'}</div>
                                <div>{assignment.grade || 'N/A'}</div>
                                <div>{assignment.weight || 'N/A'}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-gradient-to-b from-nexus900 via-nexus800 to-nexus900 bg-opacity-30 border-2 border-nexus400 rounded-lg p-6 relative">
                <img className="absolute -top-34 right-0 w-[175px] h-[175px]" src="/assets/GradeHistoryPigy.svg"/>
                <p className="text-nexus300 text-xl">
                  Select a grade history to view details
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default GradeHistory;