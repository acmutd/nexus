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

        const docId = `${uid}_${courseId}`;
        const newGradeEntry = {
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
            const docRef = db.collection("courseGrades").doc(docId);
            const doc = await docRef.get();
            
            if (doc.exists) {
                await docRef.update({
                    gradeHistories: FieldValue.arrayUnion(newGradeEntry),
                    lastUpdated: Date.now()
                });
            } else {
                await docRef.set({
                    uid,
                    courseId,
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

        const docId = `${uid}_${courseId}`;
        const doc = await db.collection("courseGrades").doc(docId).get();
        
        if (!doc.exists) {
            return res.status(200).json([]);
        }
        
        const data = doc.data();
        const gradeHistories = data.gradeHistories || [];
        
        gradeHistories.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        res.status(200).json(gradeHistories);
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

        const snapshot = await db.collection("courseGrades")
            .where("uid", "==", uid)
            .get();
        
        const courses = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            courses.push({
                courseId: data.courseId,
                gradeCount: data.gradeHistories ? data.gradeHistories.length : 0,
                lastUpdated: data.lastUpdated
            });
        });
        
        res.status(200).json(courses);
    } catch (error) {
        console.error("Error fetching user courses:", error);
        res.status(500).json({ error: error.message });
    }
});

router.delete("/deleteGrade/:uid/:courseId/:gradeId", async (req, res) => {
    try {
        const { uid, courseId, gradeId } = req.params;
        
        if (!uid || !courseId || !gradeId) {
            return res.status(400).json({ error: "UID, Course ID, and Grade ID are required" });
        }

        const docId = `${uid}_${courseId}`;
        const docRef = db.collection("courseGrades").doc(docId);
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

module.exports = router;