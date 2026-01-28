import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import Button from "../components/Button";

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
  const popupRef = useRef(null);
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
          const res = await fetch(`/api/firebase-config`);
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

      // After signup, go to course linking and make sure onboarding state is refreshed
      try { window.dispatchEvent(new CustomEvent('refreshOnboarding')) } catch (e) { }
      navigate("/CourseLinking");
    } catch (e) {
      console.error("Signup error:", e);
      const msg = (e?.message || "Signup failed").replace("Firebase: ", "");
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
        className={`bg-nexus100 rounded-lg shadow-lg p-8 w-full max-w-md transition-all duration-500 transform mt-15
          ${popupVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
      >
        <h2 className="bodyText mb-1 text-gray-800 font-titilliumWeb-bold">Sign up for Nexus</h2>
        <p className="text-blue-900 mb-6 tinyText font-titilliumWeb-bold">Create an account to get started</p>
        
        <form onSubmit={onSubmit}>
          <div className="mb-4 font-titilliumWeb-semibold tinyText">
            <h1 className="tinyText font-titilliumWeb-semibold text-nexus700 mb-2">
              Email
            </h1>
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none bg-white text-black placeholder-gray-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-4 relative font-titilliumWeb-semibold tinyText">
            <h1 className="tinyText font-titilliumWeb-semibold text-nexus700 mb-2">
              Password
            </h1>            
            <div className="flex relative tinyText">
              <input
                type={pwVisible ? "text" : "password"}
                placeholder="Password"
                className="w-full px-4 py-3 border border-gray-300 rounded pr-10 focus:outline-none bg-white text-black placeholder-gray-400"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setPwVisible(v => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-600 cursor-pointer"
                tabIndex={-1}
              >
                {pwVisible ? <IoMdEye /> : <IoMdEyeOff />}
              </button>
            </div>      
          </div>

          <div className="mb-4 relative font-titilliumWeb-semibold tinyText">
            <h1 className="tinyText font-titilliumWeb-semibold text-nexus700 mb-2 ">
              Confirm Password
            </h1>    
            <div className="flex relative tinyText">
              <input
                type={pw2Visible ? "text" : "password"}
                placeholder="Confirm Password"
                className="w-full px-4 py-3 border border-gray-300 rounded pr-10 focus:outline-none bg-white text-black placeholder-gray-400"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setPw2Visible(v => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-600 cursor-pointer"
                tabIndex={-1}
              >
                {pw2Visible ? <IoMdEye /> : <IoMdEyeOff />}
              </button>
            </div>        
          </div>

          {error && <div className="text-red-600 mb-4 text-sm font-medium">{error}</div>}

          <Button
            type="submit"
            className={"mb-2"}
            text={"Sign Up"}
          />


        </form>

        <div className="text-center tinyText text-gray-700 font-titilliumWeb-bold">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-blue-900 hover:underline">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}