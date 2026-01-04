import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from 'react-responsive';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export default function EmailVerification() {
  const navigate = useNavigate();
  const isMed = useMediaQuery({ query: '(max-width: 800px)' });

  // Firebase
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);

  // UI & form state
  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [email, setEmail] = useState("");

  // Initialize Firebase
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        if (getApps().length) {
          const app = getApp();
          const a = getAuth(app);
          const database = getFirestore(app);
          setAuth(a);
          setDb(database);
          unsub = onAuthStateChanged(a, (u) => {
            if (!u) {
              navigate("/login");
            } else {
              setEmail(u.email || "");
            }
          });
        } else {
          const res = await fetch(`${API_BASE}/api/firebase-config`);
          if (!res.ok) throw new Error(`Config fetch failed: ${res.status} ${res.statusText}`);
          const cfg = await res.json();
          if (!cfg?.apiKey) throw new Error("Config missing required keys.");
          const app = initializeApp(cfg);
          const a = getAuth(app);
          const database = getFirestore(app);
          setAuth(a);
          setDb(database);
          unsub = onAuthStateChanged(a, (u) => {
            if (!u) {
              navigate("/login");
            } else {
              setEmail(u.email || "");
            }
          });
        }
      } catch (e) {
        console.error("Firebase init error:", e);
        setInitError(String(e?.message || e));
      } finally {
        setInitLoading(false);
      }
    })();

    return () => unsub();
  }, [navigate]);

  // Send initial verification code on mount
  useEffect(() => {
    if (auth && email && !initLoading) {
      sendVerificationCode(true);
    }
  }, [auth, email, initLoading]);

  const sendVerificationCode = async (isInitial = false) => {
    if (!isInitial) setResending(true);
    setError("");
    setSuccessMessage("");

    try {
      const user = auth.currentUser;
      if (!user) {
        setError("Your session expired. Please log in again.");
        return;
      }

      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/email/send-verification`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          email: user.email,
          userId: user.uid 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to send verification code");
      }

      if (!isInitial) {
        setSuccessMessage("Verification code sent! Check your email.");
      }
    } catch (e) {
      console.error("Send verification error:", e);
      setError(e.message || "Failed to send verification code. Please try again.");
    } finally {
      if (!isInitial) setResending(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!auth || !db) {
      setError("App not initialized.");
      return;
    }
    if (!verificationCode) {
      setError("Please enter the verification code.");
      return;
    }

    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setError("Your session expired. Please log in again.");
        return;
      }

      // Verify the code with backend
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/email/verify-code`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          userId: user.uid,
          code: verificationCode.trim()
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Invalid verification code");
      }

      // Update user document to mark email as verified
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        emailVerified: true,
        verifiedAt: new Date().toISOString(),
      });

      // Navigate to course entry
      navigate("/courseEntry");
    } catch (e) {
      console.error("Verification error:", e);
      setError(e.message || "Invalid verification code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (initLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-950">
        <div className="text-blue-200">Loading…</div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-950">
        <div className="w-[450px] mx-auto mt-10 p-6 bg-blue-200 rounded-xl shadow-md text-red-700">
          <div className="font-semibold mb-2">Initialization failed</div>
          <div className="text-sm whitespace-pre-wrap">{initError}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-blue-950 bg-cover bg-center"
      style={{ backgroundImage: "url('/assets/AccessRequestBG.svg')" }}>

      <div className="w-2/5 mx-auto mt-10 p-10 bg-gradient-to-b from-nexus100 from-10% via-nexus50 to-nexus100 to-90% rounded-xl shadow-md relative">
        <div className="items-center justify-center flex flex-row">
          <img src="/assets/Logo.svg" style={{ scale: isMed ? .6 : 1, paddingRight: isMed ? -12 : 24 }} />
          <img src="/assets/UTDLogo.svg" style={{ scale: isMed ? .6 : 1, paddingLeft: isMed ? -12 : 24 }} />
        </div>

        <form onSubmit={onSubmit}>
          <h2 className="text-3xl font-titilliumWeb-bold text-center font-bold text-gray-800 mb-2 py-2">
            Verify Your Email
          </h2>
          <p className="text-center text-blue-700 mb-6 font-titilliumWeb-regular">
            We've sent a verification code to <strong>{email}</strong>
          </p>

          <div className="mb-4">
            <label htmlFor="verificationCode" className="block text-left text-blue-700 mb-2 font-semibold">
              Verification Code
            </label>
            <input
              id="verificationCode"
              type="text"
              placeholder="Enter 6-digit code"
              className="w-full bg-white px-4 py-2 border placeholder-gray-400 rounded-md focus:outline-none text-center text-2xl tracking-widest"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              autoComplete="off"
              required
            />
          </div>

          {error && <div className="text-red-600 text-sm mb-2 text-center">{error}</div>}
          {successMessage && <div className="text-green-600 text-sm mb-2 text-center">{successMessage}</div>}

          <div className="mb-4">
            <button
              type="submit"
              disabled={submitting || verificationCode.length !== 6}
              className={`w-full rounded-md py-2 px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                ${submitting || verificationCode.length !== 6 
                  ? "bg-blue-400 text-white cursor-not-allowed" 
                  : "bg-blue-600 text-white hover:bg-blue-700"}`}
            >
              {submitting ? "Verifying…" : "Verify Email"}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => sendVerificationCode(false)}
              disabled={resending}
              className={`text-sm font-bold ${resending ? "text-gray-500" : "text-blue-700 hover:underline"}`}
            >
              {resending ? "Sending…" : "Resend verification code"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}