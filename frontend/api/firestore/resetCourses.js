const { admin, db } = require('../config/firebaseAdmin.js');
const axios = require('axios');
const { DISCORD_BOT_URL } = process.env;

const fail = (res, code, error) => res.status(code).json({ success: false, error });
const ok = (res, payload = {}) => res.status(200).json({ success: true, ...payload });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return fail(res, 405, 'Method not allowed');
  }

  try {
    const { id, token } = req.body || {};

    if (!id || !token) {
      return fail(res, 400, 'Missing required fields: id or token');
    }

    // Verify the caller is the same authenticated user
    const decoded = await admin.auth().verifyIdToken(token);
    if (decoded.uid !== id) {
      return fail(res, 403, 'Token does not match user ID');
    }

    const userRef = db.collection('users').doc(id);
    const gradesRef = db.collection('courseGrades').doc(id);

    // Read current user to capture linked Discord ID before clearing courses
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : null;
    const discordId = userData?.discord?.id || null;

    // Remove all course-related data and any saved grade histories so onboarding resets cleanly
    await Promise.all([
      userRef.set({
        courses: admin.firestore.FieldValue.delete(),
        lastTranscriptUpload: admin.firestore.FieldValue.delete(),
        netId: admin.firestore.FieldValue.delete(),
        accountLinkingSkipped: admin.firestore.FieldValue.delete(),
      }, { merge: true }),
      gradesRef.delete(),
    ]);

    // If linked to Discord, remove course access on the bot side as well
    if (discordId && DISCORD_BOT_URL) {
      try {
        await axios.post(
          `${DISCORD_BOT_URL}/api/discord/remove-access`,
          { discordId },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            timeout: 10000,
          }
        );
      } catch (botErr) {
        console.warn('resetCourses: failed to remove Discord access', botErr.response?.data || botErr.message);
        // continue; Firestore reset already succeeded
      }
    }

    return ok(res, { message: 'Courses cleared' });
  } catch (err) {
    console.error('resetCourses error:', err);
    return fail(res, 500, 'Failed to clear courses');
  }
};
