const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
    const { email, isPreAuth } = req.body;

    console.log('[sendVerificationCode] Request received:', { email, isPreAuth });

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!process.env.SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY is not set!');
      return res.status(500).json({ error: 'SendGrid API key not configured' });
    }
    
    if (!process.env.SENDGRID_VERIFIED_SENDER) {
      console.error('SENDGRID_VERIFIED_SENDER is not set!');
      return res.status(500).json({ error: 'SendGrid verified sender not configured' });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const msg = {
      to: email,
      from: process.env.SENDGRID_VERIFIED_SENDER,
      subject: 'Verify Your Nexus Account',
      text: `Welcome to Nexus! Your verification code is: ${verificationCode}. This code will expire in 15 minutes.`,
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
                <h1>Welcome to Nexus!</h1>
              </div>
              <div class="content">
                <p>Hi there,</p>
                <p>Thank you for signing up for Nexus! To complete your registration, please use the verification code below:</p>
                
                <div class="code-container">
                  <div class="verification-code">${verificationCode}</div>
                  <div class="expiry-notice">This code will expire in 15 minutes</div>
                </div>

                <p>Enter this code on the verification page to activate your account.</p>
                <p>If you didn't create an account with Nexus, you can safely ignore this email.</p>
                <p>Best regards,<br>The Nexus Team</p>
              </div>
              <div class="footer">
                <p>Powered by ACM Dev at UTD</p>
                <p>This email was sent to ${email}</p>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    await sgMail.send(msg);
    console.log('[sendVerificationCode] Email sent successfully to:', email);

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
      
      console.log('[sendVerificationCode] Stored code in Firestore for:', normalizedEmail);
    }
    // For non-preAuth flow, the code is returned and stored by storeVerificationCode.js

    return res.status(200).json({ 
      success: true, 
      message: 'Verification code sent successfully',
      code: verificationCode 
    });
  } catch (error) {
    console.error('[sendVerificationCode] Error:', error);
    
    if (error.response) {
      console.error('SendGrid response error:', error.response.body);
      return res.status(error.code || 500).json({ 
        error: 'Failed to send verification code',
        details: error.response.body.errors || error.message
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to send verification code',
      details: error.message 
    });
  }
};