const axios = require('axios');
const admin = require('firebase-admin');

require('dotenv').config()

const {
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    DISCORD_BOT_URL,
    FIREBASE_PROJECT_ID,
} = process.env;

if (!admin.apps.length) {
    // todo - this jawn needs to be put in vercel env too
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: FIREBASE_PROJECT_ID,
    });

    console.log('Firebase Admin initialized');
}

const tokenRequests = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function discordAvatarUrl(id, avatarHash) {
    if (id && avatarHash) {
        const ext = String(avatarHash).startsWith('a_') ? 'gif' : 'png';
        return `https://cdn.discordapp.com/avatars/${id}/${avatarHash}.${ext}?size=128`;
    }
    try {
        const idx = Number(BigInt(id) % 6n);
        return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
    } catch {
        return `https://cdn.discordapp.com/embed/avatars/0.png`;
    }
}

const getDiscordToken = async (code, retries = 3) => {
    const now = Date.now();
    const userRequests = tokenRequests.get(code) || [];
    const recentRequests = userRequests.filter((t) => now - t < 60000);
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
                    // todo - add this jawn to vercel's env (url to callback route, like nexus.vercel.app/api/discord/callback, wtv it is)
                    redirect_uri: process.env.DISCORD_REDIRECT_URI,
                }).toString(),
                {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}
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

module.exports = async (req, res) => {
    if (req.method !== 'GET') return res.status(405).send('Method not allowed');

    console.log('Callback received:', req.query);
    const {code, state: uid} = req.query;

    if (!code || !uid) {
        return res.status(400).send(`
      <script>
        window.opener && window.opener.postMessage({
          type: 'DISCORD_AUTH_ERROR',
          error: 'Missing required parameters'
        }, '*');
        window.close();
      </script>
    `);
    }

    try {
        const token = await getDiscordToken(code);
        console.log('Access token retrieved');

        const userRes = await axios.get('https://discord.com/api/users/@me', {
            headers: {Authorization: `Bearer ${token}`},
        });

        const d = userRes.data; // { id, username, global_name, avatar, etc }
        console.log('Discord user:', d);

        const avatarUrl = discordAvatarUrl(d.id, d.avatar);

        // Check if this Discord account is already linked to a different user
        const existingDiscordQuery = await admin
            .firestore()
            .collection('users')
            .where('discord.id', '==', d.id)
            .get();

        if (!existingDiscordQuery.empty) {
            const existingUserId = existingDiscordQuery.docs[0].id;
            if (existingUserId !== uid) {
                console.log(`Discord ID ${d.id} is already linked to user ${existingUserId}`);
                return res.status(409).send(`
          <script>
            try {
              window.opener && window.opener.postMessage({
                type: 'DISCORD_AUTH_ERROR',
                error: 'This Discord account is already linked to another Nexus account'
              }, '*');
            } catch (e) {}
            window.close();
          </script>
        `);
            }
        }

        const userRef = admin.firestore().collection('users').doc(uid);
        await userRef.set(
            {
                discord: {
                    id: d.id,
                    username: d.username ?? null,
                    globalName: d.global_name ?? null,
                    avatarHash: d.avatar ?? null,
                    avatarUrl: avatarUrl,
                    linkedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            },
            {merge: true}
        );

        // NEW: Grant Discord course access after successful linking
        try {
            console.log('Granting Discord course access for user:', uid);

            // Get user's current courses from Firestore
            const userDoc = await userRef.get();
            const userData = userDoc.data();
            const userCourses = userData?.courses || [];

            if (userCourses.length > 0) {
                console.log('User has courses, calling bot grant-access API:', userCourses);

                const botResponse = await axios.post(
                    `${DISCORD_BOT_URL}/api/discord/grant-access`,
                    {
                        discordId: d.id,
                        courses: userCourses,
                        uid: uid,
                    },
                    {
                        timeout: 10000,
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': process.env.BOT_API_KEY || 'your-shared-secret-key',
                        },
                    }
                );

                console.log('Bot grant-access response:', botResponse.status);
            } else {
                console.log('User has no courses, skipping Discord access grant');
            }
        } catch (botError) {
            // Don't fail the Discord linking if bot is unavailable
            console.error(
                'Failed to grant Discord access (bot may be offline):',
                botError.response?.data || botError.message
            );
        }

        // Let the opener know it worked
        return res.send(`
      <script>
        try {
          window.opener && window.opener.postMessage({
            type: 'DISCORD_AUTH_SUCCESS',
            data: {
              id: ${JSON.stringify(d.id)},
              username: ${JSON.stringify(d.username ?? null)},
              globalName: ${JSON.stringify(d.global_name ?? null)},
              avatarUrl: ${JSON.stringify(avatarUrl)}
            }
          }, '*');
        } catch (e) {}
        window.close();
      </script>
    `);
    } catch (err) {
        console.error('Callback error:', err?.response?.data || err.message || err);
        return res.status(500).send(`
      <script>
        try {
          window.opener && window.opener.postMessage({
            type: 'DISCORD_AUTH_ERROR',
            error: 'Failed to authenticate with Discord'
          }, '*');
        } catch (e) {}
        window.close();
      </script>
    `);
    }
};
