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
    const { code, uid, email, isPreAuth } = req.body;

    console.log('[verifyCode] Request received:', { 
      hasCode: !!code, 
      hasUid: !!uid, 
      hasEmail: !!email, 
      isPreAuth 
    });

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    if (isPreAuth) {
      console.log('[verifyCode] Processing pre-auth verification');
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required for pre-auth verification' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      
      // Get data from Firestore
      const verificationDoc = await db.collection('preAuthVerifications').doc(normalizedEmail).get();
      
      console.log('[verifyCode] Firestore lookup:', { 
        email: normalizedEmail, 
        found: verificationDoc.exists
      });

      if (!verificationDoc.exists) {
        return res.status(404).json({ error: 'Verification code not found or expired' });
      }

      const cachedData = verificationDoc.data();

      // Check if code has expired (15 minutes)
      const codeAge = Date.now() - cachedData.createdAt;
      const FIFTEEN_MINUTES = 15 * 60 * 1000;

      if (codeAge > FIFTEEN_MINUTES || Date.now() > cachedData.expiresAt) {
        // Delete expired document
        await db.collection('preAuthVerifications').doc(normalizedEmail).delete();
        console.log('[verifyCode] Code expired for:', normalizedEmail);
        return res.status(400).json({ error: 'Verification code has expired' });
      }

      // Check if too many failed attempts (max 5)
      if (cachedData.attempts >= 5) {
        await db.collection('preAuthVerifications').doc(normalizedEmail).delete();
        console.log('[verifyCode] Too many attempts for:', normalizedEmail);
        return res.status(429).json({ 
          error: 'Too many failed attempts. Please request a new code.',
          attemptsLeft: 0
        });
      }

      // Check if code matches
      if (cachedData.code !== code) {
        // Update attempts in Firestore
        await db.collection('preAuthVerifications').doc(normalizedEmail).update({
          attempts: cachedData.attempts + 1
        });
        
        const attemptsLeft = 5 - (cachedData.attempts + 1);
        
        console.log('[verifyCode] Invalid code for:', normalizedEmail, 'attempts:', cachedData.attempts + 1);
        
        return res.status(400).json({ 
          error: 'Invalid verification code',
          attemptsLeft: attemptsLeft > 0 ? attemptsLeft : 0
        });
      }

      // Code is correct! Delete the document
      await db.collection('preAuthVerifications').doc(normalizedEmail).delete();
      
      console.log('[verifyCode] Pre-auth verification successful for:', normalizedEmail);

      return res.status(200).json({ 
        success: true, 
        message: 'Email verified successfully' 
      });
    }

    console.log('[verifyCode] Processing post-auth verification');
    
    if (!uid) {
      return res.status(400).json({ error: 'UID is required for post-auth verification' });
    }

    // Get the user document
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      console.log('[verifyCode] User not found:', uid);
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // Check if verification code exists
    if (!userData.verificationCode) {
      console.log('[verifyCode] No verification code for user:', uid);
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
      console.log('[verifyCode] Too many attempts for user:', uid);
      return res.status(429).json({ 
        error: 'Too many failed attempts. Please request a new code.',
        attemptsLeft: 0
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
      console.log('[verifyCode] Code expired for user:', uid);
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Check if code matches
    if (userData.verificationCode !== code) {
      // Increment failed attempts
      await db.collection('users').doc(uid).update({
        verificationAttempts: attempts + 1
      });
      
      const attemptsLeft = 5 - (attempts + 1);
      console.log('[verifyCode] Invalid code for user:', uid, 'attempts:', attempts + 1);
      
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

    console.log('[verifyCode] Post-auth verification successful for user:', uid);

    return res.status(200).json({ 
      success: true, 
      message: 'Email verified successfully' 
    });
  } catch (error) {
    console.error('[verifyCode] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to verify code',
      details: error.message 
    });
  }
};