const express = require('express');
const router = express.Router();
const axios = require('axios');
const admin = require('firebase-admin');
require('dotenv').config();

const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  FIREBASE_PROJECT_ID
} = process.env;

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('../service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: FIREBASE_PROJECT_ID
  });
  console.log('✅ Firebase Admin initialized');
}

const tokenRequests = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Exchange code for Discord token
const getDiscordToken = async (code, retries = 3) => {
  const now = Date.now();
  const userRequests = tokenRequests.get(code) || [];
  const recentRequests = userRequests.filter(t => now - t < 60000);
  if (recentRequests.length >= 5) {
    throw new Error('Rate limit exceeded. Please wait before trying again.');
  }
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
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      return tokenResponse.data.access_token;
    } catch (err) {
      console.error(`Token request attempt ${i + 1} failed:`, err.response?.data || err.message);
      if (err.response?.status === 429) {
        const retryAfter = err.response.headers['retry-after'] || (i + 1) * 2;
        await sleep(retryAfter * 1000);
        continue;
      }
      if (err.response?.data?.error === 'invalid_request' && i < retries - 1) {
        await sleep(2000 * (i + 1));
        continue;
      }
      throw err;
    }
  }
};

// UNLINK endpoint
router.post('/unlink', async (req, res) => {
  try {
    const { uid } = req.body;
    console.log(`👉 Unlink request for UID: ${uid}`);

    if (!uid) {
      return res.status(400).json({ error: 'Missing UID' });
    }

    const userRef = admin.firestore().collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log(`❌ User not found: ${uid}`);
      return res.status(404).json({ error: 'User not found' });
    }

    await userRef.update({
      discordId: null,
      discordUsername: null,
      discordEmail: null,
      discordAvatar: null,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Discord unlinked for user: ${uid}`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Unlink error:', err);
    res.status(500).json({ error: 'Failed to unlink Discord account' });
  }
});

// ALLOCATE endpoint — forwards to bot server
router.post('/allocate', async (req, res) => {
  try {
    console.log('👉 Backend allocation request:', req.body);
    const { discordId, courses } = req.body;

    if (!discordId || !courses || !Array.isArray(courses)) {
      return res.status(400).json({ error: 'Missing or invalid discordId or courses' });
    }

    // Send to bot server
    const botResponse = await axios.post('http://localhost:3000/bot/allocate', {
      discordId,
      courses
    });

    res.json(botResponse.data);
  } catch (err) {
    console.error('❌ Backend allocation error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to allocate courses via bot', details: err.response?.data || err.message });
  }
});

// AUTH endpoint
router.get('/auth', (req, res) => {
  const { uid } = req.query;
  console.log(`👉 Auth request for UID: ${uid}`);

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

  const url = `https://discord.com/oauth2/authorize?${params.toString()}`;
  console.log(`🔗 Redirecting to: ${url}`);
  res.redirect(url);
});

// CALLBACK endpoint
router.get('/callback', async (req, res) => {
  console.log('👉 Callback received:', req.query);
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
    const token = await getDiscordToken(code);
    console.log('✅ Access token retrieved');

    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const discordUser = userRes.data;
    console.log('✅ Discord user:', discordUser);

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
  } catch (err) {
    console.error('❌ Callback error:', err);
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