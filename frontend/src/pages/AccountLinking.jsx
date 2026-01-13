import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button';
import { useMobile } from '../context/mobileContext';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  unlink,
  GoogleAuthProvider,
  linkWithPopup
} from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_ORIGIN = (() => {
  try { return new URL(API_BASE).origin; } catch { return 'http://localhost:3000'; }
})();

const AccountLinking = () => {
    const navigate = useNavigate();
    const {isMobile} = useMobile();

    // Firebase / user state
    const [user, setUser] = useState(null);
    const dbRef = useRef(null);

    // provider/linking state
    const [googleLinked, setGoogleLinked] = useState(false);
    const [discordLinked, setDiscordLinked] = useState(false);
    const [discordUsername, setDiscordUsername] = useState(null);

    // UI state
    const [actionBusy, setActionBusy] = useState(false);
    const [error, setError] = useState('');
    const [okMsg, setOkMsg] = useState('');

    // Discord popup orchestration
    const popupRef = useRef(null);
    const handledRef = useRef(false);
    const linkingRef = useRef(false);
    const watchdogRef = useRef(null);

    useEffect(() => {
      let unsub = () => {};
      (async () => {
        try {
          let app;
          if (getApps().length) {
            app = getApp();
          } else {
            const res = await fetch(`${API_BASE}/api/firebase-config`);
            if (!res.ok) throw new Error(`Config fetch failed: ${res.status} ${res.statusText}`);
            const cfg = await res.json();
            app = initializeApp(cfg);
          }

          const a = getAuth(app);
          const db = getFirestore(app);
          dbRef.current = db;

          unsub = onAuthStateChanged(a, async (u) => {
            setUser(u || null);
            if (u) {
              const providers = (u.providerData || []).map(p => p.providerId);
              setGoogleLinked(providers.includes('google.com'));
              await refreshUserFirestore(u.uid);
            } else {
              setGoogleLinked(false);
              setDiscordLinked(false);
              setDiscordUsername(null);
            }
          });
        } catch (e) {
          console.error('Firebase init error:', e);
        }
      })();
      return () => { unsub && unsub(); };
    }, []);

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

        try { popupRef.current?.close?.(); } catch {}
        if (watchdogRef.current) {
          clearInterval(watchdogRef.current);
          watchdogRef.current = null;
        }

        if (msg.type === 'DISCORD_AUTH_SUCCESS') {
          setOkMsg('Discord linked successfully.');
          setError('');
          linkingRef.current = false;

          if (user?.uid) await refreshUserFirestore(user.uid);
        } else {
          alert(msg.error || 'Discord link failed.');
          setOkMsg('');
          linkingRef.current = false;
        }
        setActionBusy(false);
      };

      window.addEventListener('message', onMessage);
      return () => { window.removeEventListener('message', onMessage); };
    }, [user]);

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
          await unlink(user, 'google.com');
          setGoogleLinked(false);
          setOkMsg('Google account unlinked.');
        } else {
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
        window.location.href = url;
        return;
      }

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
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/api/discord/unlink`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
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

    const handleDiscordAction = () => {
      if (discordLinked) {
        handleDiscordUnlink();
      } else {
        startDiscordLink();
      }
    };

    const linkedCount = (googleLinked ? 1 : 0) + (discordLinked ? 1 : 0);
    const canContinue = linkedCount === 2;

    const OptionBox = ({ icon, title, description, details, buttonText, onClick }) => (
        <div className="relative">
            <div className={`absolute inset-0 rounded-lg bg-gray-400 shadow-md`}
                 style={{ transform: 'translate(6px, 6px)', zIndex: 0 }}
            />
            
            <div
                className="flex flex-col min-h-[265px] items-start bg-white rounded-lg p-6 border border-gray-200 
                        transition duration-300 ease-in-out relative z-10 
                        font-titilliumWeb"
                style={{ height: '100%', width: '100%' }} 
            >
                <div className="mb-4 self-start">{icon}</div> 
                <h3 className="font-bold bodyText text-gray-800 mb-2 text-left w-full">{title}</h3> 
                <p className="text-nexus900 text-left tinyText mb-2 flex-1 w-full"> 
                {description}
                </p>
                <ul className="list-disc list-inside tinyText text-left text-nexus900 w-full mb-6 pl-4">
                {details.map((detail, index) => (
                    <li key={index} className="mb-1">{detail}</li>
                ))}
                </ul>
                <Button text={buttonText} onClick={onClick} />
            </div>
        </div>
    );

    return (
        <div className='min-h-screen w-full bg-center bg-cover bg-nexus900 pt-20 ' 
            style={{backgroundImage: "url('/assets/AccessRequestBG.svg')"}}>

            <div className='flex flex-col w-full h-full items-center justify-center scale-90'>
                <h1 className='headingText text-white font-titilliumWeb-bold mb-2'>
                    Account Linking
                </h1>
                <div className='flex flex-col bg-nexus50 p-6 rounded-xl items-center justify-center w-[54%] min-w-[300px]'>
                    <div className='flex flex-col text-center mx-6 mb-4'>
                        <p className="headingText font-titilliumWeb-bold text-nexus900 mb-2">
                            Link Your Google and Discord Accounts:
                        </p>
                        <p className="bodyText font-titilliumWeb-regular text-nexus800 mb-2">
                            To access Nexus main features, linking your Discord and Google account will be needed. If you want to skip it for now, you can link them later in your account settings page.
                        </p>
                    </div>

                    <div className={`flex ${isMobile ? "flex-col" : "flex-row"} gap-8 justify-center items-stretch mb-6`}>
                        <OptionBox
                            icon={
                            <img
                                src="/assets/DiscordIcon.svg"
                                alt="Login"
                                className="w-10 h-10"
                            />
                            }
                            title={discordLinked ? `Unlink Discord${discordUsername ? ` (${discordUsername})` : ''}` : 'Link Discord'}
                            description="LInking your Discord will give you access to your courses in each class Discord server."
                            details={[]}
                            buttonText={discordLinked ? 'Unlink' : 'Click to Login'}
                            onClick={() => handleDiscordAction()}
                        />
                        <OptionBox
                            icon={
                            <img
                                src="/assets/GoogleIcon.svg"
                                alt="Login"
                                className="w-10 h-10"
                            />
                            }
                            title={googleLinked ? 'Unlink Google' : 'Link Google'}
                            description="Linking your Google Account will give you access to make edits to the SuperDoc."
                            details={[]}
                            buttonText={googleLinked ? 'Unlink' : 'Click to Login'}
                            onClick={() => handleGoogleAction()}
                        />
                    </div>

                    {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
                    {okMsg && <div className="text-green-400 text-sm mb-2">{okMsg}</div>}

                    <div className='flex flex-col w-full gap-2'>
                        <Button text={`Continue (${linkedCount}/2)`} onClick={() => navigate('/home')} disabled={!canContinue} />
                        <Button className="bg-gray-500" text={"Skip"} onClick={() => navigate('/home')} />
                        {!canContinue && <div className="text-sm text-gray-500 text-center mt-1">Link both accounts to continue</div>}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AccountLinking