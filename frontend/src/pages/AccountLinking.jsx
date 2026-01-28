import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Button from '../components/Button';
import { useMobile } from '../context/mobileContext';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { useAuth } from '../context/authContext';
import {
  getAuth,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const AccountLinking = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {isMobile} = useMobile();

    // Firebase / user state
    const [user, setUser] = useState(null);
    const dbRef = useRef(null);

    // provider/linking state
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
    const [popupVisible, setPopupVisible] = useState(false);

    const { refreshOnboarding, onboarding } = useAuth();

    useEffect(() => {
      let unsub = () => {};
      (async () => {
        try {
          let app;
          if (getApps().length) {
            app = getApp();
          } else {
            const res = await fetch(`/api/firebase-config`);
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
              await refreshUserFirestore(u.uid);
            } else {
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

    // Entry animation like login/signup
    useEffect(() => {
      setPopupVisible(false);
      const t = setTimeout(() => {
        if (popupRef.current) popupRef.current.offsetHeight;
        setPopupVisible(true);
      }, 60);
      return () => clearTimeout(t);
    }, [location.pathname, location.key]);

    // Listen for Discord popup postMessage (SUCCESS / ERROR)
    useEffect(() => {
      const onMessage = async (ev) => {
        if (popupRef.current && ev.source !== popupRef.current) return;
        const msg = ev.data || {};
        if (msg.type !== 'DISCORD_AUTH_SUCCESS' && msg.type !== 'DISCORD_AUTH_ERROR') return;
        if (handledRef.current) {
          return;
        }
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

      if (linkingRef.current) return;
      linkingRef.current = true;
      handledRef.current = false;
      setActionBusy(true);

      const w = 520, h = 700;
      const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
      const top  = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
      const features = `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`;

      const url = `/api/discord/auth?uid=${encodeURIComponent(user.uid)}`;

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

      try {
        setActionBusy(true);
        const token = await user.getIdToken();
        const res = await fetch(`/api/discord/unlink`, {
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

    const skipAccountLinking = async () => {
      if (!user) {
        navigate('/home');
        return;
      }

      try {
        setActionBusy(true);
        const db = dbRef.current || getFirestore();
        await setDoc(
          doc(db, 'users', user.uid),
          {
            accountLinkingSkipped: true,
            accountLinkingSkippedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        await refreshOnboarding(user);
      } catch (e) {
        console.error('Failed to mark account linking as skipped:', e);
      } finally {
        setActionBusy(false);
        navigate('/home');
      }
    };

    const linkedCount = discordLinked ? 1 : 0;
    const canContinue = linkedCount === 1;

    // Auto-continue once Discord is linked
    useEffect(() => {
      const goHome = async () => {
        try {
          const res = await refreshOnboarding(user);
          if (res?.discordLinked) navigate('/home');
        } catch (e) {
          console.error('Auto-continue failed:', e);
        }
      };
      if (discordLinked && user) goHome();
    }, [discordLinked, user, navigate, refreshOnboarding]);

    // Hard block access if onboarding already linked or explicitly skipped (e.g., redo flow)
    useEffect(() => {
      if (!onboarding?.loaded) return;
      if (onboarding.discordLinked || onboarding.accountLinkingSkipped) {
        navigate('/home', { replace: true });
      }
    }, [onboarding, navigate]);

    const OptionBox = ({ icon, title, description, details, buttonText, onClick }) => (
        <div className="relative w-full flex">
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
        <div className='min-h-screen w-full bg-center bg-cover bg-nexus900 pt-20 items-center justify-center flex'
            style={{backgroundImage: "url('/assets/AccessRequestBG.svg')"}}>

            <div
              ref={popupRef}
              className={`flex flex-col w-full h-full items-center justify-center scale-90 transition-all duration-500 transform ${popupVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
                <h1 className='headingText text-white font-titilliumWeb-bold mb-2'>
                    Account Linking
                </h1>
                <div className='flex flex-col bg-nexus50 p-6 rounded-xl items-center justify-center w-[clamp(300px,50rem,1000px)]'>
                    <div className='flex flex-col text-center mx-6 mb-4'>
                        <p className="headingText font-titilliumWeb-bold text-nexus900 mb-2">
                            Link Your Discord Account:
                        </p>
                        <p className="bodyText font-titilliumWeb-regular text-nexus800 mb-2">
                            To access Nexus main features, linking your Discord account will be needed. If you want to skip it for now, you can link it later in your account settings page.
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
                    </div>

                    {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
                    {okMsg && <div className="text-green-400 text-sm mb-2">{okMsg}</div>}

                    <div className='flex flex-col w-full gap-2'>
                        <Button className="bg-gray-500" text={"Skip"} onClick={skipAccountLinking} />
                      
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AccountLinking
