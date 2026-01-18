const admin = require('firebase-admin');
require('./config/firebaseAdmin.cjs')
require('dotenv').config();

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({success: false, error: 'Method not allowed'});
    }

    try {
        const {id, token, courses, meta} = req.body;

        if (!id || !token || !Array.isArray(courses)) {
            return res.status(400).json({success: false, error: 'Missing required fields: id, token, or courses'});
        }

        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(token);
        } catch (error) {
            console.error('Token verification failed:', error);
            return res.status(403).json({success: false, error: 'Invalid or expired authentication token'});
        }

        if (decodedToken.uid !== id) {
            return res.status(403).json({success: false, error: 'Token does not match user ID'});
        }

        try {
            const userRef = admin.firestore().collection('users').doc(id);
            const payload = {
                lastTranscriptUpload: new Date().toISOString(),
                courses
            };

            if (meta && typeof meta === 'object') {
                if (meta.netId) payload.netId = meta.netId;
            }

            await userRef.set(payload, {merge: true});
        } catch (firestoreError) {
            console.error('Error saving to Firestore:', firestoreError);
            return res.status(500).json({success: false, error: 'Failed to save transcript data'});
        }

        return res.status(200).json({success: true, message: 'Transcript saved'});
    } catch (error) {
        console.error('Error in /api/confirm-transcript:', error);
        return res.status(500).json({success: false, error: 'Internal server error'});
    }
};
