const {db} = require('../../../../config/firebaseAdmin.js');

module.exports = async (req, res) => {
    if (req.method !== 'DELETE') {
        return res.status(405).json({error: 'Method not allowed'});
    }

    try {
        const uidRaw = req.query.uid;
        const courseIdRaw = req.query.courseId;
        const gradeIdRaw = req.query.gradeId;

        const uid = Array.isArray(uidRaw) ? uidRaw[0] : uidRaw;
        const courseId = Array.isArray(courseIdRaw) ? courseIdRaw[0] : courseIdRaw;
        const gradeId = Array.isArray(gradeIdRaw) ? gradeIdRaw[0] : gradeIdRaw;

        if (!uid || !courseId || !gradeId) {
            return res.status(400).json({error: 'UID, Course ID, and Grade ID are required'});
        }

        const docRef = db.collection('courseGrades').doc(uid);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({error: 'Course grades not found'});
        }

        const data = doc.data();
        const gradeHistories = data.gradeHistories || [];

        const updatedHistories = gradeHistories.filter((grade) => grade.id !== gradeId);

        if (updatedHistories.length === gradeHistories.length) {
            return res.status(404).json({error: 'Grade entry not found'});
        }

        if (updatedHistories.length === 0) {
            await docRef.delete();
        } else {
            await docRef.update({
                gradeHistories: updatedHistories,
                lastUpdated: Date.now(),
            });
        }

        return res.status(200).json({message: 'Grade entry deleted successfully'});
    } catch (error) {
        console.error('Error deleting grade:', error);
        return res.status(500).json({error: error.message});
    }
};
