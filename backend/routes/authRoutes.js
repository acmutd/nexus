const express = require('express');
const axios = require('axios');
const admin = require('firebase-admin');

const router = express.Router();

router.post('/discord/callback', async (req, res) => {
  try {
    const { discordId } = req.body;

    if (!discordId) {
      return res.status(400).json({
        success: false,
        error: 'Missing discordId in request body'
      });
    }

    // Look up user document in Firestore
    const userQuery = await admin.firestore()
      .collection('users')
      .where('discordId', '==', discordId)
      .get();

    if (userQuery.empty) {
      return res.status(404).json({
        success: false,
        message: 'No user found with that Discord ID'
      });
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    const servers = userData.servers || [];
    const courses = userData.courses || [];

    if (servers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No joined servers recorded for this user'
      });
    }

    // Call bot API to allocate courses
    const botResponse = await axios.post('http://localhost:3000/discord/allocateToJoinedServer', {
      discordId,
      servers,
      courses
    });

    return res.status(200).json({
      success: true,
      message: 'Successfully sent allocation request to bot',
      botResponse: botResponse.data
    });

  } catch (error) {
    console.error('Error in /discord/callback:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;