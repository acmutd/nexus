import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const API_ORIGIN = (() => {
  try { return new URL(API_BASE).origin; } catch { return 'http://localhost:5001'; }
})();

export default function DiscordLogin() {
  const isMed = useMediaQuery({ query: '(max-width: 800px)' });
  const navigate = useNavigate();

  // Firebase
  const [auth, setAuth] = useState(null);
  const dbRef = useRef(null);

  // UI + flow
  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState('');
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const popupRef = useRef(null);
  const handledRef = useRef(false);
  const linkingRef = useRef(false);
  const watchdogRef = useRef(null);

  // Init or reuse Firebase
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
          unsub = onAuthStateChanged(a, (u) => { if (!u) navigate('/login'); });
        } else {
          const res = await fetch(`${API_BASE}/api/firebase-config`);
          if (!res.ok) throw new Error(`Config fetch failed: ${res.status} ${res.statusText}`);
          const cfg = await res.json();
          const app = initializeApp(cfg);
          const a = getAuth(app);
          const db = getFirestore(app);
          setAuth(a);
          dbRef.current = db;
          unsub = onAuthStateChanged(a, (u) => { if (!u) navigate('/login'); });
        }
      } catch (e) {
        console.error('Firebase init error:', e);
        setInitError(String(e?.message || e));
      } finally {
        setInitLoading(false);
      }
    })();
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (watchdogRef.current) clearInterval(watchdogRef.current);
    };
  }, []);

  // Listen for popup -> parent postMessage ONCE
  useEffect(() => {
    const onMessage = (ev) => {
      if (ev.origin !== API_ORIGIN) return;
      const msg = ev.data || {};
      if (msg.type !== 'DISCORD_AUTH_SUCCESS' && msg.type !== 'DISCORD_AUTH_ERROR') return;

      if (handledRef.current) return;
      handledRef.current = true;

      // Close popup if still open
      try { popupRef.current?.close?.(); } catch {}
      if (watchdogRef.current) clearInterval(watchdogRef.current);

      if (msg.type === 'DISCORD_AUTH_SUCCESS') {
        setOkMsg('Discord linked successfully.');
        setLinking(false);
        linkingRef.current = false;
        navigate('/accessrequest');
      } else {
        setError(msg.error || 'Discord link failed.');
        setLinking(false);
        linkingRef.current = false;
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [navigate]);

  const startDiscordLogin = () => {
    setError('');
    setOkMsg('');

    const user = auth?.currentUser;
    if (!user) {
      setError('You must be logged in first.');
      navigate('/login');
      return;
    }

    // prevent double clicks / repeated popups
    if (linkingRef.current) return;
    linkingRef.current = true;
    handledRef.current = false;
    setLinking(true);

    const w = 520, h = 700;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top  = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    const features = `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`;

    const url = `${API_BASE}/api/discord/auth?uid=${encodeURIComponent(user.uid)}`;

    const popup = window.open(url, 'discord_oauth', features);
    popupRef.current = popup;

    if (!popup) {
      // Popup blocked fallback to full redirect
      window.location.href = url;
      return;
    }

    // if user closes popup without completing, reset flow so they can try again
    watchdogRef.current = setInterval(() => {
      if (popup.closed) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;

        // If we never handled a success/error, reset state so another attempt is possible
        if (!handledRef.current) {
          setLinking(false);
          linkingRef.current = false;
          setError('Discord login was cancelled.');
        }
      }
    }, 400);
  };

  if (initLoading) {
    return (
      <div className="bg-gradient-to-b from-nexus900 to-nexus700 min-h-screen flex items-center justify-center">
        <div className="text-white/80">Loading…</div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="bg-gradient-to-b from-nexus900 to-nexus700 min-h-screen flex items-center justify-center">
        <div className="bg-white/90 rounded-lg p-6 text-red-700 w-[480px]">
          <div className="font-semibold mb-2">Initialization failed</div>
          <div className="text-sm whitespace-pre-wrap">{initError}</div>
          <div className="mt-4">
            <Link to="/login" className="text-nexus600 underline">Return to login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className="bg-gradient-to-b from-nexus900 to-nexus700 flex flex-col items-center justify-center h-full pt-60"
        style={{ paddingTop: isMed ? 240 : 160 }}
      >
        {isMed ? (
          <img
            className="bg-gradient-to-b from-nexus900 to-nexus700 flex-1 items-center justify-center"
            src="/assets/AccessRequestLongBG.svg"
            style={{ position: 'absolute', zIndex: 0 }}
          />
        ) : (
          <img
            className="bg-gradient-to-b from-nexus900 to-nexus700 flex-1 items-center justify-center"
            src="/assets/AccessRequestBG.svg"
            style={{ position: 'absolute', zIndex: 0 }}
          />
        )}

        <h1 className="flex-1 font-titilliumWeb-bold text-white text-4xl" style={{ zIndex: 1 }} />

        <div
          className="flex-1 w-2/5 h-4/5 bg-gradient-to-b from-nexus100 from-10% via-nexus50 to-nexus100 to-90% rounded-xl mt-6 p-6"
          style={{ zIndex: 2 }}
        >
          <div className="items-center justify-center flex flex-row">
            <img src="/assets/DiscordLogo.svg" style={{ scale: isMed ? 0.6 : 1, margin: isMed ? -12 : 12 }} />
          </div>

          <div
            className="items-center justify-center flex flex-col"
            style={{ marginTop: isMed ? -8 : 0, scale: isMed ? 0.8 : 1 }}
          >
            <h1
              className="w-4/5 text-center font-titilliumWeb-regular text-nexus800 text-5xl"
              style={{ width: isMed ? '100%' : '80%', fontSize: isMed ? 36 : 48 }}
            >
              Now Let's Get Your Discord Setup!
            </h1>
          </div>

          <div className="flex flex-row justify-center items-center">
            <button
              onClick={startDiscordLogin}
              disabled={linking}
              className={`text-white bg-nexus500 py-3 text-2xl font-titilliumWeb-bold rounded-lg flex flex-row 
                          transition duration-300 drop-shadow-black text-center items-center justify-center
                          ${linking ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105'}`}
              style={{ width: isMed ? '90%' : '80%', marginTop: isMed ? 0 : 24 }}
            >
              {linking ? 'Connecting…' : 'Login Through Discord'}
            </button>
          </div>

          {error && <div className="mt-4 text-center text-red-700 text-sm">{error}</div>}
          {okMsg && <div className="mt-4 text-center text-green-700 text-sm">{okMsg}</div>}
        </div>
      </div>
    </div>
  );
}