import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import { FaGoogle } from "react-icons/fa";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const Login = () => {
  const navigate = useNavigate();

  // Firebase handles
  const [auth, setAuth] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [pwVisible, setPwVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        if (getApps().length) {
          const app = getApp();
          const authInstance = getAuth(app);
          setAuth(authInstance);
          unsub = onAuthStateChanged(authInstance, (u) => u && navigate("/"));
          return;
        }

        const res = await fetch(`${API_BASE}/api/firebase-config`);
        if (!res.ok) throw new Error(`Config fetch failed: ${res.status} ${res.statusText}`);
        const cfg = await res.json();
        if (!cfg?.apiKey) throw new Error("Config missing required keys.");

        const app = initializeApp(cfg);
        const authInstance = getAuth(app);
        setAuth(authInstance);

        unsub = onAuthStateChanged(authInstance, (u) => {
          if (u) navigate("/");
        });
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
    if (!auth) {
      setError("App not initialized.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);
    } catch (e) {
      console.error("Email login error:", e);
      const msg = (e?.message || "Login failed").replace("Firebase: ", "");
      setError(msg);
    }
  };

  const loginWithGoogle = async () => {
  setError("");
  if (!auth) {
    setError("App not initialized.");
    return;
  }

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
    // Redirect handled by onAuthStateChanged or navigate here
  } catch (e) {
    console.error("Google login error:", e);
    const msg = (e?.message || "Google login failed").replace("Firebase: ", "");
    setError(msg);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-950">
        <div className="text-blue-200">Loading…</div>
      </div>
    );
  }

  if (error && !auth) {
    // fail during init
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-950">
        <div className="w-[450px] mx-auto mt-10 p-6 bg-blue-200 rounded-xl shadow-md text-red-700">
          <div className="font-semibold mb-2">Initialization failed</div>
          <div className="text-sm whitespace-pre-wrap">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-950">
      <div className="w-[450px] mx-auto mt-10 p-10 bg-blue-200 rounded-xl shadow-md">
        <form onSubmit={loginWithEmail}>
          <h2 className="text-2xl font-bold text-gray-800 text-left mb-1">
            Login to Nexus
          </h2>
          <p className="text-left text-blue-700 mb-6">
            Enter your email below to login to your account
          </p>

          <div className="mb-4">
            <label htmlFor="email" className="block text-left text-blue-700 mb-2 font-semibold">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="email@example.com"
              className="w-full bg-white text-black px-4 py-2 border border-gray-300 rounded-md focus:outline-none placeholder-gray-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="mb-4 relative">
            <label htmlFor="password" className="block text-left text-blue-700 mb-2 font-semibold">
              Password
            </label>
            <input
              id="password"
              type={pwVisible ? "text" : "password"}
              placeholder="Enter password"
              className="w-full bg-white text-black px-4 py-2 border border-gray-300 rounded-md focus:outline-none placeholder-gray-400 pr-10"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setPwVisible((v) => !v)}
              className="absolute top-10 right-4 -translate-y-1/2 text-gray-600"
              aria-label={pwVisible ? "Hide password" : "Show password"}
            >
              {pwVisible ? <IoMdEyeOff /> : <IoMdEye />}
            </button>
          </div>

          {error && (
            <div className="mb-3 text-red-600 text-sm">{error}</div>
          )}

          <div className="mb-3">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white rounded-md py-2 px-4 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-base"
            >
              Login
            </button>
          </div>

          <div className="mb-4">
            <button
              type="button"
              onClick={loginWithGoogle}
              className="w-full bg-white text-blue-900 border border-blue-300 rounded-md py-2 px-4 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-base flex items-center justify-center"
            >
              <FaGoogle className="mr-2" />
              Login with Google
            </button>
          </div>

          <div className="text-center text-sm text-gray-700 font-bold">
            Don’t have an account?{" "}
            <Link to="/signup" className="font-bold text-blue-700 hover:underline">
              Signup here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;