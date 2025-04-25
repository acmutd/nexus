const express = require('express');
const router = express.Router();
const axios = require('axios');
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

const { 
  DISCORD_CLIENT_ID, 
  DISCORD_CLIENT_SECRET,
  GOOGLE_APPLICATION_CREDENTIALS,
  FIREBASE_PROJECT_ID
} = process.env;

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('../service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: FIREBASE_PROJECT_ID
  });
  console.log('Firebase Admin initialized');
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getDiscordToken = async (code, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const tokenResponse = await axios.post(
        'https://discord.com/api/oauth2/token',
        new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: 'http://localhost:5001/api/discord/callback'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      return tokenResponse.data.access_token;
    } catch (error) {
      if (error.response?.data?.error === 'invalid_request' && i < retries - 1) {
        console.log(`Attempt ${i + 1} failed, waiting before retry...`);
        await sleep(2000 * (i + 1)); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
};

// Endpoint to initiate Discord OAuth
router.get('/auth', (req, res) => {
  const { uid } = req.query;
  console.log('Discord auth initiated for user:', uid);

  if (!uid) {
    return res.status(400).send('Missing UID parameter');
  }

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: 'http://localhost:5001/api/discord/callback',
    response_type: 'code',
    scope: 'identify email',
    state: uid
  });

  const redirectUrl = `https://discord.com/oauth2/authorize?${params}`;
  console.log('Redirecting to Discord:', redirectUrl);
  res.redirect(redirectUrl);
});

// Callback endpoint for Discord OAuth
router.get('/callback', async (req, res) => {
  console.log('Received callback with query params:', req.query);
  const { code, state: uid } = req.query;

  if (!code || !uid) {
    return res.status(400).send(`
      <script>
        window.opener.postMessage({ 
          type: 'DISCORD_AUTH_ERROR',
          error: 'Missing required parameters'
        }, '*');
        window.close();
      </script>
    `);
  }

  try {
    console.log('Attempting to get access token...');
    const access_token = await getDiscordToken(code);
    console.log('Access token obtained');

    // Fetch Discord user data
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const discordUser = userResponse.data;
    console.log('Discord user data received:', discordUser);

    // Update Firestore
    const userRef = admin.firestore().collection('users').doc(uid);
    await userRef.update({
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      discordEmail: discordUser.email,
      discordAvatar: discordUser.avatar,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    res.send(`
      <script>
        window.opener.postMessage({
          type: 'DISCORD_AUTH_SUCCESS',
          data: {
            username: '${discordUser.username}',
            id: '${discordUser.id}',
            email: '${discordUser.email}',
            avatar: '${discordUser.avatar}'
          }
        }, '*');
        window.close();
      </script>
    `);

  } catch (error) {
    console.error('Discord authentication error:', error.response?.data || error.message);
    res.status(500).send(`
      <script>
        window.opener.postMessage({
          type: 'DISCORD_AUTH_ERROR',
          error: 'Failed to authenticate with Discord'
        }, '*');
        window.close();
      </script>
    `);
  }
});

module.exports = router;