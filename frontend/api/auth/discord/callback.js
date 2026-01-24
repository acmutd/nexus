const axios = require('axios');
const admin = require('firebase-admin');
// require('dotenv').config();

if (!admin.apps.length) {
    // todo - this jawn needs to be put in vercel env too
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: FIREBASE_PROJECT_ID,
    });

    console.log('Firebase Admin initialized');
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({success: false, error: 'Method not allowed'});
    }

    try {
        const {discordId} = req.body;

        if (!discordId) {
            return res.status(400).json({
                success: false,
                error: 'Missing discordId in request body',
            });
        }

        const userQuery = await admin
            .firestore()
            .collection('users')
            .where('discordId', '==', discordId)
            .get();

        if (userQuery.empty) {
            return res.status(404).json({
                success: false,
                message: 'No user found with that Discord ID',
            });
        }

        const userData = userQuery.docs[0].data();
        const servers = userData.servers || [];
        const courses = userData.courses || [];

        if (servers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No joined servers recorded for this user',
            });
        }

        const botResponse = await axios.post(
            // todo - make this not localhost
            'http://localhost:3000/discord/allocateToJoinedServer',
            {discordId, servers, courses}
        );

        return res.status(200).json({
            success: true,
            message: 'Successfully sent allocation request to bot',
            botResponse: botResponse.data,
        });
    } catch (error) {
        console.error('Error in /discord/callback:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message,
        });
    }
};
