const axios = require('axios');
const {admin} = require('../config/firebaseAdmin.js');

// require('dotenv').config()

const {DISCORD_BOT_URL} = process.env;

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({error: 'Method not allowed'});
    }

    try {
        const {uid} = req.body;
        const authHeader = req.headers.authorization;
        console.log(`Unlink request for UID: ${uid}`);

        if (!uid) {
            return res.status(400).json({error: 'Missing UID'});
        }

        // Extract ID token from Authorization header
        const idToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        if (!idToken) {
            return res.status(401).json({error: 'Missing authorization token'});
        }

        const userRef = admin.firestore().collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            console.log(`User not found: ${uid}`);
            return res.status(404).json({error: 'User not found'});
        }

        const userData = userDoc.data();
        const discordId = userData?.discord?.id;

        // Remove Discord info from database first
        await userRef.update({
            discord: admin.firestore.FieldValue.delete(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Discord unlinked for user: ${uid}`);

        // Remove Discord channel access via bot API
        if (discordId) {
            try {
                console.log(`Removing channel access for Discord ID: ${discordId}`);

                const botResponse = await axios.post(
                    `${DISCORD_BOT_URL}/api/discord/remove-access`,
                    {discordId: discordId},
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${idToken}`,
                        },
                    }
                );

                console.log('Bot access removal response:', botResponse.data);
            } catch (botError) {
                console.warn(
                    'Failed to remove Discord channel access:',
                    botError.response?.data || botError.message
                );
                // Continue anyway - database unlink succeeded
            }
        }

        return res.json({success: true});
    } catch (err) {
        console.error('Unlink error:', err);
        return res.status(500).json({error: 'Failed to unlink Discord account'});
    }
};
