import React, { useState, useEffect, useRef } from "react";
import Modal from '@mui/material/Modal';
import Backdrop from '@mui/material/Backdrop';
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { getFirebaseAuth, getFirebaseFirestore } from '../firebase.js';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import GradeCalculatorSidebar from '../components/GradeCalculatorSidebar.jsx'
import { HiTrash, HiCheckCircle, HiX, HiChevronDown, HiPlus, HiOutlineSave, HiQuestionMarkCircle, HiExclamationCircle } from 'react-icons/hi'; 
import Fade from "@mui/material/Fade";
import Button from "../components/Button.jsx";
import { useMobile } from "../context/mobileContext.jsx";
import SimpleBar from 'simplebar-react';

const GradeCalculator = () => {
    const {isScreenMedium} = useMobile()
    const {isMobile} = useMobile()
    
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

    const [infoOpen, setInfoOpen] = useState(false)
    const infoRef = useRef(null)
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [saveTitle, setSaveTitle] = useState('Untitled Calculation');
    const [courses, setCourses] = useState([]);
    const [selectedCourseForSave, setSelectedCourseForSave] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [warningOpen, setWarningOpen] = useState(false);

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingGradeId, setEditingGradeId] = useState(null);

    const [showSuccessNotification, setShowSuccessNotification] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    const handleSidebarToggle = (collapsed) => {
        setSidebarCollapsed(collapsed);
    };
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if(infoRef.current && !infoRef.current.contains(event.target)) {
                setInfoOpen(false)
                setWarningOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {document.removeEventListener("mousedown", handleClickOutside)}
    }, [])

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
                        `/api/grades/getGradesByCourse/${currentUser.uid}/${courseId}`
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
            
            const newErrors = {...validationErrors};
            delete newErrors[`category-${categoryIndex}-assignment-${assignmentIndex}-name`];
            delete newErrors[`category-${categoryIndex}-assignment-${assignmentIndex}-grade`];
            delete newErrors[`category-${categoryIndex}-assignment-${assignmentIndex}-weight`];
            setValidationErrors(newErrors);
    }
    };

    const validateFields = () => {
        const errors = {};
        
        categories.forEach((category, catIndex) => {
            if (!category.name.trim()) {
                errors[`category-${catIndex}-name`] = true;
            }
            
            if (!category.weight || category.weight === '') {
                errors[`category-${catIndex}-weight`] = true;
            }
            
            category.assignments.forEach((assignment, asnIndex) => {
                if (!assignment.assignment.trim()) {
                    errors[`category-${catIndex}-assignment-${asnIndex}-name`] = true;
                }
                if (!assignment.grade || assignment.grade === '') {
                    errors[`category-${catIndex}-assignment-${asnIndex}-grade`] = true;
                }
                if (!assignment.weight || assignment.weight === '') {
                    errors[`category-${catIndex}-assignment-${asnIndex}-weight`] = true;
                }
            });
        });
        
        return errors;
    };

    const handleSaveGradeHistory = async () => {

        if (isSaving) return; 
    
        const errors = validateFields();
        
        if (!saveTitle.trim()) {
            errors['saveTitle'] = true;
        }
        
        if (!selectedCourseForSave) {
            errors['courseSelection'] = true;
        }
        
        setValidationErrors(errors);
        
        if (Object.keys(errors).length > 0) {
            setError('Please fill in all required fields');
            return;
        }
        
        setError('');
        setIsSaving(true);
        
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
            
            //resetCalculator();
            
            setSuccessMessage(message);
            setShowSuccessNotification(true);

            setTimeout(() => {
                setShowSuccessNotification(false);
            }, 3000);
            
        } catch (error) {
            console.error('Error saving grade history:', error);
            setError('Failed to save grades. Please try again.');
        } finally {
            setIsSaving(false); 
        }

    };

    const handleNewCalculation = () => {
        const hasData = categories.some(cat => 
            cat.name || 
            cat.weight || 
            cat.assignments.some(a => a.assignment || a.grade || a.weight)
        ) || classGrade;

        resetCalculator();
        /*if (hasData) {
            if (window.confirm('Are you sure you want to start a new calculation? This will clear all current data.')) {
                resetCalculator();
            }
        } else {
            resetCalculator();
        }*/
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
        <>
        <motion.div className={`inset-0 min-h-screen flex items-center justify-center bg-blue-950 bg-cover bg-center fixed overflow-x-hidden`} 
                    style={{ backgroundImage: "url('/assets/GradeCalcBG.svg')"}}
                    />
            <div className="flex justify-center items-center relative font-titilliumWeb-semibold">
                <GradeCalculatorSidebar 
                    onToggle={handleSidebarToggle} 
                    onNewCalculation={handleNewCalculation}
                    userCourses={courses}
                />
                
                {/* INFO POP UP */}
                <AnimatePresence>
                    {infoOpen && (
                        <motion.div
                            initial={{opacity: 0}}
                            animate={{opacity:1}}
                            exit={{opacity:0}}
                            transition={{duration:0.25}}
                            className="fixed inset-0 backdrop-brightness-50 flex z-50 items-center justify-center">

                            <motion.div
                                ref={infoRef}
                                initial={{opacity: 0}}
                                animate={{opacity:1}}
                                exit={{opacity:0}}
                                transition={{duration:0.25}}
                                className="flex relative flex-col w-[clamp(300px,60vw,600px)] bg-nexus800 h-auto rounded-lg z-60 p-6 shadow-2xl">
                                
                                <HiX size={25} className="text-white absolute right-6 top-6 hover:text-gray-300 cursor-pointer transition duration-300" onClick={() => {setInfoOpen(false)}}/>
                                <h1 className="text-white font-titilliumWeb-bold headingText flex items-start w-full mb-4">
                                    Welcome To Grade Calculator!
                                </h1>
                                <SimpleBar className="flex flex-col bg-nexus900 p-6 rounded-lg custom-scrollbar" style={{ maxHeight: 330}}>
                                    <h1 className="text-white font-titilliumWeb-bold bodyText flex items-start w-full">
                                        What are Categories and Weight?
                                    </h1>
                                    <span className="text-white font-titilliumWeb-regular tinyText flex w-full mt-2">
                                        From the buttons on the bottom right, add in the categories that contribute to your final grade (ex. homework, quizzes, midterms, projects). It is important to LEAVE OUT at least one category: the Grade Calculator determines what portion of your overall grade remains on its own, and calculates what grade is needed on the REMAINING work to achieve your desired final grade. For example, if you know what you have achieved on all assignments, quizzes, and your midterm, enter those three as categories; if your one remaining category is the final exam, the Grade Calculator will tell you what score you need on that exam. For the ones that you’ve added, enter their weight: if homework is 25% of your grade, put 25 into the box.
                                    </span>
                                    <img src="/assets/GradeCalcGif1.gif" className="flex my-4 w-[55%]"/>
                                    <h1 className="text-white font-titilliumWeb-bold bodyText flex items-start w-full pt-4">
                                        How Do Assignments Work?
                                    </h1>
                                    <span className="text-white font-titilliumWeb-regular tinyText flex w-full mt-2">
                                        Once you’ve added as many categories as you need, type in the score you’ve received on each assignment in that category as a point value. For example, if you received a 25/30 on your first homework assignment, put 25 in the first box and 30 in the second. Repeat until all your graded assignments have been entered. You should be able to see the overall grade for each category.
                                    </span>
                                    <img src="/assets/GradeCalcGif2.gif" className="flex my-4 w-[55%]"/>
                                    <h1 className="text-white font-titilliumWeb-bold bodyText flex items-start w-full pt-4">
                                        How Do Desired Grades Work?
                                    </h1>
                                    <span className="text-white font-titilliumWeb-regular tinyText flex w-full mt-2">
                                        Now scroll down and enter the numerical value for the grade you want in the class. If you want an A and need a 94% in the class to do so, enter 94 into the box.
                                        You should now be able to see the grade you need to achieve on the remaining tasks to earn your desired grade! Press the “Save” button to refer back to this calculation later.
                                    </span>
                                    <img src="/assets/GradeCalcGif3.gif" className="flex my-4 w-[55%]"/>
                                    <img src="/assets/GradeCalcGif4.gif" className="flex my-4 w-[55%]"/>
                                </SimpleBar>

                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* SAVE SUCCESS NOTIFICATION */}
                <AnimatePresence>
                    {showSuccessNotification && (
                        <motion.div
                            initial={{ opacity: 0, y: -50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -50 }}
                            className="fixed top-20 right-8 z-50 bg-[#5CA7BA] text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2"
                        >
                            <HiCheckCircle className="text-2xl" />
                            <span className="font-semibold">{successMessage}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* CONTENT */}
                <div className={`flex-1 text-white transition-all duration-300 ${isMobile ? 'ml-0' : sidebarCollapsed ? 'ml-16' : 'ml-64'}`}
                >
                    <div className="flex flex-col items-center headingText overflow-hidden">
                        {/* TITLE */}
                        <motion.h1
                            className="mt-25 text-center flex flex-row flex-wrap items-center justify-center gap-1 w-[clamp(300px,70%,1000px)]"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            Grade Calculator -
                            <textarea
                                className="focus:outline-none hover:border-gray-400 hover:border-1 focus:border-blue-500 focus:border-1 p-1 rounded-sm flex overflow-hidden field-sizing-content resize-none min-w-25" data-gramm_editor="false" data-gramm="false" data-enable-grammarly="false" spellcheck="false" autocorrect="off" autocapitalize="off"
                                value={saveTitle}
                                placeholder={"Untitled Calculation"}
                                onChange={(e) => setSaveTitle(e.target.value)}
                                title="Rename"
                            >
                            </textarea>
                        </motion.h1>

                        { /* CATGORIES */}
                        <motion.div 
                            className={`mb-6 pt-6 w-[70%] ${categories.length === 1 ? 'flex justify-center' : isScreenMedium ? 'flex flex-wrap gap-4 justify-center' : 'grid grid-cols-2 gap-6'} categories`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <AnimatePresence>
                                {categories.map((category, categoryIndex) => (
                                    <motion.div
                                        key={category.id}
                                        layout={"position"}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{duration: 0.15, type: 'tween'}}
                                        className={`rounded-lg category relative w-[clamp(300px,100%,600px)]`}
                                    >

                                        {/* LIGHT BLUE TAB */}
                                        <div className={`flex flex-row items-center bg-nexus600 ${category.isOpen ? 'rounded-t-lg' : 'rounded-lg'} justify-between px-4 py-4 font-titilliumWeb-semibold gap-2 ${categories.length > 1 ? '' : 'pr-12'}`}>
                                            {/* COLLAPSE */}
                                            <div className="flex">
                                                <HiChevronDown size={25} className={`flex cursor-pointer text-white transition duration-300 ${category.isOpen ? 'rotate-180': 'rotate-0'}`} onClick={() => {handleCategoryChange(categoryIndex, "isOpen", !category.isOpen)}}/>
                                            </div>
                                            <div className="flex w-full flex-row flex-wrap gap-2">

                                                {/* CATEGORY NAME */}
                                                <div className="flex flex-3">
                                                    <input
                                                        id={`category-${categoryIndex}`}
                                                        className={`flex bg-nexus800 tinyText w-full text-white rounded-md focus:outline-none p-1.5 ${
                                                            validationErrors[`category-${categoryIndex}-name`] 
                                                            ? 'border-2 border-[#D73A49] focus:border-[#D73A49] focus:ring-[#D73A49]' 
                                                            : 'focus:border-nexus300 focus:ring-nexus200 focus:ring-opacity-50'
                                                        }`}
                                                        value={category.name}
                                                        onChange={(e) => {
                                                            handleCategoryChange(categoryIndex, "name", e.target.value);
                                                            if (validationErrors[`category-${categoryIndex}-name`]) {
                                                                const newErrors = {...validationErrors};
                                                                delete newErrors[`category-${categoryIndex}-name`];
                                                                setValidationErrors(newErrors);
                                                            }
                                                        }}
                                                        autoComplete="off"
                                                        placeholder="Enter category (e.g. Homework)"
                                                        required
                                                    />
                                                </div>
                                                {/* WEIGHT */}
                                                <div className="flex flex-row items-center w-auto">
                                                    <label htmlFor={`category-weight-${categoryIndex}`} className="pr-1 block tinyText text-white">Weight:</label>
                                                    <input
                                                        type="text"
                                                        id={`category-weight-${categoryIndex}`}
                                                        className={`bg-nexus800 tinyText w-10 text-white block rounded-md focus:outline-none p-1.5 ${
                                                            validationErrors[`category-${categoryIndex}-weight`] 
                                                            ? 'border-2 border-[#D73A49] focus:border-[#D73A49] focus:ring-[#D73A49]' 
                                                            : 'focus:border-nexus300 focus:ring-nexus200 focus:ring-opacity-50'
                                                        }`}
                                                        value={category.weight}
                                                        onChange={(e) => {
                                                            handleCategoryChange(categoryIndex, "weight", e.target.value);
                                                            if (validationErrors[`category-${categoryIndex}-weight`]) {
                                                                const newErrors = {...validationErrors};
                                                                delete newErrors[`category-${categoryIndex}-weight`];
                                                                setValidationErrors(newErrors);
                                                            }
                                                        }}
                                                        autoComplete="off"
                                                        required
                                                        placeholder="25"
                                                    />
                                                    <h1 className="pl-1 pr-1 block tinyText text-white">%</h1>
                                                </div>
                                            </div>
                                            {/* DELETE CATEGORY */}
                                            {categories.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newCategories = categories.filter((_, index) => index !== categoryIndex);
                                                    setCategories(newCategories);
                                                    const newErrors = {...validationErrors};
                                                    Object.keys(newErrors).forEach(key => {
                                                        if (key.startsWith(`category-${categoryIndex}-`)) {
                                                            delete newErrors[key];
                                                        }
                                                    });
                                                    setValidationErrors(newErrors);
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
                                                    className="flex flex-col rounded-b-lg relative p-4 gap-4 bg-nexus900 ">                             
                                                        {category.assignments.map((assignment, assignmentIndex) => {
                                                        const percent = getAssignmentPercentage(
                                                            assignment.grade,
                                                            assignment.weight
                                                        );

                                                        return (
                                                            <div key={assignmentIndex} className="flex flex-row items-center justify-center bg-nexus800 px-4 py-2 rounded-lg  w-full">
                                                                {/* NAME + POINTS + PERCENTAGE BAR */}
                                                                <div className="flex flex-col w-full pl-2">
                                                                    {/* NAME + POINTS */}
                                                                    <div className="flex flex-row gap-2 tinyText mb-2 w-full">
                                                                    <input
                                                                        type="text"
                                                                        className={`py-1.5 bg-nexus900 tinyText flex-3 text-white rounded-md focus:outline-none p-1 ${
                                                                            validationErrors[`category-${categoryIndex}-assignment-${assignmentIndex}-name`]
                                                                            ? 'border-2 border-[#D73A49] focus:border-[#D73A49] focus:ring-[#D73A49]'
                                                                            : ''
                                                                        }`}
                                                                        value={assignment.assignment}
                                                                        onChange={(e) => {
                                                                            handleAssignmentChange(categoryIndex, assignmentIndex, "assignment", e.target.value);
                                                                            if (validationErrors[`category-${categoryIndex}-assignment-${assignmentIndex}-name`]) {
                                                                                const newErrors = {...validationErrors};
                                                                                delete newErrors[`category-${categoryIndex}-assignment-${assignmentIndex}-name`];
                                                                                setValidationErrors(newErrors);
                                                                            }
                                                                        }}
                                                                        placeholder="Assignment name (e.g. Homework #1)"
                                                                    />
                                                                    <div className="flex flex-row gap-1 items-center justify-center">
                                                                        <input
                                                                            className={`bg-nexus900 tinyText w-10 text-white block rounded-md focus:outline-none p-1 ${
                                                                                validationErrors[`category-${categoryIndex}-assignment-${assignmentIndex}-grade`]
                                                                                ? 'border-2 border-[#D73A49] focus:border-[#D73A49] focus:ring-[#D73A49]'
                                                                                : ''
                                                                            }`}
                                                                            value={assignment.grade}
                                                                            onChange={(e) => {
                                                                                handleAssignmentChange(categoryIndex, assignmentIndex, "grade", e.target.value);
                                                                                if (validationErrors[`category-${categoryIndex}-assignment-${assignmentIndex}-grade`]) {
                                                                                    const newErrors = {...validationErrors};
                                                                                    delete newErrors[`category-${categoryIndex}-assignment-${assignmentIndex}-grade`];
                                                                                    setValidationErrors(newErrors);
                                                                                }
                                                                            }}
                                                                            placeholder="25">
                                                                        </input>
                                                                        /
                                                                        <input
                                                                            className={`bg-nexus900 tinyText w-10 text-white block rounded-md focus:outline-none p-1 ${
                                                                                validationErrors[`category-${categoryIndex}-assignment-${assignmentIndex}-weight`]
                                                                                ? 'border-2 border-[#D73A49] focus:border-[#D73A49] focus:ring-[#D73A49]'
                                                                                : ''
                                                                            }`}
                                                                            value={assignment.weight}
                                                                            onChange={(e) => {
                                                                                handleAssignmentChange(categoryIndex, assignmentIndex, "weight", e.target.value);
                                                                                if (validationErrors[`category-${categoryIndex}-assignment-${assignmentIndex}-weight`]) {
                                                                                    const newErrors = {...validationErrors};
                                                                                    delete newErrors[`category-${categoryIndex}-assignment-${assignmentIndex}-weight`];
                                                                                    setValidationErrors(newErrors);
                                                                                }
                                                                            }}
                                                                            placeholder="30">
                                                                        </input>
                                                                    </div>
                                                                </div>

                                                                    {/* PERCENTAGE BAR */}
                                                                    <div className="flex flex-row items-center justify-center gap-2">
                                                                        <div className="w-full h-2 bg-nexus900 overflow-hidden rounded-full">
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
                                                                <div className="flex">
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
                                                            </div>
                                                        );
                                                    })}
                                                    
                                                    <div className="flex flex-row items-center gap-4">
                                                        <div className="flex flex-row flex-1 pl-4">
                                                            <h1 className="flex tinyText text-white"><strong>Total Grade: {' '}</strong></h1> 
                                                            <h2 className="flex ml-1 tinyText text-white">{categoryGrades[categoryIndex] || ' N/A'}</h2>
                                                        </div>
                                                        <Button className="bg-nexus800 flex gap-1 flex-1" onClick={() => addAssignmentRow(categoryIndex)} text={'Add Assignment'} icon={<HiPlus size={25}/>}/>
                                                    </div>
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
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex w-full items-center justify-center"
                        >
                            <motion.div
                                className="rounded-lg flex flex-col justify-center items-center bg-nexus900 w-[clamp(300px,70%,2000px)] mb-20 text-center"
                                layout={"position"}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{duration: 0.15, type: 'tween'}}

                            >
                                <div className="flex flex-row justify-center items-center gap-4 bg-nexus600 w-full py-4 rounded-t-lg ">
                                    <h1 className="bodyText text-nexus50"><strong>Overall Grade: </strong> {overallGrade}%</h1>
                                </div>
                                <div className={`flex flex-row items-start justify-between bg-nexus800 w-[95%] ${isMobile ? 'px-4' : 'px-12'} my-4 rounded-lg py-2 gap-6 `}>
                                    <div className="flex flex-col items-center justify-center gap-2 tinyText relative">
                                        <h1 className="tinyText text-nexus50"><strong>Remaining Assignment Weight:</strong> </h1>
                                        <h1 className="relative items-center justify-center flex">
                                            {remainingWeight}%
                                            {remainingWeight == 0 && (
                                                <div className="flex flex-row items-center justify-center absolute gap-2 left-6 select-none" ref={infoRef}>
                                                    <div className="flex">
                                                        <HiExclamationCircle onClick={() => setWarningOpen(!warningOpen)} className="flex cursor-pointer" />
                                                    </div>
                                                    <AnimatePresence>                                                    
                                                        {warningOpen && (
                                                        <motion.div
                                                                    className="w-[clamp(200px,45vw,300px)] bg-white tinyText text-nexus900 items-center justify-center flex p-2 rounded-lg"
                                                                    initial={{scaleX: 0, opacity: 0, originX: 0}}
                                                                    animate={{scaleX: 1, opacity: 1,  originX: 0}}
                                                                    exit={{scaleX: 0, opacity: 0}}
                                                                    transition={{duration:0.1}}>
                                                                    
                                                            The Grade Needed for your Desired Grade can't be calculated if the Remaining Assignment Weight is 0!
                                                        </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </h1>
                                    </div>
                                    <div className="flex flex-col items-center justify-center ">
                                        <h1 className="tinyText text-nexus50"><strong>Desired Class Grade:</strong></h1>
                                        <input
                                            id="classGrade"
                                            type="text"
                                            inputMode="numeric"  
                                            pattern="[0-9]*"    
                                            className="font-titilliumWeb-bold mt-1 block tinyText text-center min-w-10 w-[20%] bg-nexus50 rounded-md border-gray-300 focus:outline-none text-nexus800 p-1"
                                            value={classGrade}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                                    setClassGrade(value);
                                                }
                                            }}
                                            required
                                        />
                                    </div>
                                    <div className="flex flex-col items-center justify-center tinyText gap-2">
                                        <h1 className="text-nexus50">
                                            Grade Needed on Remaining Category:
                                        </h1>
                                        {requiredGrade === null ? 
                                            "Not Possible" : 
                                            `${requiredGrade}%`
                                        }
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* INFO BUTTON */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="fixed top-24 right-8 flex flex-col gap-2 ">
                        <HiQuestionMarkCircle className="cursor-pointer" size={25} onClick={() => setInfoOpen(true)}/>
                    </motion.div>

                    {/* BUTTONS */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="fixed bottom-6 right-4 flex flex-col gap-2"
                    >
                        <Button className="p-1 gap-2" text={"Add Category"} icon={<HiPlus/>} onClick={addCategory}/>
                        <Button className="p-1 px-2 gap-2" text={editMode ? 'Update Calculation' : 'Save Calculation'} icon={<HiOutlineSave/>} onClick={() => {
                            setValidationErrors({});
                            setSaveDialogOpen(true);
                        }}/>
                        
                        <Modal
                            open={saveDialogOpen}
                            onClose={() => setSaveDialogOpen(false)}
                            closeAfterTransition
                            className="fixed flex items-center justify-center"
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
                                            className="px-4 py-2 bg-nexus500 text-white text-xl rounded-md transition duration-300 hover:bg-nexus600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={handleSaveGradeHistory}
                                            disabled={!saveTitle.trim() || !selectedCourseForSave || isSaving}
                                        >
                                            {isSaving ? 'Saving...' : (editMode ? 'Update' : 'Save')}
                                        </button>
                                        </div>

                                    </div>
                                </div>
                            </Fade>
                        </Modal>

                    </motion.div>
                </div>
            </div>
        </>
    );
};

export default GradeCalculator;