const express = require('express');
const router = express.Router();
const { Resend } = require('resend');
const crypto = require('crypto');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// In-memory storage for verification codes (use Redis in production)
const verificationCodes = new Map();

function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString();
}

router.post('/send-verification', async (req, res) => {
  try {
    const { email, userId } = req.body;

    if (!email || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and userId are required' 
      });
    }

    const code = generateVerificationCode();

    const expiresAt = Date.now() + 10 * 60 * 1000;
    verificationCodes.set(userId, { code, expiresAt, email });

    // Send email with Resend
    const { data, error } = await resend.emails.send({
      from: 'Nexus <onboarding@resend.dev>', // Use this for testing
      to: email,
      subject: 'Nexus Email Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
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
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              color: #ffffff;
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 40px;
              text-align: center;
            }
            .content p {
              color: #333333;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 30px;
            }
            .code-box {
              background-color: #f0f9ff;
              border: 2px dashed #3b82f6;
              border-radius: 8px;
              padding: 20px;
              margin: 30px 0;
            }
            .code {
              font-size: 36px;
              font-weight: bold;
              color: #1e3a8a;
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
            }
            .expiry {
              color: #ef4444;
              font-size: 14px;
              margin-top: 20px;
            }
            .footer {
              background-color: #f9fafb;
              padding: 20px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Email Verification</h1>
            </div>
            <div class="content">
              <p>Hello!</p>
              <p>Thank you for signing up with Nexus. Please use the verification code below to complete your registration:</p>
              
              <div class="code-box">
                <div class="code">${code}</div>
              </div>
              
              <p class="expiry">⏰ This code will expire in 10 minutes</p>
              
              <p>If you didn't request this verification code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2025 Nexus. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send verification code' 
      });
    }

    console.log('Verification email sent:', data);
    res.json({ 
      success: true, 
      message: 'Verification code sent successfully',
      messageId: data.id
    });

  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send verification code' 
    });
  }
});

router.post('/verify-code', async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'UserId and code are required' 
      });
    }

    const stored = verificationCodes.get(userId);

    if (!stored) {
      return res.status(400).json({ 
        success: false, 
        message: 'No verification code found. Please request a new one.' 
      });
    }

    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(userId);
      return res.status(400).json({ 
        success: false, 
        message: 'Verification code has expired. Please request a new one.' 
      });
    }

    if (stored.code !== code.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification code. Please try again.' 
      });
    }

    verificationCodes.delete(userId);

    res.json({ 
      success: true, 
      message: 'Email verified successfully' 
    });

  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify code' 
    });
  }
});

setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of verificationCodes.entries()) {
    if (now > data.expiresAt) {
      verificationCodes.delete(userId);
    }
  }
}, 60000); 

module.exports = router;