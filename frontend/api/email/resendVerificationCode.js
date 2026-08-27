const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const { db } = require('../config/firebaseAdmin.js');

module.exports = async (req, res) => {
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
    const { email, uid, isPreAuth } = req.body;

    console.log('[resendVerificationCode] Request received:', { email, uid, isPreAuth });

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // For post-auth flow, uid is required
    if (!isPreAuth && !uid) {
      return res.status(400).json({ error: 'UID is required for post-auth flow' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const msg = {
      to: email,
      from: process.env.SENDGRID_VERIFIED_SENDER,
      subject: 'Your New Nexus Verification Code',
      text: `Your new verification code is: ${verificationCode}. This code will expire in 15 minutes.`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: 'Arial', sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .header {
                background: linear-gradient(135deg, #003D99 0%, #0052CC 100%);
                padding: 40px 20px;
                text-align: center;
              }
              .header h1 {
                color: #ffffff;
                margin: 0;
                font-size: 28px;
              }
              .content {
                padding: 40px 30px;
                text-align: center;
              }
              .content p {
                color: #333333;
                line-height: 1.6;
                margin: 0 0 20px 0;
                font-size: 16px;
              }
              .code-container {
                background-color: #f8f9fa;
                border: 2px dashed #003D99;
                border-radius: 8px;
                padding: 20px;
                margin: 30px 0;
              }
              .verification-code {
                font-size: 36px;
                font-weight: bold;
                color: #003D99;
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
              }
              .expiry-notice {
                color: #666666;
                font-size: 14px;
                margin-top: 10px;
              }
              .footer {
                background-color: #f8f8f8;
                padding: 20px;
                text-align: center;
                color: #666666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>New Verification Code</h1>
              </div>
              <div class="content">
                <p>You requested a new verification code for your Nexus account.</p>
                
                <div class="code-container">
                  <div class="verification-code">${verificationCode}</div>
                  <div class="expiry-notice">This code will expire in 15 minutes</div>
                </div>

                <p>Enter this code on the verification page to activate your account.</p>
                <p>Best regards,<br>The Nexus Team</p>
              </div>
              <div class="footer">
                <p>Powered by ACM Dev at UTD</p>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    await sgMail.send(msg);
    console.log('[resendVerificationCode] Email sent successfully to:', email);

    // Store the code based on flow type
    if (isPreAuth) {

      const normalizedEmail = email.toLowerCase().trim();
      
      await db.collection('preAuthVerifications').doc(normalizedEmail).set({
        code: verificationCode,
        email: normalizedEmail,
        createdAt: Date.now(),
        attempts: 0,
        expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutes from now
      });
      
      console.log('[resendVerificationCode] Stored code in Firestore for:', normalizedEmail);
    } else {

      await db.collection('users').doc(uid).update({
        verificationCode: verificationCode,
        verificationCodeCreatedAt: Date.now(),
        verificationAttempts: 0
      });
      console.log('[resendVerificationCode] Stored code in Firestore for user:', uid);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'New verification code sent successfully'
    });
  } catch (error) {
    console.error('[resendVerificationCode] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to resend verification code',
      details: error.message 
    });
  }
};