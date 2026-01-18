const {db} = require('../config/firebaseAdmin.cjs');
const {FieldValue} = require('firebase-admin/firestore');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({error: 'Method not allowed'});
    }

    try {
        const {uid, courseId, saveTitle, categories, requiredGrade, currentGrade, desiredGrade} = req.body;

        if (!uid || !courseId || !saveTitle || !categories) {
            return res.status(400).json({error: 'Required fields missing.'});
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
                    weight: assignment.weight,
                })),
            })),
            requiredGrade,
            currentGrade,
            desiredGrade,
            timestamp: Date.now(),
            id: Date.now().toString(),
        };

        try {
            const docRef = db.collection('courseGrades').doc(uid);
            const doc = await docRef.get();

            if (doc.exists) {
                await docRef.update({
                    gradeHistories: FieldValue.arrayUnion(newGradeEntry),
                    lastUpdated: Date.now(),
                });
            } else {
                await docRef.set({
                    uid,
                    gradeHistories: [newGradeEntry],
                    createdAt: Date.now(),
                    lastUpdated: Date.now(),
                });
            }

            return res.status(201).json({
                message: 'Grade history saved successfully',
                gradeId: newGradeEntry.id,
            });
        } catch (error) {
            console.error('Error saving grade:', error);
            return res.status(500).json({error: error.message});
        }
    } catch (error) {
        console.error('Detailed error:', error);
        return res.status(500).json({error: error.message});
    }
};
