const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

const { 
  DISCORD_CLIENT_ID, 
  DISCORD_CLIENT_SECRET, 
  DISCORD_REDIRECT_URI 
} = process.env;

// Endpoint to initiate Discord OAuth
router.get('/auth', (req, res) => {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify',
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// Callback endpoint for Discord OAuth
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: DISCORD_REDIRECT_URI,
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token } = tokenResponse.data;

    // Get user information using the access token
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    // Send the user data back to the frontend
    res.send(`
      <script>
        window.opener.postMessage(${JSON.stringify(userResponse.data)}, "*");
        window.close();
      </script>
    `);
  } catch (error) {
    console.error('Discord authentication error:', error);
    res.status(500).send('Failed to authenticate with Discord');
  }
});

module.exports = router;