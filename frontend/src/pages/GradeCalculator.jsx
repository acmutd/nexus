import React, { useState, useEffect, Fragment } from "react";
import Modal from '@mui/material/Modal';
import Backdrop from '@mui/material/Backdrop';
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { getFirebaseAuth, getFirebaseFirestore } from '../firebase.js';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import GradeCalculatorSidebar from '../components/GradeCalculatorSidebar.jsx'
import { HiTrash, HiCheckCircle, HiX, HiChevronDown, HiPlus, HiChevronUp, HiOutlineSave } from 'react-icons/hi';
import Fade from "@mui/material/Fade";
import Button from "../components/Button.jsx";
import { useMobile } from "../context/mobileContext.jsx";

const GradeCalculator = () => {
    const isMobile = useMobile()

    const makeCategory = () => ({
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
        name: "",
        weight: "",
        assignments: [{ assignment: "", grade: "", weight: "" }],
        isOpen: true
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
                            })),
                            isOpen: true
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
                    `/api/grades/updateGrade/${user.uid}/${editingGradeId}`,
                    gradeHistoryData
                );
                message = 'Grade updated successfully!';
            } else {
                // create new grade
                response = await axios.post(
                    '/api/grades/saveGrades',
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
        <motion.div className="min-h-screen flex items-center justify-center bg-blue-950 bg-cover bg-center bg-fixed overflow-x-hidden"
                    style={{ backgroundImage: "url('/assets/GradeCalcBG.svg')", fontFamily: "titilliumWeb-semibold" }}
                    >
            <GradeCalculatorSidebar 
                onToggle={handleSidebarToggle} 
                onNewCalculation={handleNewCalculation}
                userCourses={courses}
            />

            {/* SAVE SUCCESS NOTIFICATION */}
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
                <div className="flex flex-col items-center headingText overflow-hidden ">
                    <motion.h1
                        className="mt-25 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                    >
                        Grade Calculator -
                        {saveTitle ? " "+saveTitle : " Untitled Calculation"}
                    </motion.h1>

                    { /* CATGORIES */}
                    <motion.div
                        className={`mb-6 pt-6 ${categories.length === 1 ? 'flex w-[70%]' : 'grid grid-cols-2 gap-6 w-[70%]'} categories`}
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
                                    transition={{duration: 0.15, type: 'tween'}}
                                    className={`rounded-lg category relative w-[clamp(300px,100%,500px)]`}
                                >

                                    {/* LIGHT BLUE TAB */}
                                    <div className={`flex flex-row items-center bg-nexus600 rounded-t-lg justify-between px-4 py-2 font-titilliumWeb-semibold gap-4 ${categories.length > 1 ? '' : 'pr-12'}`}>
                                        <HiChevronDown size={40} className={`cursor-pointer text-white transition duration-300 ${category.isOpen ? 'rotate-180': 'rotate-0'}`} onClick={() => {handleCategoryChange(categoryIndex, "isOpen", !category.isOpen)}}/>
                                        {/* CATEGORY + TOTAL GRADE + WEIGHT*/}
                                        <div className="flex flex-col w-full">
                                            {/* CATEGORY NAME */}
                                            <input
                                                id={`category-${categoryIndex}`}
                                                className="py-2 bg-nexus800 bodyText text-white block rounded-md focus:border-nexus300 focus:outline-none focus:ring-nexus200 focus:ring-opacity-50 p-1"
                                                value={category.name}
                                                onChange={(e) => handleCategoryChange(categoryIndex, "name", e.target.value)}
                                                autoComplete="off"
                                                placeholder="Enter Category"
                                                required
                                            />
                                            {/* TOTAL GRADE + WEIGHT */}
                                            <div className="flex flex-row items-center justify-between mt-2 w-full">
                                                <div className="flex flex-row items-center">
                                                    <h1 className="flex tinyText text-white"><strong>Total Grade: {' '}</strong></h1>
                                                    <h2 className="flex ml-1 tinyText text-white">{categoryGrades[categoryIndex] || ' N/A'}</h2>
                                                </div>
                                                <div className="flex flex-row items-center">
                                                    <label htmlFor={`category-weight-${categoryIndex}`} className="pl-3 pr-1 block tinyText text-white">Weight:</label>
                                                    <input
                                                        type="text"
                                                        id={`category-weight-${categoryIndex}`}
                                                        className="bg-nexus800 tinyText w-9 text-white block rounded-md focus:border-nexus300 focus:outline-none focus:ring-nexus200 focus:ring-opacity-50 p-1"
                                                        value={category.weight}
                                                        onChange={(e) => handleCategoryChange(categoryIndex, "weight", e.target.value)}
                                                        placeholder=""
                                                        required
                                                    />
                                                    <h1 className="pl-1 pr-1 block tinyText text-white">%</h1>
                                                </div>
                                            </div>
                                        </div>
                                        {/* DELETE CATEGORY */}
                                        {categories.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newCategories = categories.filter((_, index) => index !== categoryIndex);
                                                setCategories(newCategories);
                                            }}
                                            className=" flex items-center justify-center text-nexus200 rounded-md transition-all duration-200 hover:text-white group z-10"
                                            title="Delete Category"
                                        >
                                            <HiTrash size={25} className="hover:scale-110 transition duration-300 text-white hover:text-red-500 cursor-pointer"/>
                                        </button>
                                    )}
                                    </div>

                                    {/* ASSIGNMENTS */}
                                    <AnimatePresence>
                                        {category.isOpen && (
                                            <motion.div
                                                initial={{scaleY: 0, originY: 0}}
                                                animate={{scaleY: 1}}
                                                exit={{scaleY: 0, originY: 0}}
                                                transition={{duration: 0.15, type: 'tween'}}
                                                className="flex flex-col rounded-lg relative p-4 gap-4 bg-nexus900 ">
                                                    {category.assignments.map((assignment, assignmentIndex) => {
                                                    const percent = getAssignmentPercentage(
                                                        assignment.grade,
                                                        assignment.weight
                                                    );

                                                    return (
                                                        <div key={assignmentIndex} className="flex flex-row items-center justify-center bg-nexus800 px-4 py-2 rounded-lg h-20 w-full">
                                                            {/* NAME + POINTS + PERCENTAGE BAR */}
                                                            <div className="flex flex-col w-full">
                                                                {/* NAME + POINTS */}
                                                                <div className="flex flex-row gap-2 tinyText mb-2 w-full">
                                                                    <input
                                                                        type="text"
                                                                        className="py-2 bg-nexus900 tinyText flex-3 text-white rounded-md focus:outline-none p-1"
                                                                        value={assignment.assignment}
                                                                        onChange={(e) =>
                                                                            handleAssignmentChange(categoryIndex, assignmentIndex, "assignment", e.target.value)
                                                                        }
                                                                        placeholder="Assignment"
                                                                    />
                                                                    <div className="flex flex-row gap-1 items-center justify-center">
                                                                        <input
                                                                            className="bg-nexus900 tinyText w-10 text-white block rounded-md focus:outline-none p-1"
                                                                            value={assignment.grade}
                                                                            onChange={(e) =>
                                                                                handleAssignmentChange(categoryIndex, assignmentIndex, "grade", e.target.value)
                                                                            }
                                                                            placeholder="100">
                                                                        </input>
                                                                        /
                                                                        <input
                                                                            className="bg-nexus900 tinyText w-10 text-white block rounded-md focus:outline-none p-1"
                                                                            value={assignment.weight}
                                                                            onChange={(e) =>
                                                                                handleAssignmentChange(categoryIndex, assignmentIndex, "weight", e.target.value)
                                                                            }
                                                                            placeholder="100">
                                                                        </input>
                                                                    </div>
                                                                </div>

                                                                {/* PERCENTAGE BAR */}
                                                                <div className="flex flex-row items-center justify-center gap-2">
                                                                    <div className="w-full h-3 bg-nexus900 overflow-hidden rounded-full">
                                                                        <div
                                                                            className="h-full transition-all duration-300 bg-blue-500"
                                                                            style={{ width: `${percent == null ? 0 : percent }%` }}
                                                                        />
                                                                    </div>
                                                                    <p className="tinyText text-white text-right">
                                                                        {percent == null ? "N/A" : percent+"%"}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* DELETE ASSIGNMENT */}
                                                            <HiTrash
                                                                className="ml-4 flex hover:scale-110 transition duration-300 text-white hover:text-red-500 cursor-pointer"
                                                                onClick={() => {
                                                                    if (category.assignments.length > 1) {
                                                                        deleteAssignmentRow(categoryIndex, assignmentIndex);
                                                                    }
                                                                }}
                                                                title="Delete Category"
                                                                size={25}
                                                            />
                                                        </div>
                                                    );
                                                })}

                                                <Button className="h-[80px] bg-nexus800 flex w-full" onClick={() => addAssignmentRow(categoryIndex)} text={'Add Assignment'} icon={<HiPlus />}/>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>

                    {/* OTHER NUMBERS */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 1.5 }}
                        className="flex w-full items-center justify-center"
                    >
                        <motion.div
                            className="rounded-lg flex flex-col justify-center items-center bg-nexus900 w-[clamp(300px,70%,1000px)] mb-20 text-center"
                            layout={"position"}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{duration: 0.15, type: 'tween'}}

                        >
                            <div className="flex flex-row justify-center items-center gap-8 bg-nexus600 w-full py-6 rounded-t-lg ">
                                <h1 className="headingText text-nexus50"><strong>Overall Grade: </strong> {overallGrade}%</h1>
                            </div>
                            <div className="flex flex-row items-center justify-center bg-nexus800 w-[95%] my-6 rounded-lg py-4">
                                <div className="flex flex-col items-center justify-center gap-2 bodyText">
                                    <h1 className="bodyText text-nexus50"><strong>Remaining Assignment Weight:</strong> </h1>
                                    {remainingWeight}%
                                </div>
                                <div className="flex flex-col items-center justify-center mt-1">
                                    <h1 className="bodyText text-nexus50"><strong>Desired Class Grade:</strong></h1>
                                    <input
                                        id="classGrade"
                                        className="font-titilliumWeb-bold mt-1 block bodyText text-center w-[20%] bg-nexus50 rounded-md border-gray-300 focus:outline-none text-nexus800 p-1"
                                        value={classGrade}
                                        onChange={(e) => setClassGrade(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="flex flex-col items-center justify-center bodyText gap-2">
                                    <h1 className="text-nexus50">
                                        Remaining Grade Required:
                                    </h1>
                                    {requiredGrade === null ?
                                        "Not possible with current grades" :
                                        `${requiredGrade}%`
                                    }
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>

                {/* BUTTONS */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 1.5 }}
                    className="fixed bottom-6 right-8 flex flex-col gap-2"
                >
                    <Button className="p-1 gap-2" text={"Add Category"} icon={<HiPlus/>} onClick={addCategory}/>
                    <Button className="p-1 gap-2" text={editMode ? 'Update Category' : 'Save Category'} icon={<HiOutlineSave/>} onClick={() => setSaveDialogOpen(true)}/>

                    <Modal
                        open={saveDialogOpen}
                        onClose={() => setSaveDialogOpen(false)}
                        closeAfterTransition
                        className="flex items-center justify-center"
                    >
                        <Fade in={saveDialogOpen}>

                            <div className="flex flex-col bg-nexus800 rounded-lg shadow-lg w-[clamp(300px,30%,500px)]">
                                <div className="flex w-full justify-between h-[60px] bg-nexus500 rounded-t-lg items-center p-4">
                                    <h2 className="bodyText text-white font-titilliumWeb-bold">
                                        {editMode ? 'Update Grade History' : 'Save Grade History'}
                                    </h2>
                                    <HiX className="cursor-pointer transition duration-300 text-white hover:text-gray-300" size={24} onClick={() => setSaveDialogOpen(false)}/>
                                </div>
                                <div className="flex flex-col p-6 font-titilliumWeb-semibold">
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
                                            className={`w-full p-2 rounded bg-nexus50 cursor-pointer ${selectedCourseForSave ? 'text-nexus800' : 'text-gray-400'}`}
                                        >
                                            <option value="" disabled className="text-gray-400">Choose a course...</option>
                                            {courses.map((course, index) => (
                                                <option key={course.uniqueKey || `calc-option-${index}`} value={course.courseId} className="text-nexus800">
                                                    {course.displayName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mb-6">
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

                                    <div className="flex justify-between space-x-3">
                                        <button
                                            className="px-4 py-2 cursor-pointer bg-[#D73A49] text-white text-xl rounded-md transition duration-200 hover:bg-red-700"
                                            onClick={() => {
                                                setSaveDialogOpen(false);
                                                setError('');
                                                setSelectedCourseForSave('');
                                                setSaveTitle('');
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="px-4 py-2 bg-nexus500 text-white text-xl rounded-md transition duration-300 hover:bg-nexus600 cursor-pointer"
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
        </motion.div>
    );
};

export default GradeCalculator;