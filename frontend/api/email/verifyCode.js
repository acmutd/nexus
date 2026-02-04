let db;

try {
  const admin = require('../../config/firebaseAdmin.js');
  db = admin.db;
} catch (e) {
  try {
    const admin = require('../config/firebaseAdmin.js');
    db = admin.db;
  } catch (e2) {
    const admin = require('firebase-admin');
    
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}'
      );
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
      });
    }
    
    db = admin.firestore();
  }
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, uid } = req.body;

    if (!code || !uid) {
      return res.status(400).json({ error: 'Code and UID are required' });
    }

    // Get the user document
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // Check if verification code exists
    if (!userData.verificationCode) {
      return res.status(404).json({ error: 'Verification code not found' });
    }

    // Check if too many failed attempts (max 5)
    const attempts = userData.verificationAttempts || 0;
    if (attempts >= 5) {
      // Clear verification data
      await db.collection('users').doc(uid).update({
        verificationCode: null,
        verificationCodeCreatedAt: null,
        verificationAttempts: 0
      });
      return res.status(429).json({ 
        error: 'Too many failed attempts. Please request a new code.' 
      });
    }

    // Check if code has expired (15 minutes)
    const codeAge = Date.now() - userData.verificationCodeCreatedAt;
    const FIFTEEN_MINUTES = 15 * 60 * 1000;

    if (codeAge > FIFTEEN_MINUTES) {
      // Clear expired verification data
      await db.collection('users').doc(uid).update({
        verificationCode: null,
        verificationCodeCreatedAt: null,
        verificationAttempts: 0
      });
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Check if code matches
    if (userData.verificationCode !== code) {
      // Increment failed attempts
      await db.collection('users').doc(uid).update({
        verificationAttempts: attempts + 1
      });
      
      const attemptsLeft = 5 - (attempts + 1);
      return res.status(400).json({ 
        error: 'Invalid verification code',
        attemptsLeft: attemptsLeft > 0 ? attemptsLeft : 0
      });
    }

    // Code is correct! Mark user as verified and clear verification data
    await db.collection('users').doc(uid).update({
      emailVerified: true,
      verifiedAt: Date.now(),
      verificationCode: null,
      verificationCodeCreatedAt: null,
      verificationAttempts: 0
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Email verified successfully' 
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ 
      error: 'Failed to verify code',
      details: error.message 
    });
  }
};