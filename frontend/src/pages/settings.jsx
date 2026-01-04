import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from "framer-motion";
import { HiCog, HiUserCircle, HiLockClosed } from 'react-icons/hi';
import { BsChevronRight } from "react-icons/bs";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  unlink,
  GoogleAuthProvider,
  linkWithPopup,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';

import {
  getFirestore,
  doc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';

// Backend base (dev default points to 3000)
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_ORIGIN = (() => {
  try { return new URL(API_BASE).origin; } catch { return 'http://localhost:3000'; }
})();

function Settings() {
  const navigate = useNavigate();
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePassword2, setDeletePassword2] = useState('');
  const [deletePwVisible, setDeletePwVisible] = useState(false);
  const [deletePw2Visible, setDeletePw2Visible] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
        // Show error as popup alert
        alert(msg.error || 'Discord link failed.');
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

  // Delete account (Firestore + Auth)
  const handleDeleteAccount = async () => {
    if (!user) {
      alert('You must be signed in.');
      return;
    }
    
    setDeleteError('');
    
    // Validate password fields
    if (!deletePassword || !deletePassword2) {
      setDeleteError('Please enter your password in both fields.');
      return;
    }
    
    if (deletePassword !== deletePassword2) {
      setDeleteError('Passwords do not match.');
      return;
    }

    try {
      setActionBusy(true);
      
      // Re-authenticate user with their password
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);
      
      // Delete Firestore document
      const db = dbRef.current || getFirestore();
      const userRef = doc(db, 'users', user.uid);
      await deleteDoc(userRef);
      
      // Delete Firebase Auth user
      await deleteUser(user);
      
      // Navigate to landing page
      navigate('/');
    } catch (e) {
      console.error('Delete account error:', e);
      const msg = (e?.message || 'Failed to delete account').replace('Firebase: ', '');
      if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setDeleteError('Incorrect password. Please try again.');
      } else {
        setDeleteError(msg);
      }
      setActionBusy(false);
    }
  };

  if (initLoading) {
    return (
      <div className="bg-gradient-to-b from-nexus900 to-nexus700 min-h-screen flex items-center justify-center">
        <div className="text-white/80">Loading</div>
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
        className="w-full mt-4 pt-20 flex justify-center items-center relative flex-col"
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
                  <span className=" text-gray-400 font-titilliumWeb-regular my-2">
                    You'll need to Link a Google Account to be able to contribute to the SuperDoc!
                  </span>
                  <div
                    className={`flex w-full h-12 bg-nexus700 rounded-md items-center shadow-2xl ${actionBusy ? '' : 'hover:bg-nexus500'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={actionBusy ? undefined : handleGoogleAction}
                  >
                    <h1 className="flex w-full items-center pl-2 text-nexus100">
                      {googleLinked ? 'Unlink Google' : 'Link Google'}
                    </h1>
                    <BsChevronRight className="flex items-center justify-center" size={30} color="#CCE0FF" />
                  </div>

                  {/* Discord Link/Unlink  username inline when linked */}
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

                  {/* Delete Account Button */}
                  <div className="mt-8 pt-6 border-t border-gray-600">
                    <h2 className="text-nexus100 text-xl mb-2" style={{ fontFamily: 'titilliumWeb-bold' }}>
                      Account Deletion
                    </h2>
                    <span className="text-gray-400 font-titilliumWeb-regular text-sm">
                      Permanently delete your account and all associated data.
                    </span>
                    <button
                      className="mt-3 w-full h-12 bg-red-600 rounded-md items-center shadow-2xl hover:bg-red-700 transition flex justify-center"
                      onClick={() => setShowDeleteModal(true)}
                      disabled={actionBusy}
                    >
                      <h1 className="text-white font-titilliumWeb-semibold">
                        Delete Account
                      </h1>
                    </button>
                  </div>
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
          className="fixed h-200 w-150 -right-40 top-40 z-10 scale-110"
          title="decorative-windmill"
        />
      </motion.h1>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (                                                                               
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 13, 33, .9)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-blue-200 rounded-lg p-8 w-[450px] shadow-xl"
          >
            <h2 className="text-2xl text-gray-800 font-titilliumWeb-bold mb-2">
              Delete Account?
            </h2>
            <p className="text-blue-700 mb-6">
              This action cannot be undone. Please enter your password twice to confirm.
            </p>

            {/* Password Field */}
            <div className="mb-4 relative">
              <label
                htmlFor="delete_password"
                className="block text-left text-blue-700 mb-2 font-semibold"
              >
                Password
              </label>
              <input
                id="delete_password"
                type={deletePwVisible ? "text" : "password"}
                placeholder="Enter password"
                className="w-full bg-white text-black px-4 py-2 border border-gray-300 rounded-md focus:outline-none placeholder-gray-400 pr-10"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
                disabled={actionBusy}
              />
              <button
                type="button"
                onClick={() => setDeletePwVisible((v) => !v)}
                className="absolute top-13 right-4 -translate-y-1/2 text-gray-600 cursor-pointer"
                aria-label={deletePwVisible ? "Hide password" : "Show password"}
                disabled={actionBusy}
              >
                {deletePwVisible ? <IoMdEye /> : <IoMdEyeOff />}
              </button>
            </div>

            {/* Confirm Password Field */}
            <div className="mb-4 relative">
              <label
                htmlFor="delete_password2"
                className="block text-left text-blue-700 mb-2 font-semibold"
              >
                Confirm Password
              </label>
              <input
                id="delete_password2"
                type={deletePw2Visible ? "text" : "password"}
                placeholder="Confirm password"
                className="w-full bg-white text-black px-4 py-2 border border-gray-300 rounded-md focus:outline-none placeholder-gray-400 pr-10"
                value={deletePassword2}
                onChange={(e) => setDeletePassword2(e.target.value)}
                autoComplete="current-password"
                disabled={actionBusy}
              />
              <button
                type="button"
                onClick={() => setDeletePw2Visible((v) => !v)}
                className="absolute top-13 right-4 -translate-y-1/2 text-gray-600 cursor-pointer"
                aria-label={deletePw2Visible ? "Hide confirm password" : "Show confirm password"}
                disabled={actionBusy}
              >
                {deletePw2Visible ? <IoMdEye /> : <IoMdEyeOff />}
              </button>
            </div>

            {deleteError && (
              <div className="mb-4 text-red-600 text-sm">{deleteError}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setDeletePassword2('');
                  setDeleteError('');
                  setDeletePwVisible(false);
                  setDeletePw2Visible(false);
                }}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 px-4 rounded transition font-titilliumWeb-semibold"
                disabled={actionBusy}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition font-titilliumWeb-semibold"
                disabled={actionBusy}
              >
                {actionBusy ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default Settings;