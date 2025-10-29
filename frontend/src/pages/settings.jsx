import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { HiCog, HiUserCircle, HiLockClosed } from 'react-icons/hi';
import { BsChevronRight } from "react-icons/bs";

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  unlink,
  GoogleAuthProvider,
  linkWithPopup
} from 'firebase/auth';

import {
  getFirestore,
  doc,
  getDoc
} from 'firebase/firestore';

// Backend base (dev default points to 3000)
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_ORIGIN = (() => {
  try { return new URL(API_BASE).origin; } catch { return 'http://localhost:3000'; }
})();

function Settings() {
  const [isSelected, setSelected] = useState(1); // 1 = Account, 2 = Security

  // Firebase handles
  const [auth, setAuth] = useState(null);
  const dbRef = useRef(null);

  // App state
  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState('');

  // User/provider state
  const [user, setUser] = useState(null);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [discordLinked, setDiscordLinked] = useState(false);
  const [discordUsername, setDiscordUsername] = useState(null);

  // UI feedback
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  // Discord popup orchestration
  const popupRef = useRef(null);
  const handledRef = useRef(false);
  const linkingRef = useRef(false);
  const watchdogRef = useRef(null);

  // Initialize Firebase (re-use existing app if available)
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
        } else {
          const res = await fetch(`${API_BASE}/api/firebase-config`);
          if (!res.ok) throw new Error(`Config fetch failed: ${res.status} ${res.statusText}`);
          const cfg = await res.json();
          const app = initializeApp(cfg);
          const a = getAuth(app);
          const db = getFirestore(app);
          setAuth(a);
          dbRef.current = db;
        }

        // Listen for auth state
        const a = getAuth();
        unsub = onAuthStateChanged(a, async (u) => {
          setUser(u || null);
          if (u) {
            // Determine if Google is linked
            const providers = (u.providerData || []).map(p => p.providerId);
            setGoogleLinked(providers.includes('google.com'));

            // Load Firestore user doc for Discord username
            await refreshUserFirestore(u.uid);
          } else {
            setGoogleLinked(false);
            setDiscordLinked(false);
            setDiscordUsername(null);
          }
          setInitLoading(false);
        });
      } catch (e) {
        console.error('Firebase init error:', e);
        setInitError(String(e?.message || e));
        setInitLoading(false);
      }
    })();
    return () => {
      unsub && unsub();
    };
  }, []);

  // Cleanup watchdog on unmount
  useEffect(() => {
    return () => {
      if (watchdogRef.current) clearInterval(watchdogRef.current);
    };
  }, []);

  // Listen for Discord popup postMessage (SUCCESS / ERROR)
  useEffect(() => {
    const onMessage = async (ev) => {
      if (ev.origin !== API_ORIGIN) return;
      const msg = ev.data || {};
      if (msg.type !== 'DISCORD_AUTH_SUCCESS' && msg.type !== 'DISCORD_AUTH_ERROR') return;

      if (handledRef.current) return;
      handledRef.current = true;

      // Close popup and stop watchdog
      try { popupRef.current?.close?.(); } catch {}
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }

      if (msg.type === 'DISCORD_AUTH_SUCCESS') {
        setOkMsg('Discord linked successfully.');
        setError('');
        linkingRef.current = false;

        // Refresh Firestore user doc to get username and set linked state
        if (user?.uid) await refreshUserFirestore(user.uid);
      } else {
        setError(msg.error || 'Discord link failed.');
        setOkMsg('');
        linkingRef.current = false;
      }
      setActionBusy(false);
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [user]);

  // Helper: Refresh user doc from Firestore
  const refreshUserFirestore = async (uid) => {
    try {
      const db = dbRef.current || getFirestore();
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() || {};
        const discord = data.discord || null;
        if (discord && discord.id) {
          setDiscordLinked(true);
          setDiscordUsername(discord.username ?? null);
        } else {
          setDiscordLinked(false);
          setDiscordUsername(null);
        }
      } else {
        setDiscordLinked(false);
        setDiscordUsername(null);
      }
    } catch (e) {
      console.error('Failed to refresh Firestore user doc:', e);
    }
  };

  // Google link or unlink
  const handleGoogleAction = async () => {
    if (!user) {
      alert('You must be signed in.');
      return;
    }
    setError('');
    setOkMsg('');

    try {
      setActionBusy(true);
      if (googleLinked) {
        // Unlink Google
        await unlink(user, 'google.com');
        setGoogleLinked(false);
        setOkMsg('Google account unlinked.');
      } else {
        // Link Google to the existing account via linkWithPopup
        const provider = new GoogleAuthProvider();
        await linkWithPopup(user, provider);
        setGoogleLinked(true);
        setOkMsg('Google account linked.');
      }
    } catch (e) {
      console.error('Google link/unlink error:', e);
      setError((e?.message || 'Google action failed').replace('Firebase: ', ''));
    } finally {
      setActionBusy(false);
    }
  };

  // Start Discord link flow with popup and postMessage
  const startDiscordLink = () => {
    setError('');
    setOkMsg('');

    if (!user) {
      setError('You must be signed in.');
      return;
    }

    // prevent double clicks / repeated popups
    if (linkingRef.current) return;
    linkingRef.current = true;
    handledRef.current = false;
    setActionBusy(true);

    const w = 520, h = 700;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top  = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    const features = `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`;

    const url = `${API_BASE}/api/discord/auth?uid=${encodeURIComponent(user.uid)}`;

    const popup = window.open(url, 'discord_oauth', features);
    popupRef.current = popup;

    if (!popup) {
      // Popup blocked, fallback to full redirect
      window.location.href = url;
      return;
    }

    // If user closes popup without completing, reset so they can try again
    watchdogRef.current = setInterval(() => {
      if (popup.closed) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;

        if (!handledRef.current) {
          setActionBusy(false);
          linkingRef.current = false;
          setError('Discord login was cancelled.');
        }
      }
    }, 400);
  };

  // Unlink Discord via backend
  const handleDiscordUnlink = async () => {
    if (!user) {
      alert('You must be signed in.');
      return;
    }
    setError('');
    setOkMsg('');

    try {
      setActionBusy(true);
      const res = await fetch(`${API_BASE}/api/discord/unlink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      await refreshUserFirestore(user.uid);
      setOkMsg('Discord account unlinked.');
    } catch (e) {
      console.error('Unlink Discord error:', e);
      setError((e?.message || 'Failed to unlink Discord').replace('Firebase: ', ''));
    } finally {
      setActionBusy(false);
    }
  };

  // Combined handler for Discord button (link if not linked; unlink if linked)
  const handleDiscordAction = () => {
    if (discordLinked) {
      handleDiscordUnlink();
    } else {
      startDiscordLink();
    }
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
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen bg-cover max-w-screen bg-gradient-to-b from-nexus700 to-nexus900 relative overflow-hidden"
      style={{ backgroundImage: "url(/assets/AccountSettingsBackground.svg)" }}
    >
      {/* Sidebar */}
      <motion.aside
        className="shadow-md flex flex-col h-screen fixed left-0 top-0 pt-16 overflow-visible z-40 w-[17%]"
        style={{ backgroundImage: 'linear-gradient(#002966, #001433)' }}
      >
        <AnimatePresence>
          <motion.div
            className="flex-1 overflow-y-auto p-4 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-row border-b-1 border-nexus600">
              <HiCog size={30} color="#CCE0FF" className="mt-1 mr-2" />
              <h2 className="text-3xl text-nexus100 mb-4" style={{ fontFamily: 'titilliumWeb-bold' }}>
                Settings
              </h2>
            </div>

            <div
              className={`flex flex-row mt-4 rounded-md py-2 px-1 ${isSelected === 1 ? 'bg-nexus700' : ''}`}
              onClick={() => setSelected(1)}
              style={{ cursor: 'pointer' }}
            >
              <HiUserCircle size={25} color={isSelected === 1 ? "#66A3FF" : "#0066FF"} className="mt-1 mr-2" />
              <h2 className={`text-2xl ${isSelected === 1 ? 'text-nexus300' : 'text-nexus500'}`}>
                Account
              </h2>
            </div>

            <div
              className={`flex flex-row mt-2 rounded-md py-2 px-1 ${isSelected === 2 ? 'bg-nexus700' : ''}`}
              onClick={() => setSelected(2)}
              style={{ cursor: 'pointer' }}
            >
              <HiLockClosed size={25} color={isSelected === 2 ? "#66A3FF" : "#0066FF"} className="mt-1 mr-2" />
              <h2 className={`text-2xl ${isSelected === 2 ? 'text-nexus300' : 'text-nexus500'}`}>
                Security
              </h2>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.aside>

      {/* Content */}
      <motion.h1
        className="w-full mt-4 pt-20 flex justify-center items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        {/* Account tab */}
        {isSelected === 1 && (
          <div className="ml-40 flex bg-gradient-to-b from-nexus900 via-nexus800 to-nexus900 w-[30%] h-[60%] z-40 rounded-lg">
            <AnimatePresence>
              <motion.div
                className="w-full flex"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex w-full p-4 flex-col">
                  <h1 className="flex text-nexus100 text-3xl" style={{ fontFamily: 'titilliumWeb-bold' }}>
                    Account Settings
                  </h1>

                  {/* Google Link/Unlink */}
                  <div
                    className={`flex w-full h-12 bg-nexus700 mt-4 rounded-md items-center shadow-2xl ${actionBusy ? '' : 'hover:bg-nexus500'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={actionBusy ? undefined : handleGoogleAction}
                  >
                    <h1 className="flex w-full items-center pl-2 text-nexus100">
                      {googleLinked ? 'Unlink Google' : 'Link Google'}
                    </h1>
                    <BsChevronRight className="flex items-center justify-center" size={30} color="#CCE0FF" />
                  </div>

                  {/* Discord Link/Unlink — username inline when linked */}
                  <div
                    className={`flex w-full h-12 bg-nexus700 mt-4 rounded-md items-center shadow-2xl ${actionBusy ? '' : 'hover:bg-nexus500'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={actionBusy ? undefined : handleDiscordAction}
                  >
                    <h1 className="flex w-full items-center pl-2 text-nexus100">
                      {discordLinked
                        ? `Unlink Discord${discordUsername ? ` (${discordUsername})` : ''}`
                        : 'Link Discord'}
                    </h1>
                    <BsChevronRight className="flex items-center justify-center" size={30} color="#CCE0FF" />
                  </div>

                  {/* Inline feedback */}
                  {error && (
                    <div className="mt-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}
                  {okMsg && (
                    <div className="mt-3 text-sm text-green-400">
                      {okMsg}
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Security tab (placeholder) */}
        {isSelected === 2 && (
          <div className="ml-40 flex bg-gradient-to-b from-nexus900 via-nexus800 to-nexus900 w-[30%] h-[60%] z-40 rounded-lg">
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex p-4">
                  <h1 className="flex text-nexus100 text-3xl" style={{ fontFamily: 'titilliumWeb-bold' }}>
                    Security
                  </h1>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        <iframe
          src="/assets/Windmill.html"
          className="fixed h-200 w-150 -right-40 top-20 z-10 scale-110"
          title="decorative-windmill"
        />
      </motion.h1>
    </div>
  );
}

export default Settings;