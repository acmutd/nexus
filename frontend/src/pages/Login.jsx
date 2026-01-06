import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import { FaGoogle } from "react-icons/fa";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const Login = () => {
  const navigate = useNavigate();

  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pwVisible, setPwVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        let authInstance;
        if (getApps().length) {
          const app = getApp();
          authInstance = getAuth(app);
        } else {
          const res = await fetch(`${API_BASE}/api/firebase-config`);
          if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
          const cfg = await res.json();
          const app = initializeApp(cfg);
          authInstance = getAuth(app);
        }
        setAuth(authInstance);
        unsub = onAuthStateChanged(authInstance, (u) => u && navigate("/"));
      } catch (e) {
        console.error("Init error:", e);
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
    return () => unsub();
  }, [navigate]);

  const loginWithEmail = async (e) => {
    e.preventDefault();
    setError("");
    if (!auth) return setError("App not initialized.");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);
    } catch (e) {
      setError(e?.message?.replace("Firebase: ", "") || "Login failed");
    }
  };

  const loginWithGoogle = async () => {
    setError("");
    if (!auth) return setError("App not initialized.");
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const user = cred.user;
      const db = getFirestore();
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          email: user.email ?? null,
          servers: [],
          courses: [],
          createdAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      setError(e?.message?.replace("Firebase: ", "") || "Google login failed");
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    if (!auth) return setForgotError("App not initialized.");
    setForgotLoading(true);
      try {
        await sendPasswordResetEmail(auth, forgotEmail.trim());
        setForgotSuccess("If an account exists for this email, a password reset link has been sent.");
    } catch (e) {
      setForgotError(e?.message?.replace("Firebase: ", "") || "Failed to send email.");
    } finally {
      setForgotLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-blue-950 text-blue-200">Loading...</div>;

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-blue-950 font-titilliumWeb-regular bg-no-repeat bg-cover bg-center"
      style={{ backgroundImage: "url('/assets/LoginBG.svg')" }}
    >
      <div className="bg-blue-200 rounded-lg shadow-lg p-8 w-full max-w-md overflow-hidden relative">
        <div className={`transition-all duration-500 ${showForgot ? "opacity-0 pointer-events-none -translate-x-full absolute" : "opacity-100"}`}>
          <h2 className="text-2xl mb-1 text-gray-800 font-titilliumWeb-bold">Login to Nexus</h2>
          <p className="text-blue-900 mb-6 text-base font-titilliumWeb-bold">Enter your email below to login</p>
          <form onSubmit={loginWithEmail}>
            <div className="mb-4 font-titilliumWeb-bold">
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none bg-white text-black"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-4 relative font-titilliumWeb-bold">
              <input
                type={pwVisible ? "text" : "password"}
                placeholder="Password"
                className="w-full px-4 py-2 border border-gray-300 rounded pr-10 focus:outline-none bg-white text-black"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
              />
              <button type="button" onClick={() => setPwVisible(!pwVisible)} className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-600">
                {pwVisible ? <IoMdEye /> : <IoMdEyeOff />}
              </button>
            </div>
            {error && <div className="text-red-600 mb-4 text-sm font-medium">{error}</div>}
            <button type="submit" className="w-full font-titilliumWeb-bold bg-nexus600 text-white py-2 rounded transition transform hover:bg-nexus700 mb-3">Login</button>
            <button type="button" onClick={loginWithGoogle} className="w-full bg-white font-titilliumWeb-bold text-blue-900 border border-blue-300 py-2 rounded transition flex items-center justify-center hover:bg-blue-100 mb-4">
              <FaGoogle className="mr-2" /> Login with Google
            </button>
          </form>
          
          <div className="text-center text-sm text-gray-700 font-titilliumWeb-bold mt-4">
            Don’t have an account? <Link to="/signup" className="font-bold text-blue-900 hover:underline">Signup here</Link>
          </div>
          
          <div className="text-center mt-2 font-titilliumWeb-bold">
            <button type="button" className="text-sm font-bold text-blue-900 hover:underline cursor-pointer" onClick={() => setShowForgot(true)}>Forgot password?</button>
          </div>
        </div>

        <div className={`transition-all duration-500 ${showForgot ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full absolute pointer-events-none"}`}>
          <h2 className="text-2xl text-gray-800 text-left mb-1 font-titilliumWeb-bold">Reset Password</h2>
          <p className="text-left text-blue-900 mb-6 font-titilliumWeb-bold">Enter your email for a reset link.</p>
          <form onSubmit={handleForgotPassword}>
            <div className="mb-4 font-titilliumWeb-bold">
              <input
                type="email"
                placeholder="email@example.com"
                className="w-full bg-white text-black px-4 py-2 border border-gray-300 rounded focus:outline-none"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>
            {forgotError && <div className="mb-3 text-red-600 text-sm font-bold">{forgotError}</div>}
            {forgotSuccess && <div className="mb-3 text-green-600 text-sm font-titilliumWeb-bold">{forgotSuccess}</div>}
            <button type="submit" className="w-full bg-nexus600 text-white rounded py-2 transition hover:bg-nexus800 font-titilliumWeb-bold" disabled={forgotLoading}>
              {forgotLoading ? "Sending..." : "Send Reset Email"}
            </button>
            <div className="text-center mt-4 font-titilliumWeb-bold ">
              <button type="button" className="text-blue-900 hover:underline text-sm font-titilliumWeb-bold cursor-pointer" onClick={() => { setShowForgot(false); setForgotError(""); setForgotSuccess(""); }}>Back to login</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;