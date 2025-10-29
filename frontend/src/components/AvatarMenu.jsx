import { useEffect, useMemo, useRef, useState } from 'react';
import { getApp } from 'firebase/app';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { HiX } from 'react-icons/hi';

export default function AvatarMenu({
  settingsOnClick,
  redirectOnLogout = '/login',
  buttonTone = 'light',
}) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Auth + live Firestore user doc (auto-updates after linking)
  useEffect(() => {
    const app = getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    let unsubDoc = null;
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setProfile(null);
      if (unsubDoc) { unsubDoc(); unsubDoc = null; }

      if (u) {
        const ref = doc(db, 'users', u.uid);
        unsubDoc = onSnapshot(ref, (snap) => {
          setProfile(snap.exists() ? snap.data() : null);
        });
      }
    });

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  // Discord-only avatar (no Google fallback)
  const avatarUrl = useMemo(() => {
    const d = profile?.discord;
    return d?.avatarUrl || d?.avatarURL || null;
  }, [profile]);

  // Close on outside click / ESC
  useEffect(() => {
    const onClick = (e) => { if (open && menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleLogout() {
    try {
      await signOut(getAuth(getApp()));
      if (redirectOnLogout) window.location.assign(redirectOnLogout);
    } catch (e) {
      console.error('Logout failed:', e);
      if (redirectOnLogout) window.location.assign(redirectOnLogout);
    }
  }

  const loginClasses =
    buttonTone === 'light'
      ? 'inline-flex items-center rounded-xl px-3 py-2 text-sm font-bold bg-white text-nexus-blue-900 border hover:bg-gray-100 transition'
      : 'inline-flex items-center rounded-xl px-3 py-2 text-sm font-bold bg-blue-900 text-white border border-nexus-blue-900 hover:bg-nexus-blue-100 hover:text-nexus-blue-900 transition';

  if (!user) {
    return (
      <a href="/login" className={loginClasses} aria-label="Login">
        Login
      </a>
    );
  }

  const ringTone =
    buttonTone === 'light'
      ? 'ring-white/20 hover:ring-white/40 bg-white'
      : 'ring-black/10 hover:ring-black/20 bg-white';

  return (
    <div className="relative" ref={menuRef} style={{fontFamily: 'titilliumWeb-semibold'}}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`h-10 w-10 rounded-full overflow-hidden flex items-center justify-center ${ringTone} ring-1`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Discord avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer"/>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-nexus100" style={{cursor: 'pointer'}}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-60" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.761 0 5-2.69 5-6s-2.239-6-5-6-5 2.69-5 6 2.239 6 5 6zm0 2c-4.418 0-8 2.91-8 6.5V23h16v-2.5C20 16.91 16.418 14 12 14z"/>
            </svg>
          </div>
        )}
      </button>

      { /* ----------------------------- DROP-DOWN ------------------------------------ */}
      <AnimatePresence>
        {open ? (
          <motion.div initial={{opacity: 0, scaleY: 0}} animate={{opacity: 1, scaleY:1}} exit={{opacity: 0, scaleY: 0}} transition={{duration: 0.55, type: "spring"}}>
            <div role="menu" aria-label="User menu" className="px-4 right-0 absolute mt-2 w-auto rounded-md border text-white border-black/10 bg-nexus800 shadow-lg p-1">
            <div className="pt-2 justify-end flex w-full" onClick={() => {setOpen(false)}} style={{cursor: 'pointer'}}>
              <HiX size={25} opacity={.7} />
            </div> 
            { /* ----------------------------- AVATAR + EMAIL ------------------------------------ */}
            <div className="flex justify-center items-center py-4 border-b-2 border-nexus700 flex-col">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Discord avatar" className="rounded-full h-full w-full object-cover" referrerPolicy="no-referrer"/>
                ) : (
                <div className="border-4 border-nexus400 rounded-full h-20 w-20 flex items-center justify-center bg-nexus100" style={{cursor: 'pointer'}}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-60" viewBox="0 0 24 24" fill="black">
                    <path d="M12 12c2.761 0 5-2.69 5-6s-2.239-6-5-6-5 2.69-5 6 2.239 6 5 6zm0 2c-4.418 0-8 2.91-8 6.5V23h16v-2.5C20 16.91 16.418 14 12 14z"/>
                  </svg>
                </div>
                )}
                <div className="pt-4 px-2">
                  {user.email}
                </div>
            </div>

            {/* ----------------------------- SETTINGS + LOGOUT ------------------------------------ */}
            <Link to="/settings">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full text-left mt-2 px-2 py-2 text-sm hover:bg-nexus700"
                role="menuitem"
              >
                Settings
              </button>
            </Link>

            <div className="my-1 h-px bg-black/10" />

            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left mb-2 px-2 py-2 text-sm hover:bg-nexus700"
              role="menuitem"
              style={{cursor: 'pointer'}}
            >
              Logout
            </button>

            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
