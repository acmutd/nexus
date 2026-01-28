const {db} = require('../config/firebaseAdmin.js');

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

        const doc = await db.collection('users').doc(uid).get();

        if (!doc.exists) {
            console.log(`[getCourses] uid=${uid} doc not found`);
            return res.status(200).json([]);
        }

        const data = doc.data();
        const courses = data.courses || [];

        console.log(`[getCourses] uid=${uid} courses=${Array.isArray(courses) ? courses.length : 'n/a'}`);

        return res.status(200).json(courses);
    } catch (error) {
        console.error('Error fetching user courses:', error);
        return res.status(500).json({error: error.message});
    }
};
