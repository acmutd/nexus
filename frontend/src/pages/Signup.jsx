import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import { FaGoogle } from "react-icons/fa";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export default function Signup() {
  const navigate = useNavigate();

  const [auth, setAuth] = useState(null);
  const firestoreRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [pwVisible, setPwVisible] = useState(false);
  const [pw2Visible, setPw2Visible] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");

  const location = useLocation();

  // Popup animation state: retrigger on every navigation to this route
  const popupRef = React.useRef(null);
  const [popupVisible, setPopupVisible] = useState(false);
  useEffect(() => {
    setPopupVisible(false);
    const t = setTimeout(() => {
      // Force reflow so transition runs reliably
      if (popupRef.current) popupRef.current.offsetHeight;
      setPopupVisible(true);
    }, 60);
    return () => clearTimeout(t);
  }, [location.pathname, location.key]);


  useEffect(() => {
    (async () => {
      try {
        if (getApps().length) {
          const app = getApp();
          setAuth(getAuth(app));
          firestoreRef.current = getFirestore(app);
        } else {
          const res = await fetch(`${API_BASE}/api/firebase-config`);
          if (!res.ok) throw new Error(`Config fetch failed: ${res.status} ${res.statusText}`);
          const cfg = await res.json();
          if (!cfg?.apiKey) throw new Error("Config missing required keys.");

          const app = initializeApp(cfg);
          setAuth(getAuth(app));
          firestoreRef.current = getFirestore(app);
        }
      } catch (e) {
        console.error("Init error:", e);
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!auth || !firestoreRef.current) {
      setError("App not initialized.");
      return;
    }
    if (!email || !pw || !pw2) {
      setError("Please fill in all fields.");
      return;
    }
    if (pw !== pw2) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pw);
      const user = cred.user;

      await setDoc(
        doc(firestoreRef.current, "users", user.uid),
        {
          uid: user.uid,
          email: user.email ?? null,
          servers: [],
          courses: [],
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );

      navigate("/discordlogin");
    } catch (e) {
      console.error("Signup error:", e);
      const msg = (e?.message || "Signup failed").replace("Firebase: ", "");
      setError(msg);
    }
  };


  const signupWithGoogle = async () => {
    setError("");
    if (!auth) {
      setError("App not initialized yet. Please try again in a moment.");
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      const user = userCred.user;

      const app = getApps().length ? getApp() : null;
      const db = app ? getFirestore(app) : getFirestore();
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(
          userRef,
          {
            uid: user.uid,
            email: user.email ?? null,
            servers: [],
            courses: [],
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      navigate("/discordlogin");
    } catch (e) {
      console.error("Error with Google signup:", e);
      const msg = (e?.message || "Google signup failed").replace("Firebase: ", "");
      setError(msg);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-blue-950 text-blue-200 font-titilliumWeb-regular">Loading…</div>;

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-blue-950 font-titilliumWeb-regular"
      style={{
        backgroundImage: "url('/assets/SignUpBG.svg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div
        ref={popupRef}
        className={`bg-blue-200 rounded-lg shadow-lg p-8 w-full max-w-md transition-all duration-500 transform
          ${popupVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
      >
        <h2 className="text-2xl mb-1 text-gray-800 font-titilliumWeb-bold">Sign up for Nexus</h2>
        <p className="text-blue-900 mb-6 text-base font-titilliumWeb-bold">Create an account to get started</p>
        
        <form onSubmit={onSubmit}>
          <div className="mb-4 font-titilliumWeb-bold">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none bg-white text-black placeholder-gray-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-4 relative font-titilliumWeb-bold">
            <input
              type={pwVisible ? "text" : "password"}
              placeholder="Password"
              className="w-full px-4 py-2 border border-gray-300 rounded pr-10 focus:outline-none bg-white text-black placeholder-gray-400"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setPwVisible(v => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-600"
              tabIndex={-1}
            >
              {pwVisible ? <IoMdEye /> : <IoMdEyeOff />}
            </button>
          </div>

          <div className="mb-4 relative font-titilliumWeb-bold">
            <input
              type={pw2Visible ? "text" : "password"}
              placeholder="Confirm Password"
              className="w-full px-4 py-2 border border-gray-300 rounded pr-10 focus:outline-none bg-white text-black placeholder-gray-400"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setPw2Visible(v => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-600"
              tabIndex={-1}
            >
              {pw2Visible ? <IoMdEye /> : <IoMdEyeOff />}
            </button>
          </div>

          {error && <div className="text-red-600 mb-4 text-sm font-medium">{error}</div>}

          <button
            type="submit"
            className="w-full font-titilliumWeb-bold bg-nexus600 text-white py-2 rounded font-semibold transition transform hover:bg-nexus700 mb-3"
          >
            Sign Up
          </button>

          <button
            type="button"
            onClick={signupWithGoogle}
            className="w-full bg-white font-titilliumWeb-bold text-blue-900 border border-blue-300 py-2 rounded font-semibold transition flex items-center justify-center hover:bg-blue-100 mb-4"
          >
            <FaGoogle className="mr-2" /> Sign up with Google
          </button>
        </form>

        <div className="text-center text-sm text-gray-700 font-titilliumWeb-bold">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-blue-900 hover:underline">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}