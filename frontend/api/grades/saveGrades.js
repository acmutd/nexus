const {db} = require('../config/firebaseAdmin.js');
const {FieldValue} = require('firebase-admin/firestore');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({error: 'Method not allowed'});
    }

    try {
        const {uid, courseId, saveTitle, categories, requiredGrade, currentGrade, desiredGrade, gradeId} = req.body;

        if (!uid || !courseId || !saveTitle || !categories) {
            return res.status(400).json({error: 'Required fields missing.'});
        }

        const docRef = db.collection('courseGrades').doc(uid);
        const doc = await docRef.get();

        if (gradeId) {
            if (!doc.exists) {
                return res.status(404).json({error: 'User grade history not found'});
            }

            const data = doc.data();
            const gradeHistories = data.gradeHistories || [];

            const gradeIndex = gradeHistories.findIndex(grade => grade.id === gradeId);

            if (gradeIndex === -1) {
                return res.status(404).json({error: 'Grade entry not found'});
            }

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
                        weight: assignment.weight,
                    })),
                })),
                requiredGrade,
                currentGrade,
                desiredGrade,
                timestamp: Date.now(),
            };

            await docRef.update({
                gradeHistories: gradeHistories,
                lastUpdated: Date.now(),
            });

            return res.status(200).json({
                message: 'Grade history updated successfully',
                gradeId: gradeId,
            });
        } 
        else {
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
        }
    } catch (error) {
        console.error('Detailed error:', error);
        return res.status(500).json({error: error.message});
    }
};