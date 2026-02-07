import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from "framer-motion";
import { HiCog, HiUserCircle, HiLockClosed, HiX, HiChevronRight } from 'react-icons/hi';
import { BsChevronRight } from "react-icons/bs";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import { useMobile } from '../context/mobileContext';
import { useAuth, LOGOUT_REDIRECT_PATH, setPostLogoutRedirect } from '../context/authContext';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
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
import Button from '../components/Button';
import LoadingScreen from '../components/LoadingScreen';
import StarFieldOverlay from '../components/StarFieldOverlay';

const API_ORIGIN = window.location.origin;

function Settings() {
  const navigate = useNavigate();
  const [isSelected, setSelected] = useState(1); // 1 = Account, 2 = Security
  const {isMobile} = useMobile()

  // Firebase handles
  const [auth, setAuth] = useState(null);
  const dbRef = useRef(null);

  // App state
  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState('');

  // User/provider state
  const [user, setUser] = useState(null);
  const [discordLinked, setDiscordLinked] = useState(false);
  const [discordUsername, setDiscordUsername] = useState(null);

  // UI feedback
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPWResetModal, setShowPWResetModal] = useState(false);
  const [showRedoModal, setShowRedoModal] = useState(false);
  const [redoConfirmText, setRedoConfirmText] = useState('');
  const [redoError, setRedoError] = useState('');
  const { refreshOnboarding } = useAuth();
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
          const res = await fetch(`/api/firebase-config`);
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
            // Load Firestore user doc for Discord username
            await refreshUserFirestore(u.uid);
          } else {
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
      console.log('[DiscordPopup] Received postMessage', ev, 'window.origin:', window.location.origin);
      // Accept messages from the popup window regardless of origin (popup may use production domain)
      if (popupRef.current && ev.source !== popupRef.current) return;
      const msg = ev.data || {};
      if (msg.type !== 'DISCORD_AUTH_SUCCESS' && msg.type !== 'DISCORD_AUTH_ERROR') return;
      if (handledRef.current) {
        return;
      }
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
    return () => {window.removeEventListener('message', onMessage)};
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if(popupRef.current && !popupRef.current.contains(event.target)) {
        setShowDeleteModal(false)
        setShowPWResetModal(false)
        setShowRedoModal(false)
        setRedoConfirmText('')
        setRedoError('')
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {document.removeEventListener('mousedown', handleClickOutside)}
  })

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
          return true;
        } else {
          setDiscordLinked(false);
          setDiscordUsername(null);
          return false;
        }
      } else {
        setDiscordLinked(false);
        setDiscordUsername(null);
        return false;
      }
    } catch (e) {
      console.error('Failed to refresh Firestore user doc:', e);
      return false;
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

    const w = 520, h = 800;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top  = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    const features = `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`;

    const url = `/api/discord/auth?uid=${encodeURIComponent(user.uid)}`;

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
        setTimeout(async () => {
          if (!handledRef.current) {
            // Try refreshing user doc to see if backend already linked the Discord account
            try {
              const linked = await refreshUserFirestore(user.uid);
              if (linked) {
                handledRef.current = true;
                setOkMsg('Discord linked successfully.');
                setError('');
                linkingRef.current = false;
                setActionBusy(false);
                return;
              }
            } catch (e) {
              console.error('[DiscordPopup] Error refreshing user after popup close:', e);
            }

            setError('Discord login was cancelled.');
            setOkMsg('');
            linkingRef.current = false;
            setActionBusy(false);
          }
        }, 150); // 150ms delay to allow postMessage handler to run
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

    setActionBusy(true);
    try {
      const token = await user.getIdToken();
      await fetch(`/api/discord/unlink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ uid: user.uid })
      });
      await refreshUserFirestore(user.uid);
      setOkMsg('Discord account unlinked.');
    } catch (err) {
      console.error('Failed to unlink Discord:', err);
      setError((err?.message || 'Failed to unlink Discord').replace('Firebase: ', ''));
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

  const handleRedoCourseLinking = async () => {
    if (!user) {
      setError('You must be signed in.');
      return;
    }

    if (redoConfirmText.trim() !== 'Confirm') {
      setRedoError('Please type "Confirm" exactly to proceed.');
      return;
    }

    setError('');
    setRedoError('');
    setOkMsg('');
    setActionBusy(true);

    try {
      const token = await user.getIdToken();
      const resp = await fetch('/api/firestore/resetCourses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.uid, token })
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data.success === false) {
        throw new Error(data.error || 'Failed to reset courses');
      }

      // Refresh onboarding snapshot and redirect to course linking
      try {
        await refreshOnboarding(user);
      } catch (e) {
        console.warn('refreshOnboarding after reset failed, proceeding with navigation', e);
      }
      window.dispatchEvent(new Event('refreshOnboarding'));
      setShowRedoModal(false);
      setRedoConfirmText('');
      setRedoError('');
      navigate('/CourseLinking', { state: { skipAccountLinking: true, forceCourseRelink: true }, replace: true });
    } catch (e) {
      console.error('Redo course linking error:', e);
      setRedoError((e?.message || 'Failed to reset courses').replace('Firebase: ', ''));
      setActionBusy(false);
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
      setPostLogoutRedirect(LOGOUT_REDIRECT_PATH);
      
      // Re-authenticate user with their password
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);
      
        // Unlink Discord account via API before deleting user data
        try {
          const token = await user.getIdToken();
          await fetch(`/api/discord/unlink`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ uid: user.uid })
          });
        } catch (err) {
          // log
          console.error('Failed to unlink Discord during account deletion:', err);
        }
      
      // Delete Firestore document
      const db = dbRef.current || getFirestore();
      const userRef = doc(db, 'users', user.uid);
      await deleteDoc(userRef);

      const gradesRef = doc(db, 'courseGrades', user.uid);
      await deleteDoc(gradesRef);
      
      // Delete Firebase Auth user (triggers auth change)
      await deleteUser(user);
      // Let RequireAuth consume redirect; no manual navigation needed
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
      <div className="bg-linear-to-b from-nexus900 to-nexus800 min-h-screen flex items-center justify-center">
        <div className="text-white/80">Loading</div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="bg-linear-to-b from-nexus900 to-nexus800 min-h-screen flex items-center justify-center">
        <div className="bg-white/90 rounded-lg p-6 text-red-800 w-[480px]">
          <div className="font-semibold mb-2">Initialization failed</div>
          <div className="text-sm whitespace-pre-wrap">{initError}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-row min-h-screen bg-linear-to-b from-nexus900 to-nexus700 fixed overflow-hidden inset-0"/>
      
      <StarFieldOverlay count={150}/>
      <motion.img initial={{y:200, opacity:0}} animate={{y:10, opacity:1}} transition={{duration:1, type: 'spring', damping: 15, delay:0.3}} 
                  src='/assets/SettingsAssets/SettingsClouds.svg' className='fixed bottom-0'/>
      

      <div className='relative flex min-h-screen overflow-hidden'>
        {/* Sidebar */}
        <motion.aside
          className="shadow-md flex flex-col h-screen left-0 top-0 pt-16 overflow-visible z-40 w-[clamp(150px,17%,300px)]"
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
              <div className="flex flex-row border-b border-nexus600 pb-4">
                <div className='flex mr-1 items-center justify-center'>
                  <HiCog size={30} color="#CCE0FF" className="" />
                </div>
                <h2 className="headingText text-nexus100" style={{ fontFamily: 'titilliumWeb-bold' }}>
                  Settings
                </h2>
              </div>

              <div
                className={`flex flex-row mt-4 rounded-md py-2 px-2 font-titilliumWeb-semibold items-center ${isSelected === 1 ? 'bg-nexus800' : ''}`}
                onClick={() => setSelected(1)}
                style={{ cursor: 'pointer' }}
              >
                <div className='flex items-center justify-center mr-2'>
                  <HiUserCircle size={25} className={`bodyText ${isSelected === 1 ? 'text-nexus300' : 'text-nexus600'}`}/>
                </div>
                <h2 className={`bodyText ${isSelected === 1 ? 'text-nexus300' : 'text-nexus600'}`}>
                  Account
                </h2>
              </div>

              <div
                className={`flex flex-row mt-4 rounded-md py-2 px-2 font-titilliumWeb-semibold items-center ${isSelected === 2 ? 'bg-nexus800' : ''}`}
                onClick={() => setSelected(2)}
                style={{ cursor: 'pointer' }}
              >
                <div className='flex items-center justify-center mr-2'>
                  <HiLockClosed size={25} className={`bodyText ${isSelected === 2 ? 'text-nexus300' : 'text-nexus600'}`}/>
                </div>
                <h2 className={`bodyText ${isSelected === 2 ? 'text-nexus300' : 'text-nexus600'}`}>
                  Security
                </h2>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.aside>

        {actionBusy && (
          <LoadingScreen message='Give Us A Moment...'/>
        )}

        {/* Content */}
        <motion.h1
          className={`mt-20 flex relative flex-col w-[clamp(300px,45%,1200px)] ${isMobile ? 'items-center' : 'ml-6'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {/* Account tab */}
          {isSelected === 1 && (
            <div className="flex">
              <AnimatePresence>
                <motion.div
                  className="w-full flex"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex w-full p-6 flex-col">
                    <h2 className="text-nexus300 bodyText" style={{ fontFamily: 'titilliumWeb-bold' }}>
                      Account Linking
                    </h2>
                    {/* Discord Link/Unlink  username inline when linked */}
                    <div
                      className={`flex w-full h-12 bg-nexus800 mt-4 rounded-md items-center transition duration-300 tinyText font-titilliumWeb-semibold ${actionBusy ? '' : 'hover:bg-nexus700'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={actionBusy ? undefined : handleDiscordAction}
                    >
                      <h1 className="flex w-full items-center pl-2 text-nexus100">
                        {discordLinked
                          ? `Unlink Discord${discordUsername ? ` (${discordUsername})` : ''}`
                          : 'Link Discord'}
                      </h1>
                      <HiChevronRight className="flex items-center justify-center" size={30} color="#CCE0FF" />
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

                    {/* Redo Course Linking */}
                    <div className="flex flex-col pt-6">
                      <h2 className="text-nexus300 bodyText" style={{ fontFamily: 'titilliumWeb-bold' }}>
                        Course Linking
                      </h2>
                      <span className="text-gray-400 font-titilliumWeb-regular tinyText my-2">
                        
                      </span>
                      <div
                        className={`flex w-full h-12 bg-nexus800 rounded-md items-center transition duration-300 ${actionBusy ? '' : 'hover:bg-nexus700'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={actionBusy ? undefined : () => setShowRedoModal(true)}
                        disabled={actionBusy}
                      >
                        <h1 className="flex w-full items-center pl-2 text-nexus100 tinyText font-titilliumWeb-semibold">
                          Redo Course Linking
                        </h1>
                        <HiChevronRight className="flex items-center justify-center" size={30} color="#CCE0FF" />
                      </div>
                    </div>

                    {/* Delete Account Button */}
                    <div className="flex flex-col pt-6">
                      <h2 className="text-nexus300 bodyText" style={{ fontFamily: 'titilliumWeb-bold' }}>
                        Account Deletion
                      </h2>
                      <span className="text-gray-400 font-titilliumWeb-regular tinyText my-2">
                        Permanently delete your account and all associated data.
                      </span>
                      <div
                        className={`flex w-full h-12 bg-nexus800 rounded-md items-center transition duration-300 ${actionBusy ? '' : 'hover:bg-nexus700'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setShowDeleteModal(true)}
                        disabled={actionBusy}
                      >
                        <h1 className="flex w-full items-center pl-2 text-nexus100 tinyText font-titilliumWeb-semibold">
                          Delete Account
                        </h1>
                        <HiChevronRight className="flex items-center justify-center" size={30} color="#CCE0FF" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* Security tab with password reset */}
          {isSelected === 2 && (
            <div className="flex w-full">
              <AnimatePresence>
                <motion.div
                  className="w-full flex"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex w-full p-6 flex-col">
                    <h2 className="text-nexus300 bodyText mb-2" style={{ fontFamily: 'titilliumWeb-bold' }}>
                      Password Reset
                    </h2>
                    <div
                      className={`flex w-full h-12 bg-nexus800 rounded-md items-center transition duration-300 ${actionBusy ? '' : 'hover:bg-nexus700'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setShowPWResetModal(true)}
                      disabled={actionBusy}>

                      <h1 className="flex w-full items-center pl-2 text-nexus100 tinyText font-titilliumWeb-semibold">
                        Reset Password
                      </h1>
                      <HiChevronRight className="flex items-center justify-center" size={30} color="#CCE0FF" />
                    
                    </div>

                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

        </motion.h1>

        {/* Reset Password Modal */}
        <AnimatePresence>
          {showPWResetModal && (
          <motion.div 
            className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 13, 33, .9)'}}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{opacity: 0, scale: 0.9}}
                className="flex flex-col relative bg-nexus800 rounded-lg p-8 w-[450px] shadow-xl border border-nexus800"
                ref={popupRef}
              >
                <HiX onClick={() => {
                      setShowPWResetModal(false)
                    }}
                    className='text-white absolute right-8 top-9 cursor-pointer hover:text-gray-400 transition duration-300' size={25}
                />
                <h2 className="text-2xl text-nexus100 font-titilliumWeb-bold">
                  Reset Password
                </h2>
                <label className="text-nexus100 font-semibold my-2">Reset Password</label>
                <input
                  type="email"
                  className="bg-nexus900 text-white px-3 py-2 rounded mb-2 border border-nexus800"
                  placeholder="Enter your email"
                  value={user?.email || ''}
                  readOnly
                />
                <Button
                  className="cursor-pointer mt-2"
                  disabled={actionBusy || !user?.email}
                  onClick={async () => {
                    setError('');
                    setOkMsg('');
                    setActionBusy(true);
                    try {
                      const authInst = auth || getAuth();
                      await import('firebase/auth').then(({ sendPasswordResetEmail }) =>
                        sendPasswordResetEmail(authInst, user.email, {
                          url: window.location.origin + '/reset-password',
                          handleCodeInApp: true
                        })
                      );
                      setOkMsg('Password reset email sent! Check your spam/inbox.');
                    } catch (e) {
                      setError(e?.message || 'Failed to send reset email.');
                    }
                    setActionBusy(false);
                  }}
                  text={actionBusy ? 'Sending…' : 'Request Password Reset'}
                >
                </Button>
                {okMsg && <div className="text-green-400 mt-2">{okMsg}</div>}
              </motion.div>
          </motion.div>
          )}
        </AnimatePresence>

        {/* Redo Course Linking Confirmation Modal */}
        <AnimatePresence>
          {showRedoModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 13, 33, .9)'}}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{opacity: 0, scale: 0.9, transition: {duration: 0.2}}}
                transition={{duration: 0.2}}
                className="bg-nexus800 rounded-lg p-8 w-[450px] shadow-xl border relative"
                ref={popupRef}
              >
                <HiX onClick={() => { setShowRedoModal(false); setRedoConfirmText(''); setRedoError(''); }}
                     className='text-white absolute right-8 top-9 cursor-pointer hover:text-gray-400 transition duration-300' size={25}
                />
                <h2 className="bodyText text-nexus200 font-titilliumWeb-bold mb-1">
                  Redo Course Linking?
                </h2>
                <p className="text-gray-400 mb-4 tinyText">
                  This will remove all linked courses and any saved grades for this account. You will need to relink via eLearning or transcript upload again.
                </p>

                <div className="mb-4">
                  <label className="block text-left text-nexus100 mb-2 font-semibold tinyText">
                    Type <span className="text-nexus300">Confirm</span> to continue
                  </label>
                  <input
                    type="text"
                    className="w-full bg-nexus900 text-white px-4 py-2 border border-nexus800 rounded-md focus:outline-none placeholder-gray-400"
                    placeholder="Confirm"
                    value={redoConfirmText}
                    onChange={(e) => setRedoConfirmText(e.target.value)}
                    disabled={actionBusy}
                  />
                </div>

                {redoError && (
                  <div className="mb-4 text-red-400 text-sm">{redoError}</div>
                )}

                <div className="flex gap-3">
                  <Button
                    className={'bg-nexus700'}
                    onClick={() => { setShowRedoModal(false); setRedoConfirmText(''); setRedoError(''); }}
                    disabled={actionBusy}
                    text="Cancel"
                  />
                  <Button
                    className={'bg-red-500'}
                    onClick={handleRedoCourseLinking}
                    disabled={actionBusy}
                    text={actionBusy ? "Clearing..." : "Confirm"}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && (                                                                               
            <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 13, 33, .9)'}}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{opacity: 0, scale: 0.9, transition: {duration: 0.2}}}
                transition={{duration: 0.2}}
                className="bg-nexus800 rounded-lg p-8 w-[450px] shadow-xl border relative"
                ref={popupRef}
              >
                <h2 className="bodyText text-nexus200 font-titilliumWeb-bold mb-1">
                  Delete Account?
                </h2>
                <p className="text-gray-400 mb-4 tinyText">
                  This action cannot be undone. Please enter your password twice to confirm.
                </p>

                {/* Password Field */}
                <div className="mb-4 relative">
                  <label
                    htmlFor="delete_password"
                    className="block text-left text-nexus100 mb-2 font-semibold"
                  >
                    Password
                  </label>
                  <input
                    id="delete_password"
                    type={deletePwVisible ? "text" : "password"}
                    placeholder="Enter password"
                    className="w-full bg-nexus900 text-white px-4 py-2 border border-nexus800 rounded-md focus:outline-none placeholder-gray-400 pr-10"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={actionBusy}
                  />
                  <button
                    type="button"
                    onClick={() => setDeletePwVisible((v) => !v)}
                    className="absolute top-13 right-4 -translate-y-1/2 text-nexus300 cursor-pointer"
                    aria-label={deletePwVisible ? "Hide password" : "Show password"}
                    disabled={actionBusy}
                  >
                    {deletePwVisible ? <IoMdEye /> : <IoMdEyeOff />}
                  </button>
                </div>

                {/* Confirm Password Field */}
                <div className="mb-6 relative">
                  <label
                    htmlFor="delete_password2"
                    className="block text-left text-nexus100 mb-2 font-semibold"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="delete_password2"
                    type={deletePw2Visible ? "text" : "password"}
                    placeholder="Confirm password"
                    className="w-full bg-nexus900 text-white px-4 py-2 border border-nexus800 rounded-md focus:outline-none placeholder-gray-400 pr-10"
                    value={deletePassword2}
                    onChange={(e) => setDeletePassword2(e.target.value)}
                    autoComplete="current-password"
                    disabled={actionBusy}
                  />
                  <button
                    type="button"
                    onClick={() => setDeletePw2Visible((v) => !v)}
                    className="absolute top-13 right-4 -translate-y-1/2 text-nexus300 cursor-pointer"
                    aria-label={deletePw2Visible ? "Hide confirm password" : "Show confirm password"}
                    disabled={actionBusy}
                  >
                    {deletePw2Visible ? <IoMdEye /> : <IoMdEyeOff />}
                  </button>
                </div>

                {deleteError && (
                  <div className="mb-4 text-red-400 text-sm">{deleteError}</div>
                )}

                <div className="flex gap-3">
                  <HiX onClick={() => {
                        setShowDeleteModal(false);
                        setDeletePassword('');
                        setDeletePassword2('');
                        setDeleteError('');
                        setDeletePwVisible(false);
                        setDeletePw2Visible(false);
                      }}
                      className='text-white absolute right-8 top-9 cursor-pointer hover:text-gray-400 transition duration-300' size={25}
                  />

                  <Button className={'bg-red-500'} onClick={handleDeleteAccount} disabled={actionBusy} text={actionBusy ? "Deleting..." : "Delete Account"}/>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Pidgy */}
        {!isMobile && (
          <motion.div className='absolute top-0 right-10'
                      initial={{y:-350, opacity: 0}}
                      animate={{y:0, opacity: 1}}
                      transition={{duration:1, type:'spring', delay: 0.2}}
            >
            <motion.img className="flex h-[500px]" src='/assets/SettingsAssets/SettingsPidgy.svg'
                        animate={{rotate:-12}}
                        transition={{repeat: Infinity, repeatType: "reverse", duration: 4, ease: "easeInOut"}}/>
          </motion.div>
        )}
      </div>
    </>
  );
}

export default Settings;
