const axios = require('axios');
const {admin} = require('../config/firebaseAdmin.js');

// require('dotenv').config()

const {DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_URL, DISCORD_TOKEN, BOT_API_KEY} = process.env;

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
    const {code, state} = req.query;

    if (!code || !state) {
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

    // Parse state (legacy uid string or JSON payload)
    let uid = state;
    let mode = 'link';
    let inviteCodes = [];
    try {
        const decoded = decodeURIComponent(state);
        const parsed = JSON.parse(decoded);
        uid = parsed.uid || uid;
        mode = parsed.mode || 'link';
        inviteCodes = Array.isArray(parsed.invites) ? parsed.invites : [];
        console.log('[callback] state', {mode, uid, invites: inviteCodes.length});
    } catch {
        console.log('[callback] legacy state', uid);
    }

    try {
        const token = await getDiscordToken(code);
        console.log('[callback] access token ok');

        const userRes = await axios.get('https://discord.com/api/users/@me', {
            headers: {Authorization: `Bearer ${token}`},
        });

        const d = userRes.data; // { id, username, global_name, avatar, etc }
        console.log('[callback] discord user', d?.id);

        const avatarUrl = discordAvatarUrl(d.id, d.avatar);

        // Linking only for link mode (not join_all)
        if (mode === 'link') {
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

            // Grant Discord course access after successful linking
            try {
            console.log('Granting Discord course access for user:', uid);
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
                                'X-API-Key': BOT_API_KEY || 'your-shared-secret-key',
                            },
                        }
                    );

                    console.log('Bot grant-access response:', botResponse.status);
                } else {
                    console.log('User has no courses, skipping Discord access grant');
                }
            } catch (botError) {
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
        }

        // join_all mode: resolve invites -> guildIds, call bot join-guilds
        if (mode === 'join_all') {
            console.log('[callback] join_all start', inviteCodes);
            const guildIds = [];
            for (const code of inviteCodes) {
                try {
                    const inviteRes = await axios.get(
                        `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=false&with_expiration=false`,
                        { headers: { Authorization: `Bot ${DISCORD_TOKEN}` } }
                    );
                    const gid = inviteRes.data?.guild?.id;
                    if (gid) {
                        guildIds.push(gid);
                        console.log('[callback] invite resolved', code, '->', gid);
                    } else {
                        console.error('[callback] invite missing guild', code, inviteRes.data);
                    }
                } catch (e) {
                    console.error('[callback] invite resolve failed', code, e.response?.data || e.message);
                }
            }
            console.log('[callback] guildIds', guildIds);

            let joinResults = [];
            if (guildIds.length) {
                try {
                    const resp = await axios.post(
                        `${DISCORD_BOT_URL}/api/discord/join-guilds`,
                        {
                            userAccessToken: token,
                            guildIds,
                            discordId: d.id,
                        },
                        {
                            timeout: 15000,
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': BOT_API_KEY || 'your-shared-secret-key',
                            },
                        }
                    );
                    joinResults = resp.data?.results || [];
                    console.log('[callback] join-guilds status', resp.status);
                    console.log('[callback] join results', joinResults);
                } catch (e) {
                    console.error('[callback] join-guilds call failed status', e.response?.status);
                    console.error('[callback] join-guilds call failed data', e.response?.data || e.message);
                }
            }
            else {
                console.warn('[callback] no guildIds to join after invite resolve');
            }

            const payload = {
                type: 'DISCORD_JOIN_ALL_RESULT',
                data: { userId: d.id, results: joinResults, guildIds },
            };

            return res.send(`
          <script>
            try {
              window.opener && window.opener.postMessage(${JSON.stringify(payload)}, '*');
            } catch (e) {}
            window.close();
          </script>
        `);
        }

        // Fallback: unknown mode
        return res.status(400).send(`
      <script>
        window.opener && window.opener.postMessage({
          type: 'DISCORD_AUTH_ERROR',
          error: 'Unsupported mode'
        }, '*');
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
