const {db} = require('../../config/firebaseAdmin.cjs');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({error: 'Method not allowed'});
    }

    try {
        const uidRaw = req.query.uid;
        const uid = Array.isArray(uidRaw) ? uidRaw[0] : uidRaw;

        if (!uid) {
            return res.status(400).json({error: 'User ID is required'});
        }

        const doc = await db.collection('courseGrades').doc(uid).get();

        if (!doc.exists) {
            return res.status(200).json([]);
        }

        const data = doc.data();
        const allHistories = data.gradeHistories || [];

        const coursesMap = {};
        allHistories.forEach((grade) => {
            if (!coursesMap[grade.courseId]) {
                coursesMap[grade.courseId] = {
                    courseId: grade.courseId,
                    gradeCount: 0,
                    lastUpdated: grade.timestamp,
                };
            }
            coursesMap[grade.courseId].gradeCount++;
            if (grade.timestamp > coursesMap[grade.courseId].lastUpdated) {
                coursesMap[grade.courseId].lastUpdated = grade.timestamp;
            }
        });

        const courses = Object.values(coursesMap);
        return res.status(200).json(courses);
    } catch (error) {
        console.error('Error fetching user courses:', error);
        return res.status(500).json({error: error.message});
    }
};
