import React, { useState, useEffect } from "react";
import Modal from '@mui/material/Modal';
import Backdrop from '@mui/material/Backdrop';
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { getFirebaseAuth, getFirebaseFirestore } from '../firebase.js';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import GradeCalculatorSidebar from '../components/GradeCalculatorSidebar.jsx'
import { HiTrash, HiCheckCircle } from 'react-icons/hi'; 
import Fade from "@mui/material/Fade";

const GradeCalculator = () => {
    const makeCategory = () => ({
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
        name: "",
        weight: "",
        assignments: [{ assignment: "", grade: "", weight: "" }]
    });

    const [categories, setCategories] = useState([ makeCategory() ]);
    const [classGrade, setClassGrade] = useState('');
    const [overallGrade, setOverallGrade] = useState(0);
    const [remainingWeight, setRemainingWeight] = useState(100);
    const [categoryGrades, setCategoryGrades] = useState([]);
    const [requiredGrade, setRequiredGrade] = useState(null);
    const [error, setError] = useState('');

    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [saveTitle, setSaveTitle] = useState('');
    const [courses, setCourses] = useState([]);
    const [selectedCourseForSave, setSelectedCourseForSave] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingGradeId, setEditingGradeId] = useState(null);
    
    const [showSuccessNotification, setShowSuccessNotification] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };

    
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
        const loadEditData = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const gradeId = urlParams.get('edit');
            const courseId = urlParams.get('courseId');
            
            if (gradeId && courseId && currentUser) {
                try {
                    const response = await axios.get(
                        `http://localhost:3000/api/grades/getGradesByCourse/${currentUser.uid}/${courseId}`
                    );
                    
                    const gradeToEdit = response.data.find(g => g.id === gradeId);
                    
                    if (gradeToEdit) {
                        setEditMode(true);
                        setEditingGradeId(gradeId);
                        setSelectedCourseForSave(courseId);
                        setSaveTitle(gradeToEdit.saveTitle);
                        setClassGrade(gradeToEdit.desiredGrade);
                        
                        // Reconstruct categories with proper structure
                        const loadedCategories = gradeToEdit.categories.map(cat => ({
                            id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
                            name: cat.categoryName,
                            weight: cat.categoryWeight,
                            assignments: cat.assignments.map(asn => ({
                                assignment: asn.assignmentName,
                                grade: asn.grade,
                                weight: asn.weight
                            }))
                        }));
                        
                        setCategories(loadedCategories);
                    }
                } catch (error) {
                    console.error('Error loading grade for editing:', error);
                    setError('Failed to load grade data for editing');
                }
            }
        };
        
        loadEditData();
    }, [currentUser]);

    const fetchUserCourses = async (uid) => {
        try {
            const db = getFirebaseFirestore();
            const userDoc = await getDoc(doc(db, 'users', uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const userCourses = userData.courses || [];
                
                
                const coursesWithIds = userCourses
                    .map((course, index) => {
                        const fallbackKey = `course-calc-${index}-${Date.now()}`;
                        
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
                                uniqueKey: `${course.course_id}-calc-${index}`
                            };
                        } else {
                            return {
                                courseCode: 'Unknown',
                                courseNumber: 'Unknown',
                                instructor: 'Unknown',
                                courseId: course.course_id,
                                displayName: course.course_id,
                                uniqueKey: `${course.course_id}-calc-${index}`
                            };
                        }
                    });
                
                setCourses(coursesWithIds);
            }
        } catch (error) {
            console.error('Error fetching user courses:', error);
            setError('Failed to load your courses.');
        }
    };

    useEffect(() => {
        const totalWeight = categories.reduce((sum, category) => {
            return sum + (parseFloat(category.weight) || 0);
        }, 0);
        setRemainingWeight(100 - totalWeight);
    
        const currentGrade = calculateOverallGrade();
        setOverallGrade(currentGrade); 
    
        if (classGrade) {
            const required = calculateRequiredGrade(
                parseFloat(currentGrade),
                remainingWeight,
                parseFloat(classGrade)
            );
            setRequiredGrade(required);
        }
    
        categories.forEach((category, index) => {
            const grade = calculateCategoryGrade(category, index);
            updateCategoryGrade(index, grade);
        });
    }, [categories, classGrade]);

    const updateCategoryGrade = (index, grade) => {
        setCategoryGrades(prevGrades => {
            const newGrades = [...prevGrades];
            newGrades[index] = grade !== 'N/A' ? `${grade}%` : 'N/A';
            return newGrades;
        });
    };

    const calculateCategoryGrade = (category, index) => {
        const validAssignments = category.assignments.filter(a => 
          a.grade !== "" && 
          a.weight !== "" && 
          !isNaN(parseFloat(a.grade)) && 
          !isNaN(parseFloat(a.weight))
        );
        
        if (validAssignments.length === 0) return 'N/A';
    
        const totalPointsEarned = validAssignments.reduce((sum, assignment) => 
          sum + (parseFloat(assignment.grade) || 0), 0
        );
        
        const totalPointsPossible = validAssignments.reduce((sum, assignment) => 
          sum + (parseFloat(assignment.weight) || 0), 0
        );
    
        if (totalPointsPossible > 0) {
          const percentage = (totalPointsEarned / totalPointsPossible) * 100;
          return percentage.toFixed(2);
        }
    
        return 'N/A';
    };

    const getAssignmentPercentage = (grade, weight) => {
    const g = parseFloat(grade);
    const w = parseFloat(weight);

    if (isNaN(g) || isNaN(w) || w <= 0) return null;
    return Math.min(100, ((g / w) * 100).toFixed(2));
    };

    const calculateRequiredGrade = (currentWeightedGrade, remainingWeight, desiredGrade) => {
        if (remainingWeight <= 0) return null;
        
        const currentWeight = 100 - remainingWeight;
        const currentWeightDecimal = currentWeight / 100;
        const remainingWeightDecimal = remainingWeight / 100;
        
        const requiredGrade = (
          (desiredGrade - (currentWeightedGrade * currentWeightDecimal)) / 
          remainingWeightDecimal
        );
        
        if (requiredGrade > 100 || requiredGrade < 0) return null;
        
        return requiredGrade.toFixed(2);
    };

    const calculateOverallGrade = () => {
        let weightedTotal = 0;
        let totalWeight = 0;

        categories.forEach(category => {
          const categoryWeight = parseFloat(category.weight);
          if (!categoryWeight || isNaN(categoryWeight)) return;

          const categoryGrade = parseFloat(calculateCategoryGrade(category));
          
          if (!isNaN(categoryGrade)) {
            weightedTotal += (categoryGrade * (categoryWeight / 100));
            totalWeight += categoryWeight;
          }
        });

        if (totalWeight === 0) return '0.00';

        const scaledGrade = (weightedTotal / totalWeight) * 100;
        
        return scaledGrade.toFixed(2);
    };

    const handleCategoryChange = (index, field, value) => {
        const newCategories = [...categories];
        newCategories[index][field] = value;
        setCategories(newCategories);
    };

    const handleAssignmentChange = (categoryIndex, assignmentIndex, field, value) => {
        const newCategories = [...categories];
        newCategories[categoryIndex].assignments[assignmentIndex][field] = value;
        setCategories(newCategories);
    };

    const addCategory = () => {
        setCategories(prev => [...prev, makeCategory()]);
    };

    const addAssignmentRow = (categoryIndex) => {
        const newCategories = [...categories];
        newCategories[categoryIndex].assignments.push({ assignment: "", grade: "", weight: "" });
        setCategories(newCategories);
    };

    const deleteAssignmentRow = (categoryIndex, assignmentIndex) => {
        const newCategories = [...categories];

        if (newCategories[categoryIndex].assignments.length > 1) {
            newCategories[categoryIndex].assignments.splice(assignmentIndex, 1);
            setCategories(newCategories);
        }
    };

    const handleSaveGradeHistory = async () => {
        if (!saveTitle.trim()) {
            setError('Please enter a title for this grade history');
            return;
        }
        
        if (!selectedCourseForSave) {
            setError('Please select a course for this grade history');
            return;
        }
        
        try {
            const auth = getFirebaseAuth(); 
            const user = auth.currentUser;
            
            if (!user) {
                setError('Please log in to save your grades');
                return;
            }

            const finalGrade = calculateOverallGrade();
            
            const gradeHistoryData = {
                uid: user.uid,
                courseId: selectedCourseForSave,
                saveTitle,
                categories: categories.map(category => ({
                    categoryName: category.name,
                    categoryWeight: category.weight,
                    categoryGrade: categoryGrades[categories.indexOf(category)] || 'N/A',
                    assignments: category.assignments.map(assignment => ({
                        assignmentName: assignment.assignment,
                        grade: assignment.grade,
                        weight: assignment.weight
                    }))
                })),
                requiredGrade: requiredGrade,
                currentGrade: finalGrade,
                desiredGrade: classGrade
            };
            
            let response;
            let message = '';
            
            if (editMode && editingGradeId) {
                // update existing grade
                response = await axios.put(
                    `http://localhost:3000/api/grades/updateGrade/${user.uid}/${editingGradeId}`,
                    gradeHistoryData
                );
                message = 'Grade updated successfully!';
            } else {
                // create new grade
                response = await axios.post(
                    'http://localhost:3000/api/grades/saveGrades',
                    gradeHistoryData
                );
                message = 'Grades saved successfully!';
            }
            
            console.log('Grade history saved:', response.data);
            setSaveDialogOpen(false);
            setError('');
            
            setEditMode(false);
            setEditingGradeId(null);
            
            window.history.replaceState({}, '', window.location.pathname);
            
            resetCalculator();
            
            setSuccessMessage(message);
            setShowSuccessNotification(true);
            
            setTimeout(() => {
                setShowSuccessNotification(false);
            }, 3000);
            
        } catch (error) {
            console.error('Error saving grade history:', error);
            setError('Failed to save grades. Please try again.');
        }
    };

    const handleNewCalculation = () => {
        const hasData = categories.some(cat => 
            cat.name || 
            cat.weight || 
            cat.assignments.some(a => a.assignment || a.grade || a.weight)
        ) || classGrade;

        if (hasData) {
            if (window.confirm('Are you sure you want to start a new calculation? This will clear all current data.')) {
                resetCalculator();
            }
        } else {
            resetCalculator();
        }
    };

    const resetCalculator = () => {
        setCategories([ makeCategory() ]);
        setClassGrade('');
        setOverallGrade(0);
        setRemainingWeight(100);
        setCategoryGrades([]);
        setRequiredGrade(null);
        setError('');
        setSaveTitle('');
        setSelectedCourseForSave('');
        setEditMode(false);
        setEditingGradeId(null);
        window.history.replaceState({}, '', window.location.pathname);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-blue-950 bg-cover bg-center bg-fixed overflow-x-hidden" 
             style={{ backgroundImage: "url('/assets/GradeCalcBG.svg')", fontFamily: "titilliumWeb-semibold" }}>
            <GradeCalculatorSidebar 
                onToggle={handleSidebarToggle} 
                onNewCalculation={handleNewCalculation}
                userCourses={courses}
            />
            

            <AnimatePresence>
                {showSuccessNotification && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-20 right-8 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2"
                    >
                        <HiCheckCircle className="text-2xl" />
                        <span className="font-semibold">{successMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <div className={`flex-1 text-white transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}
                 >
                    <div className="flex flex-col justify-center items-center text-2xl">
                        <motion.h1
                            className="mt-4 pt-20 text-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                        >
                            Enter the name and weight of each category, as well as the desired final grade in the class.
                            <br />
                            Press "{editMode ? 'Update' : 'Save'}" to {editMode ? 'update' : 'save'} your inputs to a class.
                        </motion.h1>
                        <motion.h1 
                            className="pt-5 pr-6 pl-7 rounded-md text-xl text-white text-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 1.0 }}
                        >
                            <strong>Grade Required on Remaining Work:</strong><br />
                            {requiredGrade === null ? 
                                "Not possible with current grades" : 
                                `${requiredGrade}%`
                            }
                        </motion.h1>
                        
                        
                        <motion.div 
                            className={`mb-6 px-2 pt-6 ${categories.length === 1 ? 'flex justify-center' : 'grid grid-cols-2 gap-6'} categories`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 1.0 }}
                        >
                            <AnimatePresence>
                                {categories.map((category, categoryIndex) => (
                                    <motion.div 
                                        key={category.id} 
                                        layout={"position"}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20, transition: { duration: 0.18 } }}
                                        className={`rounded-[20px] p-6 bg-gradient-to-br from-nexus800 via-nexus900 to-nexus700 category relative w-full`}
                                    >
                                        {categories.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newCategories = categories.filter((_, index) => index !== categoryIndex);
                                                    setCategories(newCategories);
                                                }}
                                                className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center text-nexus200 rounded-md transition-all duration-200 hover:text-white group z-10"
                                                title="Delete Category"
                                            >
                                                <HiTrash size={27} className="group-hover:scale-110 transition-transform duration-150 mt-3" />
                                            </button>
                                        )}
                                        
                                    
                                        <div className={`flex flex-row items-center ${categories.length > 1 ? 'pr-12' : ''}`}>
                                            <label htmlFor={`category-${categoryIndex}`} className="pr-3 block text-lg text-white">Category</label>
                                            <input
                                                type="text"
                                                id={`category-${categoryIndex}`}
                                                className="mt-1 text-black text-lg block w-full rounded-md bg-nexus50 border-gray-300 shadow-sm focus:border-nexus300 focus:outline-none focus:ring-nexus200 focus:ring-opacity-50 p-1"
                                                value={category.name}
                                                onChange={(e) => handleCategoryChange(categoryIndex, "name", e.target.value)}
                                                placeholder="Enter Category"
                                                required
                                            />
                                            <label htmlFor={`category-weight-${categoryIndex}`} className="pl-3 pr-3 block text-sm text-white">Weight (%)</label>
                                            <input
                                                type="number"
                                                id={`category-weight-${categoryIndex}`}
                                                className="mt-1 pr-0 pl-3 w-1/4 text-black text-lg rounded-md bg-nexus50 border-gray-300 shadow-sm focus:border-nexus300 focus:ring focus:ring-nexus200 focus:ring-opacity-50 p-1"
                                                value={category.weight}
                                                onChange={(e) => handleCategoryChange(categoryIndex, "weight", e.target.value)}
                                                placeholder=""
                                                required
                                            />
                                        </div>

                                        <div className="mt-6 bg-nexus800 bg-opacity-10 rounded-lg p-4 relative">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (category.assignments.length > 1) {
                                                        deleteAssignmentRow(categoryIndex, category.assignments.length - 1);
                                                    }
                                                }}
                                                className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center bg-[#D73A49] text-white text-sm font-bold rounded-md transition duration-200 hover:bg-red-700"
                                            >
                                                –
                                            </button>
                                            
                                            <div className="grid grid-cols-3 gap-x-4 gap-y-2 place-content-evenly text-xl">
                                                <h1 className="text-white">Assignment</h1>
                                                <h1 className="text-white">Grade (Points)</h1>
                                                <h1 className="text-white">Points Possible </h1>
                                                {category.assignments.map((assignment, assignmentIndex) => {
                                                const percent = getAssignmentPercentage(
                                                    assignment.grade,
                                                    assignment.weight
                                                );

                                                return (
                                                    <div key={assignmentIndex} className="col-span-3 space-y-1">
                                                        <div className="grid grid-cols-3 gap-x-4">
                                                            <input
                                                                type="text"
                                                                className="mt-1 text-sm h-8 w-full block rounded-md bg-nexus50 border-gray-300 shadow-sm text-nexus800 p-1"
                                                                value={assignment.assignment}
                                                                onChange={(e) =>
                                                                    handleAssignmentChange(categoryIndex, assignmentIndex, "assignment", e.target.value)
                                                                }
                                                                placeholder="Name"
                                                            />
                                                            <input
                                                                type="number"
                                                                className="mt-1 text-sm h-8 w-full block rounded-md bg-nexus50 border-gray-300 shadow-sm text-nexus800 p-1"
                                                                value={assignment.grade}
                                                                onChange={(e) =>
                                                                    handleAssignmentChange(categoryIndex, assignmentIndex, "grade", e.target.value)
                                                                }
                                                                placeholder="Grade Earned"
                                                            />
                                                            <input
                                                                type="number"
                                                                className="mt-1 text-sm h-8 w-full block rounded-md bg-nexus50 border-gray-300 shadow-sm text-nexus800 p-1"
                                                                value={assignment.weight}
                                                                onChange={(e) =>
                                                                    handleAssignmentChange(categoryIndex, assignmentIndex, "weight", e.target.value)
                                                                }
                                                                placeholder="Points Possible"
                                                            />
                                                        </div>
                                                        {percent !== null && (
                                                            <div className="w-full h-2 bg-nexus900 rounded overflow-hidden">
                                                                <div
                                                                    className="h-full transition-all duration-300 bg-blue-500"
                                                                    style={{ width: `${percent}%` }}
                                                                />
                                                            </div>
                                                        )}
                                                        {percent !== null && (
                                                            <p className="text-xs text-nexus200 text-right">
                                                                {percent}%
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            </div>
                                        </div>
                                        <div className="flex flex-row justify-between items-center">
                                            <h1 className="pt-3 text-xl text-white"><strong>Category Grade:</strong> {categoryGrades[categoryIndex] || 'N/A'}</h1>
                                            <button
                                                type="button"
                                                onClick={() => addAssignmentRow(categoryIndex)}
                                                className="mt-4 px-4 py-2 bg-nexus500 text-white text-sm font-semibold rounded-md transition duration-300 hover:bg-nexus600 cursor-pointer"
                                            >
                                                Add Assignment
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </motion.div>

                        <motion.div 
                            className="mb-4 flex flex-col justify-center items-center gap-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 1.5 }}
                        >
                            <div className="flex flex-row justify-center items-center gap-8">
                                <h1 className="text-xl text-nexus50"><strong>Current Grade: </strong> {overallGrade}%</h1>
                                <h1 className="text-xl text-nexus50"><strong>Remaining Assignment Weight:</strong> {remainingWeight}%</h1>
                            </div>
                            <div className="flex flex-col items-center">
                                <h1 className="text-3xl text-nexus50"><strong>Desired Class Grade:</strong></h1>
                                <input
                                    id="classGrade"
                                    className="mt-1 block text-center w-[20%] bg-nexus50 rounded-md border-gray-300 shadow-sm focus:border-nexus300 focus:outline-none focus:ring-nexus200 focus:ring-opacity-50 text-nexus800 p-1"
                                    value={classGrade}
                                    onChange={(e) => setClassGrade(e.target.value)}
                                    required
                                />
                            </div>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 1.5 }}
                        className="fixed bottom-6 right-8"
                    >
                        <button
                            type="button"
                            onClick={addCategory}
                            className="mt-6 mr-4 p-2 bg-nexus300 text-white text-lg font-semibold rounded-md transition duration-300 hover:bg-nexus400"
                        >
                            Add Category
                        </button>
                        <button 
                            className="px-4 py-2 bg-[#0D6EFD] text-white text-lg font-semibold rounded-md transition duration-300 hover:bg-nexus400"
                            onClick={() => setSaveDialogOpen(true)}
                        >
                            {editMode ? 'Update' : 'Save'}
                        </button>
                        
                        <Modal
                            open={saveDialogOpen}
                            onClose={() => setSaveDialogOpen(false)}
                            closeAfterTransition
                        >
                            <Fade in={saveDialogOpen}>

                                <div className="fixed inset-0  flex items-center justify-center z-50">
                                    <div className="bg-gradient-to-br from-nexus800 via-nexus900 to-nexus700 p-6 rounded-lg shadow-lg border-2 border-nexus400 w-96">
                                        <h2 className="text-xl text-white font-bold mb-4">
                                            {editMode ? 'Update Grade History' : 'Save Grade History'}
                                        </h2>
                                        
                                        {error && (
                                            <div className="bg-red-500 text-white p-2 rounded mb-4 text-sm">
                                                {error}
                                            </div>
                                        )}
                                        
                                        <div className="mb-4">
                                            <label className="block text-white text-sm font-medium mb-2">
                                                Select Course
                                            </label>
                                            <select
                                                value={selectedCourseForSave}
                                                onChange={(e) => setSelectedCourseForSave(e.target.value)}
                                                className={`w-full p-2 rounded bg-nexus50 ${selectedCourseForSave ? 'text-nexus800' : 'text-gray-400'}`}
                                                disabled={editMode}
                                            >
                                                <option value="" disabled className="text-gray-400">Choose a course...</option>
                                                {courses.map((course, index) => (
                                                    <option key={course.uniqueKey || `calc-option-${index}`} value={course.courseId} className="text-nexus800">
                                                        {course.displayName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="mb-4">
                                            <label className="block text-white text-sm font-medium mb-2">
                                                Grade History Title
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full p-2 rounded bg-nexus50 text-nexus800"
                                                placeholder="Enter a title for this grade history"
                                                value={saveTitle}
                                                onChange={(e) => setSaveTitle(e.target.value)}
                                            />
                                        </div>
                                        
                                        <div className="flex justify-end space-x-3">
                                            <button 
                                                className="px-4 py-2 bg-[#D73A49] text-white text-xl font-bold rounded-md transition duration-200 hover:bg-red-700"
                                                onClick={() => {
                                                    setSaveDialogOpen(false);
                                                    setError('');
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                className="px-4 py-2 bg-nexus300 text-white text-xl font-bold rounded-md transition duration-300 hover:bg-nexus400 cursor-pointer"
                                                onClick={handleSaveGradeHistory}
                                                disabled={!saveTitle.trim() || !selectedCourseForSave}
                                            >
                                                {editMode ? 'Update' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Fade>
                        </Modal>

                    </motion.div>
            </div>
        </div>
    );
};

export default GradeCalculator;