const { db } = require('../config/firebaseAdmin.js');

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
    const { uid, code } = req.body;

    if (!uid || !code) {
      return res.status(400).json({ error: 'UID and code are required' });
    }

    await db.collection('users').doc(uid).update({
      verificationCode: code,
      verificationCodeCreatedAt: Date.now(),
      verificationAttempts: 0
    });

    return res.status(201).json({ 
      success: true, 
      message: 'Verification code stored successfully' 
    });
  } catch (error) {
    console.error('Error storing verification code:', error);
    return res.status(500).json({ 
      error: 'Failed to store verification code',
      details: error.message 
    });
  }
};