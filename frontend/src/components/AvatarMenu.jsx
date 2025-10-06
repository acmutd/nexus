import { useEffect, useMemo, useRef, useState } from 'react';
import { getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

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
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`h-10 w-10 rounded-full overflow-hidden flex items-center justify-center ${ringTone} ring-1`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Discord avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-nexus100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-60" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.761 0 5-2.69 5-6s-2.239-6-5-6-5 2.69-5 6 2.239 6 5 6zm0 2c-4.418 0-8 2.91-8 6.5V23h16v-2.5C20 16.91 16.418 14 12 14z"/>
            </svg>
          </div>
        )}
      </button>

      {open && (
        <div role="menu" aria-label="User menu" className="absolute right-0 mt-2 w-44 rounded-xl border border-black/10 bg-white shadow-lg p-1">
          <button
            type="button"
            onClick={() => { settingsOnClick?.(); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm"
            role="menuitem"
          >
            Settings
          </button>

          <div className="my-1 h-px bg-black/10" />

          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm "
            role="menuitem"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
