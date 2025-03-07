import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { HiChevronLeft, HiTrash, HiRefresh } from 'react-icons/hi';

const GradeHistory = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseName, setCourseName] = useState('');
  const [error, setError] = useState(null);
  const [selectedHistoryDetails, setSelectedHistoryDetails] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  
    
  useEffect(() => {
    // Mock function to simulate API calls with dummy data
    const fetchCourseInfoWithDummyData = async () => {
      try {
        // Simulate API loading time
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Dummy course data
        setCourseName('CS 1337: Computer Science II');
        
        // Dummy histories data
        const dummyHistories = [
          {
            id: '1',
            title: 'Midterm Projection',
            timestamp: new Date('2025-02-15').toISOString(),
            overallGrade: 87.5
          },
          {
            id: '2',
            title: 'After Assignment 3',
            timestamp: new Date('2025-02-28').toISOString(),
            overallGrade: 84.2
          },
          {
            id: '3',
            title: 'Final Grade Estimate',
            timestamp: new Date('2025-03-01').toISOString(),
            overallGrade: 91.0
          },
          {
            id: '4',
            title: 'Pre-Final Exam Calculation',
            timestamp: new Date('2025-03-04').toISOString(),
            overallGrade: 88.7
          }
        ];
        
        setHistories(dummyHistories);
      } catch (err) {
        console.error('Error with dummy data:', err);
        setError('Failed to load grade histories. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourseInfoWithDummyData();
  }, [courseId, navigate]);

  const fetchHistoryDetails = async (historyId) => {
    // Simulate API call with dummy data
    try {
      // Simulate API loading time
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Dummy history details based on ID
      const dummyDetails = {
        id: historyId,
        title: histories.find(h => h.id === historyId)?.title || 'Unknown Calculation',
        timestamp: histories.find(h => h.id === historyId)?.timestamp || new Date().toISOString(),
        overallGrade: histories.find(h => h.id === historyId)?.overallGrade || 85.0,
        desiredGrade: 90,
        requiredGrade: 93.5,
        categories: [
          {
            name: 'Assignments',
            weight: 30,
            grade: 88.5,
            assignments: [
              { assignment: 'Assignment 1', grade: 92, weight: 25 },
              { assignment: 'Assignment 2', grade: 85, weight: 25 },
              { assignment: 'Assignment 3', grade: 88, weight: 25 },
              { assignment: 'Assignment 4', grade: 89, weight: 25 }
            ]
          },
          {
            name: 'Midterm Exams',
            weight: 40,
            grade: 84.0,
            assignments: [
              { assignment: 'Midterm 1', grade: 82, weight: 50 },
              { assignment: 'Midterm 2', grade: 86, weight: 50 }
            ]
          },
          {
            name: 'Final Exam',
            weight: 30,
            grade: 0, // Not taken yet
            assignments: []
          }
        ]
      };
      
      // Add some variation based on the history ID
      if (historyId === '2') {
        dummyDetails.categories[0].grade = 82.0;
        dummyDetails.categories[0].assignments[2].grade = 75;
        dummyDetails.requiredGrade = 97.8;
      } else if (historyId === '3') {
        dummyDetails.categories[0].grade = 93.0;
        dummyDetails.categories[1].grade = 89.0;
        dummyDetails.categories[0].assignments[3].grade = 95;
        dummyDetails.requiredGrade = 87.0;
      } else if (historyId === '4') {
        dummyDetails.categories[0].grade = 91.5;
        dummyDetails.categories[1].grade = 87.0;
        dummyDetails.requiredGrade = 88.5;
      }
      
      setSelectedHistoryDetails(dummyDetails);
    } catch (err) {
      console.error('Error fetching history details:', err);
      setError('Failed to load history details.');
    }
  };

  const handleDeleteHistory = async (historyId) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, it in 300));
      
      // Remove from local state
      setHistories(histories.filter(h => h.id !== historyId));
      if (selectedHistoryDetails?.id === historyId) {
        setSelectedHistoryDetails(null);
      }
      setConfirmDelete(null);
    } catch (err) {
      console.error('Error deleting history:', err);
      setError('Failed to delete history.');
    }
  };

  const loadInCalculator = (historyId) => {
    navigate(`/grade-calculator/${courseId}`, { 
      state: { historyId } 
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center bg-gradient-to-br from-nexus-blue-800 via-nexus-blue-900 to-nexus-blue-700">
        <div className="text-white text-xl">Loading grade histories...</div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-nexus-blue-800 via-nexus-blue-900 to-nexus-blue-700 pt-16">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          
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
            <div className="bg-black bg-opacity-30 border-2 border-nexus-blue-400 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl text-white font-bold">Saved Grades</h2>
                <button 
                  onClick={() => navigate(`/grade-calculator/${courseId}`)}
                  className="bg-nexus-blue-300 text-white py-1 px-3 rounded hover:bg-nexus-blue-100 hover:bg-nexus-blue-400"
                >
                  New Calculation
                </button>
              </div>
              
              {histories.length === 0 ? (
                <p className="text-nexus-blue-300">No saved grade histories found.</p>
              ) : (
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {histories.map(history => (
                    <li 
                      key={history.id}
                      className={`p-3 rounded cursor-pointer transition-colors ${
                        selectedHistoryDetails?.id === history.id 
                          ? 'bg-nexus-blue-700 text-white' 
                          : 'bg-nexus-blue-800 text-nexus-blue-300 hover:bg-nexus-blue-700 hover:text-white'
                      }`}
                      onClick={() => fetchHistoryDetails(history.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{history.title}</div>
                          <div className="text-sm opacity-75">
                            {new Date(history.timestamp).toLocaleDateString()} - Grade: {history.overallGrade}%
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(history.id);
                            }}
                            className="text-nexus-blue-300 hover:text-red-400"
                          >
                            <HiTrash size={18} />
                          </button>
                          
                          {confirmDelete === history.id && (
                            <div className="absolute mt-6 p-2 bg-nexus-blue-600 rounded shadow-lg z-10">
                              <p className="text-white text-sm mb-2">Delete this history?</p>
                              <div className="flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteHistory(history.id);
                                  }}
                                  className="bg-red-700 text-white text-xs py-1 px-2 rounded transition duration-200 hover:bg-red-800"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDelete(null);
                                  }}
                                  className="bg-nexus-blue-300 text-white text-xs py-1 px-2 rounded transition duration-300 hover:bg-nexus-blue-400"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
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
            className="lg:col-span-2"
          >
            {selectedHistoryDetails ? (
              <div className="bg-black bg-opacity-30 border-2 border-nexus-blue-400 rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl text-white font-bold">{selectedHistoryDetails.title}</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => loadInCalculator(selectedHistoryDetails.id)}
                      className="flex items-center bg-nexus-blue-300 text-white py-2 px-4 rounded hover:bg-nexus-blue-100 hover:bg-nexus-blue-400"
                    >
                      <HiRefresh className="mr-2" />
                      Load in Calculator
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-nexus-blue-800 bg-opacity-50 p-4 rounded">
                    <h3 className="text-xl text-white font-semibold mb-2">Overall Results</h3>
                    <div className="space-y-2">
                      <p className="text-white">
                        <span className="font-medium">Current Grade:</span> {selectedHistoryDetails.overallGrade}%
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
                    </div>
                  </div>
                  
                  {/* possoble bar chart
                  <div className="bg-nexus-blue-800 bg-opacity-50 p-4 rounded">
                <h3 className="text-xl text-white font-semibold mb-2">Grade Distribution</h3>
                <div className="h-40 flex flex-col justify-center space-y-3">
                    {selectedHistoryDetails.categories.map((category, idx) => (
                    <div key={idx} className="flex flex-col">
                        <div className="flex justify-between text-xs mb-1">
                        <span className="text-white">{category.name} ({category.weight}%)</span>
                        <span className="text-nexus-blue-300">{category.grade}%</span>
                        </div>
                        <div className="w-full bg-nexus-blue-900 rounded-full h-2.5">
                        <div 
                            className="bg-nexus-blue-300 h-2.5 rounded-full" 
                            style={{ 
                            width: `${category.grade}%`,
                            opacity: category.weight / 100 * 1.5 + 0.5
                            }}
                        ></div>
                        </div>
                        <div className="text-xs text-nexus-blue-400 mt-1">
                        Contribution: {((category.grade * category.weight) / 100).toFixed(1)}%
                        </div>
                    </div>
                    ))}
                </div>
                </div>*/}
                </div>
                
                <h3 className="text-xl text-white font-semibold mb-3">Categories</h3>
                <div className="space-y-4">
                  {selectedHistoryDetails.categories.map((category, index) => (
                    <div key={index} className="bg-nexus-blue-700 p-4 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-lg text-white font-medium">
                          {category.name} ({category.weight}%)
                        </h4>
                        <span className="bg-nexus-blue-500 text-white px-2 py-1 rounded text-sm">
                          Grade: {category.grade}
                        </span>
                      </div>
                      
                      {category.assignments.length > 0 && (
                        <div className="mt-2">
                          <h5 className="text-sm text-nexus-blue-300 mb-1">Assignments</h5>
                          <div className="bg-nexus-blue-800 rounded p-2">
                            <div className="grid grid-cols-3 text-xs text-nexus-blue-300 mb-1">
                              <div>Name</div>
                              <div>Grade</div>
                              <div>Weight</div>
                            </div>
                            {category.assignments.map((assignment, idx) => (
                              <div key={idx} className="grid grid-cols-3 text-white text-sm py-1 border-t border-nexus-blue-600">
                                <div>{assignment.assignment || 'Unnamed'}</div>
                                <div>{assignment.grade || 'N/A'}%</div>
                                <div>{assignment.weight || 'N/A'}%</div>
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
              <div className="h-full flex items-center justify-center bg-black bg-opacity-30 border-2 border-nexus-blue-400 rounded-lg p-6">
                <p className="text-nexus-blue-300 text-xl">
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