const express = require("express");
const { db } = require("../config/firebase-config.js");
const { FieldValue } = require("firebase-admin/firestore");

const router = express.Router();

router.post("/saveGrades", async (req, res) => {
    try {
        const { uid, courseId, saveTitle, categories, requiredGrade, currentGrade, desiredGrade } = req.body;
        
        if (!uid || !courseId || !saveTitle || !categories) {
            return res.status(400).json({ error: "Required fields missing." });
        }

        const newGradeEntry = {
            courseId,
            saveTitle,
            categories: categories.map((category) => ({
                categoryName: category.categoryName,
                categoryWeight: category.categoryWeight,
                categoryGrade: category.categoryGrade,
                assignments: category.assignments.map((assignment) => ({
                    assignmentName: assignment.assignmentName,
                    grade: assignment.grade,
                    weight: assignment.weight
                }))
            })),
            requiredGrade,
            currentGrade,
            desiredGrade,
            timestamp: Date.now(),
            id: Date.now().toString() 
        };

        try {
            const docRef = db.collection("courseGrades").doc(uid);
            const doc = await docRef.get();
            
            if (doc.exists) {
                await docRef.update({
                    gradeHistories: FieldValue.arrayUnion(newGradeEntry),
                    lastUpdated: Date.now()
                });
            } else {
                await docRef.set({
                    uid,
                    gradeHistories: [newGradeEntry],
                    createdAt: Date.now(),
                    lastUpdated: Date.now()
                });
            }
            
            res.status(201).json({ 
                message: "Grade history saved successfully",
                gradeId: newGradeEntry.id
            });
        } catch (error) {
            console.error("Error saving grade:", error);
            res.status(500).json({ error: error.message });
        }
    } catch (error) {
        console.error("Detailed error:", error);
        res.status(500).json({ error: error.message });
    }
});


router.get("/getGradesByCourse/:uid/:courseId", async (req, res) => {
    try {
        const { uid, courseId } = req.params;
        
        if (!uid || !courseId) {
            return res.status(400).json({ error: "User ID and Course ID are required" });
        }

        const doc = await db.collection("courseGrades").doc(uid).get();
        
        if (!doc.exists) {
            return res.status(200).json([]);
        }
        
        const data = doc.data();
        const allHistories = data.gradeHistories || [];
        
        // Filter by courseId
        const courseHistories = allHistories.filter(grade => grade.courseId === courseId);
        
        // Sort by timestamp
        courseHistories.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        res.status(200).json(courseHistories);
    } catch (error) {
        console.error("Error fetching grades:", error);
        res.status(500).json({ error: error.message });
    }
});

router.get("/getUserCourses/:uid", async (req, res) => {
    try {
        const uid = req.params.uid;
        
        if (!uid) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const doc = await db.collection("courseGrades").doc(uid).get();
        
        if (!doc.exists) {
            return res.status(200).json([]);
        }
        
        const data = doc.data();
        const allHistories = data.gradeHistories || [];
        
        // Group by courseId and get counts
        const coursesMap = {};
        allHistories.forEach((grade) => {
            if (!coursesMap[grade.courseId]) {
                coursesMap[grade.courseId] = {
                    courseId: grade.courseId,
                    gradeCount: 0,
                    lastUpdated: grade.timestamp
                };
            }
            coursesMap[grade.courseId].gradeCount++;
            if (grade.timestamp > coursesMap[grade.courseId].lastUpdated) {
                coursesMap[grade.courseId].lastUpdated = grade.timestamp;
            }
        });
        
        const courses = Object.values(coursesMap);
        
        res.status(200).json(courses);
    } catch (error) {
        console.error("Error fetching user courses:", error);
        res.status(500).json({ error: error.message });
    }
});

router.put("/updateGrade/:uid/:gradeId", async (req, res) => {
    try {
        const { uid, gradeId } = req.params;
        const { courseId, saveTitle, categories, requiredGrade, currentGrade, desiredGrade } = req.body;
        
        if (!uid || !gradeId) {
            return res.status(400).json({ error: "User ID and Grade ID are required" });
        }

        const docRef = db.collection("courseGrades").doc(uid);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            return res.status(404).json({ error: "Course grades not found" });
        }
        
        const data = doc.data();
        const gradeHistories = data.gradeHistories || [];
        
        const gradeIndex = gradeHistories.findIndex(grade => grade.id === gradeId);
        
        if (gradeIndex === -1) {
            return res.status(404).json({ error: "Grade entry not found" });
        }
        
        // Update the grade entry while preserving the original ID and timestamp
        gradeHistories[gradeIndex] = {
            ...gradeHistories[gradeIndex],
            courseId,
            saveTitle,
            categories: categories.map((category) => ({
                categoryName: category.categoryName,
                categoryWeight: category.categoryWeight,
                categoryGrade: category.categoryGrade,
                assignments: category.assignments.map((assignment) => ({
                    assignmentName: assignment.assignmentName,
                    grade: assignment.grade,
                    weight: assignment.weight
                }))
            })),
            requiredGrade,
            currentGrade,
            desiredGrade,
            lastModified: Date.now()
        };
        
        await docRef.update({
            gradeHistories: gradeHistories,
            lastUpdated: Date.now()
        });
        
        res.status(200).json({ 
            message: "Grade entry updated successfully",
            gradeId: gradeId
        });
    } catch (error) {
        console.error("Error updating grade:", error);
        res.status(500).json({ error: error.message });
    }
});

router.delete("/deleteGrade/:uid/:courseId/:gradeId", async (req, res) => {
    try {
        const { uid, courseId, gradeId } = req.params;
        
        if (!uid || !courseId || !gradeId) {
            return res.status(400).json({ error: "UID, Course ID, and Grade ID are required" });
        }

        const docRef = db.collection("courseGrades").doc(uid);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            return res.status(404).json({ error: "Course grades not found" });
        }
        
        const data = doc.data();
        const gradeHistories = data.gradeHistories || [];
        
        const updatedHistories = gradeHistories.filter(grade => grade.id !== gradeId);
        
        if (updatedHistories.length === gradeHistories.length) {
            return res.status(404).json({ error: "Grade entry not found" });
        }
        
        if (updatedHistories.length === 0) {
            await docRef.delete();
        } else {
            await docRef.update({
                gradeHistories: updatedHistories,
                lastUpdated: Date.now()
            });
        }
        
        res.status(200).json({ message: "Grade entry deleted successfully" });
    } catch (error) {
        console.error("Error deleting grade:", error);
        res.status(500).json({ error: error.message });
    }
});

router.delete("/deleteUserData/:uid", async (req, res) => {
    try {
        const { uid } = req.params;
        
        if (!uid) {
            return res.status(400).json({ error: "User ID is required" });
        }

        // Delete user's course grades
        const gradesDocRef = db.collection("courseGrades").doc(uid);
        const gradesDoc = await gradesDocRef.get();
        
        if (gradesDoc.exists) {
            await gradesDocRef.delete();
        }
        
        res.status(200).json({ 
            message: "User data deleted successfully",
            deletedCollections: ["courseGrades"]
        });
    } catch (error) {
        console.error("Error deleting user data:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;