const {db} = require('../../../config/firebaseAdmin');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({error: 'Method not allowed'});
    }

    try {
        const uidRaw = req.query.uid;
        const courseIdRaw = req.query.courseId;

        const uid = Array.isArray(uidRaw) ? uidRaw[0] : uidRaw;
        const courseId = Array.isArray(courseIdRaw) ? courseIdRaw[0] : courseIdRaw;

        if (!uid || !courseId) {
            return res.status(400).json({error: 'User ID and Course ID are required'});
        }

        const doc = await db.collection('courseGrades').doc(uid).get();

        if (!doc.exists) {
            return res.status(200).json([]);
        }

        const data = doc.data();
        const allHistories = data.gradeHistories || [];

        const courseHistories = allHistories.filter((grade) => grade.courseId === courseId);

        courseHistories.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        return res.status(200).json(courseHistories);
    } catch (error) {
        console.error('Error fetching grades:', error);
        return res.status(500).json({error: error.message});
    }
};
