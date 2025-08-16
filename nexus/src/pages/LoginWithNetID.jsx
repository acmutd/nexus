import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMediaQuery } from 'react-responsive';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";
const DISCORD_BASE = import.meta.env.VITE_DISCORD_BASE_URL || API_BASE;

const titleCaseOne = (s) =>
  (s || "")
    .trim()
    .toLowerCase()
    .replace(/^[a-z]/, (m) => m.toUpperCase());
const buildCourseId = (code, instructor) =>
  instructor ? `${code}-${titleCaseOne(instructor)}` : code;

export default function LoginWithNetID() {
  const navigate = useNavigate();
  const isMed = useMediaQuery({ query: '(max-width: 800px)' });

  // Firebase
  const [auth, setAuth] = useState(null);
  const dbRef = useRef(null);

  // UI & form state
  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState("");
  const [netId, setNetId] = useState("");
  const [elearnPw, setElearnPw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Initialize or reuse Firebase app
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        if (getApps().length) {
          const app = getApp();
          const a = getAuth(app);
          const db = getFirestore(app);
          setAuth(a);
          dbRef.current = db;
          unsub = onAuthStateChanged(a, (u) => { if (!u) navigate("/login"); });
        } else {
          const res = await fetch(`${API_BASE}/api/firebase-config`);
          if (!res.ok) throw new Error(`Config fetch failed: ${res.status} ${res.statusText}`);
          const cfg = await res.json();
          if (!cfg?.apiKey) throw new Error("Config missing required keys.");
          const app = initializeApp(cfg);
          const a = getAuth(app);
          const db = getFirestore(app);
          setAuth(a);
          dbRef.current = db;
          unsub = onAuthStateChanged(a, (u) => { if (!u) navigate("/login"); });
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

  const checkAndAllocateDiscordCourses = async (uid, courses) => {
    try {
      const userDocRef = doc(dbRef.current, "users", uid);
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) return;

      const data = snap.data() || {};
      const { discordId, servers } = data;
      if (discordId && Array.isArray(servers) && servers.length > 0) {
        const res = await fetch(`${DISCORD_BASE}/discord/allocate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ discordId, servers, courses }),
        });
        if (!res.ok) {
          const t = await res.text();
          console.error("Allocation error:", t);
        }
      }
    } catch (e) {
      console.error("Allocation check error:", e);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!auth || !dbRef.current) {
      setError("App not initialized.");
      return;
    }
    if (!netId || !elearnPw) {
      setError("Please enter your NetID and eLearning password.");
      return;
    }

    setSubmitting(true);
    try {
      // 1) Scrape
      const res = await fetch(`${API_BASE}/api/scraper/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ netid: netId, password: elearnPw }),
      });
      const data = await res.json();

      // 2) Normalize to { course_id: "PREFIX-####-Prof" }
      const raw = data?.status === "success" ? data.courses || [] : [];
      const courses = raw.map((c) => {
        if (typeof c === "object" && c?.course_id) {
          return { course_id: String(c.course_id).toUpperCase() };
        }
        const s = String(c);
        const m = s.match(/^([A-Za-z]{2,4})\s*-?\s*(\d{4})(?:\s*[- ]\s*([A-Za-z][A-Za-z\-']+))?/);
        if (!m) return { course_id: s.toUpperCase() };
        const prefix = m[1].toUpperCase();
        const number = m[2];
        const prof   = m[3] ? titleCaseOne(m[3]) : "";
        const code   = `${prefix}-${number}`;
        return { course_id: buildCourseId(code, prof) };
      });

      // 3) Save to Firestore
      const user = auth.currentUser;
      if (!user) {
        setError("Your session expired. Please log in again.");
        return;
      }
      const userDocRef = doc(dbRef.current, "users", user.uid);
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          email: user.email || null,
          netId,
          courses,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );

      // 4) Optional Discord allocation
      await checkAndAllocateDiscordCourses(user.uid, courses);

      // 5) Navigate next
      if (courses.length > 0) {
        navigate("/courses");
      } else {
        navigate("/courseEntry");
      }
    } catch (e) {
      console.error("Scraper error:", e);
      setError("Failed to fetch course data. Please try again or skip.");
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
          <div className="mt-4">
            <Link to="/login" className="text-blue-700 underline">Return to login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-blue-950 bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/AccessRequestBG.svg')"}}>

      <div className="w-2/5 mx-auto mt-10 p-10 bg-gradient-to-b from-nexus100 from-10% via-nexus50 to-nexus100 to-90% rounded-xl shadow-md relative">
          <div className="items-center justify-center flex flex-row">
            <img src="/assets/Logo.svg" style={{ scale: isMed ? .6 : 1, paddingRight: isMed ? -12 : 24 }} />
            <img src="/assets/UTDLogo.svg" style={{ scale: isMed ? .6 : 1, paddingLeft: isMed ? -12 : 24 }} />
          </div>

        <form onSubmit={onSubmit}>
          <h2 className="text-3xl font-titilliumWeb-bold text-center font-bold text-gray-800 mb-4 py-2">
            Login with E-Learning Credentials
          </h2>

          <div className="mb-4">
            <label htmlFor="netId" className="block text-left text-blue-700 mb-2 font-semibold">
              NetID
            </label>
            <input
              id="netId"
              type="text"
              placeholder="Enter NetID"
              className="w-full bg-white px-4 py-2 border placeholder-gray-400 rounded-md focus:outline-none"
              value={netId}
              onChange={(e) => setNetId(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="elearnPw" className="block text-left text-blue-700 mb-2 font-semibold">
              E-Learning Password
            </label>
            <input
              id="elearnPw"
              type="password"
              placeholder="Enter Password"
              className="w-full bg-white px-4 py-2 border placeholder-gray-400 rounded-md focus:outline-none"
              value={elearnPw}
              onChange={(e) => setElearnPw(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

          <div className="mb-4">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full rounded-md py-2 px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                ${submitting ? "bg-blue-400 text-white cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
            >
              {submitting ? "Fetching…" : "Login"}
            </button>
          </div>

          <div className="text-center text-sm text-gray-700 font-bold">
            Prefer to skip?{" "}
            <Link to="/courseEntry" className="font-bold text-blue-700 hover:underline">
              Enter courses manually
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}