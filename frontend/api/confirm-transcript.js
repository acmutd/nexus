const { auth, db } = require('./config/firebaseAdmin');
const axios = require('axios');
const { DISCORD_BOT_URL } = process.env;

const fail = (res, code, error) => res.status(code).json({ success: false, error });
const ok = (res, payload = {}) => res.status(200).json({ success: true, ...payload });

module.exports = async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');

  try {
    const { id, token, courses = [], meta = {} } = req.body || {};
    if (!id || !token) return fail(res, 400, 'Missing required fields');

    const decoded = await auth.verifyIdToken(token);
    if (decoded.uid !== id) return fail(res, 403, 'Token does not match user');

    // Save courses + meta
    const userRef = db.collection('users').doc(id);
    await userRef.set({ courses, lastTranscriptUpload: new Date().toISOString(), accountLinkingSkipped: !!meta.skipAccountLinking }, { merge: true });

    // If Discord linked, allocate courses via bot
    if (DISCORD_BOT_URL) {
      const snap = await userRef.get();
      const data = snap.exists ? snap.data() : {};
      const discordId = data?.discord?.id;
      if (discordId) {
        try {
          await axios.post(
            `${DISCORD_BOT_URL}/api/discord/allocate`,
            { discordId, courses },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              timeout: 10000,
            }
          );
        } catch (err) {
          console.warn('confirm-transcript: allocate failed', err.response?.data || err.message);
        }
      }
    }

    return ok(res, { message: 'Courses saved' });
  } catch (err) {
    console.error('confirm-transcript error', err);
    return fail(res, 500, 'Failed to save transcript');
  }
};
