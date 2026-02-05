import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HiMail } from 'react-icons/hi';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import LoadingScreen from '../components/LoadingScreen';

export default function VerifyCode() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const email = location.state?.email || '';
  const isPreAuth = location.state?.isPreAuth || false;
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [creatingAccount, setCreatingAccount] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/signup');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    if (e.key === 'v' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        const newCode = [...code];
        digits.forEach((digit, i) => {
          if (i < 6) newCode[i] = digit;
        });
        setCode(newCode);
        if (digits.length === 6) {
          inputRefs.current[5]?.focus();
        } else if (digits.length > 0) {
          inputRefs.current[Math.min(digits.length, 5)]?.focus();
        }
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const enteredCode = code.join('');
    
    if (enteredCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      // Verify the code
      const response = await fetch('/api/email/verifyCode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: enteredCode,
          email: email,
          isPreAuth: isPreAuth
        })
      });

      const data = await response.json();

      if (response.ok) {
        // If this is pre-auth verification, NOW create the Firebase account
        if (isPreAuth) {
          setCreatingAccount(true);
          
          // Get the stored signup data
          const pendingSignup = sessionStorage.getItem('pendingSignup');
          if (!pendingSignup) {
            throw new Error('Signup data not found. Please start over.');
          }
          
          const { email: signupEmail, password } = JSON.parse(pendingSignup);
          
          // Initialize Firebase if needed
          let auth;
          if (getApps().length) {
            auth = getAuth(getApp());
          } else {
            const res = await fetch(`/api/firebase-config`);
            if (!res.ok) throw new Error('Failed to load Firebase config');
            const cfg = await res.json();
            const app = initializeApp(cfg);
            auth = getAuth(app);
          }
          
          // NOW create the Firebase Auth account
          const cred = await createUserWithEmailAndPassword(auth, signupEmail, password);
          const user = cred.user;
          
          // Store user data in sessionStorage for onboarding
          sessionStorage.setItem('pendingOnboarding', JSON.stringify({
            uid: user.uid,
            email: user.email,
            emailVerified: true,
            createdAt: new Date().toISOString(),
          }));
          
          // Clear the signup data
          sessionStorage.removeItem('pendingSignup');
          
          // Navigate to course linking (first onboarding step)
          navigate('/CourseLinking');
        } else {
          // Old flow: user already exists, navigate to login
          navigate('/login', { 
            state: { message: 'Email verified successfully! Please log in.' } 
          });
        }
      } else {
        setError(data.error || 'Invalid verification code');
        if (data.attemptsLeft !== undefined) {
          setAttemptsLeft(data.attemptsLeft);
        }
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'An error occurred. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
      setCreatingAccount(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setResendMessage('');
    setError('');

    try {
      const response = await fetch('/api/email/resendVerificationCode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          isPreAuth: isPreAuth
        })
      });

      if (response.ok) {
        setResendMessage('New code sent! Check your email.');
        setAttemptsLeft(5);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        const errorData = await response.json();
        setResendMessage(errorData.error || 'Failed to resend code.');
      }
    } catch (error) {
      console.error('Resend error:', error);
      setResendMessage('An error occurred. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (creatingAccount) {
    return (
      <LoadingScreen 
        message="Creating Your Account" 
        detail="Setting up your Nexus account..."
      />
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-blue-950 font-titilliumWeb-regular"
      style={{
        backgroundImage: "url('/assets/SignUpBG.svg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="bg-nexus100 rounded-lg shadow-lg p-8 w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-nexus500 rounded-full p-4">
            <HiMail className="text-white" size={48} />
          </div>
        </div>

        <h2 className="bodyText mb-4 text-gray-800 font-titilliumWeb-bold">
          Verify Your Email
        </h2>

        <p className="text-gray-700 mb-4 tinyText font-titilliumWeb-regular">
          We've sent a 6-digit code to:
        </p>

        <p className="text-nexus700 mb-6 font-titilliumWeb-bold">
          {email}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="flex justify-center gap-2 mb-6">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-nexus500 focus:outline-none bg-white text-nexus700"
                disabled={verifying}
              />
            ))}
          </div>

          {error && (
            <div className="text-red-600 mb-4 text-sm font-semibold">
              {error}
              {attemptsLeft > 0 && attemptsLeft < 5 && (
                <div className="text-xs mt-1">
                  {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} remaining
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={verifying || code.join('').length !== 6}
            className="w-full bg-nexus500 text-white py-3 px-8 rounded-lg font-titilliumWeb-bold hover:bg-nexus600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {verifying ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="border-t border-gray-300 pt-6 mt-6">
          <p className="text-gray-600 mb-4 tinyText font-titilliumWeb-regular">
            Didn't receive the code?
          </p>

          <button
            onClick={handleResendCode}
            disabled={resending}
            className="text-nexus700 font-titilliumWeb-bold hover:underline disabled:opacity-50 disabled:cursor-not-allowed tinyText"
          >
            {resending ? 'Sending...' : 'Resend Code'}
          </button>

          {resendMessage && (
            <p className={`mt-4 tinyText font-titilliumWeb-semibold ${
              resendMessage.includes('sent') ? 'text-green-600' : 'text-red-600'
            }`}>
              {resendMessage}
            </p>
          )}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/signup')}
            className="text-blue-900 font-titilliumWeb-bold hover:underline tinyText"
          >
            Back to Sign Up
          </button>
        </div>

        <p className="text-gray-500 text-xs mt-6">
          The code will expire in 15 minutes
        </p>
      </div>
    </div>
  );
}