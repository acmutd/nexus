import express from 'express';
import axios from 'axios';
import admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';
//import serviceAccount from '../service-account.json' assert { type: 'json' };
import fs from "fs";


dotenv.config();
const router = express.Router();

const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  GOOGLE_APPLICATION_CREDENTIALS,
  FIREBASE_PROJECT_ID
} = process.env;

// Initialize Firebase Admin if not already initialized
const serviceAccount = JSON.parse(fs.readFileSync(path.resolve('./service-account.json'), 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: FIREBASE_PROJECT_ID
  });
  console.log('Firebase Admin initialized');
}

// Add rate limiting map
const tokenRequests = new Map();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getDiscordToken = async (code, retries = 3) => {
  // Check rate limiting
  const now = Date.now();
  const userRequests = tokenRequests.get(code) || [];
  const recentRequests = userRequests.filter(time => now - time < 60000); // Last minute

  if (recentRequests.length >= 5) {
    throw new Error('Rate limit exceeded. Please wait before trying again.');
  }

  // Update rate limiting tracking
  tokenRequests.set(code, [...recentRequests, now]);

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
      console.error(`Token request attempt ${i + 1} failed:`, error.response?.data);
      
      if (error.response?.status === 429) { // Rate limit hit
        const retryAfter = error.response.headers['retry-after'] || (i + 1) * 2;
        await sleep(retryAfter * 1000);
        continue;
      }

      if (error.response?.data?.error === 'invalid_request' && i < retries - 1) {
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

// Endpoint to unlink Discord account
router.post('/unlink', async (req, res) => {
  const { uid } = req.body;
  console.log('Unlinking Discord account for user:', uid);
  
  if (!uid) {
    return res.status(400).json({ error: 'Missing UID parameter' });
  }

  try {
    const userRef = admin.firestore().collection('users').doc(uid);
    
    // Check if user exists
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    await userRef.update({
      discordId: null,
      discordUsername: null,
      discordEmail: null,
      discordAvatar: null,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Successfully unlinked Discord account for user:', uid);
    res.json({ success: true, message: 'Discord account unlinked successfully' });
  } catch (error) {
    console.error('Error unlinking Discord account:', error);
    res.status(500).json({ error: 'Failed to unlink Discord account' });
  }
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

    // Fetch Discord user data with retry logic
    let discordUser;
    try {
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      discordUser = userResponse.data;
      console.log('Discord user data received:', discordUser);
    } catch (error) {
      if (error.response?.status === 429) {
        await sleep(error.response.headers['retry-after'] * 1000 || 5000);
        const retryResponse = await axios.get('https://discord.com/api/users/@me', {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });
        discordUser = retryResponse.data;
      } else {
        throw error;
      }
    }

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

export default router;