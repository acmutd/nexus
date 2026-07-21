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
import FloatingClouds from '../components/FloatingClouds';
import { motion } from 'motion/react';
import StarFieldOverlay from '../components/StarFieldOverlay';

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
    const discordPopupRef = useRef(null);
    const handledRef = useRef(false);
    const linkingRef = useRef(false);
    const watchdogRef = useRef(null);
    const [popupVisible, setPopupVisible] = useState(false);

    const { refreshOnboarding, onboarding } = useAuth();

    // Check if user is in pre-Firestore onboarding flow
    const [isPreFirestoreOnboarding, setIsPreFirestoreOnboarding] = useState(false);

    useEffect(() => {
      const pendingOnboarding = sessionStorage.getItem('pendingOnboarding');
      setIsPreFirestoreOnboarding(!!pendingOnboarding);
    }, []);

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
            if (u && !isPreFirestoreOnboarding) {
              await refreshUserFirestore(u.uid);
            } else if (u && isPreFirestoreOnboarding) {
              // In pre-Firestore flow, don't try to read from Firestore yet
              setDiscordLinked(false);
              setDiscordUsername(null);
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
    }, [isPreFirestoreOnboarding]);

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
        if (discordPopupRef.current && ev.source !== discordPopupRef.current) return;
        const msg = ev.data || {};
        if (msg.type !== 'DISCORD_AUTH_SUCCESS' && msg.type !== 'DISCORD_AUTH_ERROR') return;
        if (handledRef.current) {
          return;
        }
        handledRef.current = true;

        try { discordPopupRef.current?.close?.(); } catch {}
        if (watchdogRef.current) {
          clearInterval(watchdogRef.current);
          watchdogRef.current = null;
        }

        if (msg.type === 'DISCORD_AUTH_ERROR') {
          setError(msg.error || 'Discord linking failed');
          setOkMsg('');
          linkingRef.current = false;
          setActionBusy(false);
          return;
        }

        try {
          if (isPreFirestoreOnboarding) {
            // Store Discord info in sessionStorage
            const pendingOnboarding = JSON.parse(sessionStorage.getItem('pendingOnboarding'));
            pendingOnboarding.discord = {
              id: msg.discordId,
              username: msg.discordUsername,
              discriminator: msg.discordDiscriminator || '0',
              avatar: msg.discordAvatar
            };
            sessionStorage.setItem('pendingOnboarding', JSON.stringify(pendingOnboarding));
            
            setDiscordLinked(true);
            setDiscordUsername(msg.discordUsername);
            setOkMsg('Discord linked successfully!');
            setError('');
            
            await completeOnboarding(pendingOnboarding);
          } else {
            await refreshUserFirestore(user?.uid);
            setOkMsg('Discord linked successfully!');
            setError('');
          }
        } catch (e) {
          console.error('postMessage handler error:', e);
          setError((e?.message || 'Failed to link Discord').replace('Firebase: ', ''));
        } finally {
          linkingRef.current = false;
          setActionBusy(false);
        }
      };

      window.addEventListener('message', onMessage);
      return () => { window.removeEventListener('message', onMessage); };
    }, [user, isPreFirestoreOnboarding]);

    // Complete onboarding by creating Firestore document with all data
    const completeOnboarding = async (onboardingData) => {
      try {
        console.log('[AccountLinking] Completing onboarding, creating Firestore document');
        const db = dbRef.current || getFirestore();
        
        await setDoc(doc(db, 'users', onboardingData.uid), {
          uid: onboardingData.uid,
          email: onboardingData.email,
          emailVerified: true,
          courses: onboardingData.courses || [],
          discord: onboardingData.discord || null,
          servers: [],
          createdAt: onboardingData.createdAt,
          onboardingCompletedAt: new Date().toISOString(),
          accountLinkingSkipped: onboardingData.accountLinkingSkipped || false,
        });

        // Clear sessionStorage
        sessionStorage.removeItem('pendingOnboarding');
        
        // Refresh onboarding state
        await refreshOnboarding(user);
        
        // Navigate to home
        setTimeout(() => {
          navigate('/home');
        }, 500);
      } catch (error) {
        console.error('Failed to complete onboarding:', error);
        setError('Failed to complete setup. Please try again.');
        throw error;
      }
    };

    const refreshUserFirestore = async (uid) => {
      if (!uid) return false;
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
      discordPopupRef.current = popup;

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
          }, 150);
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
        
        if (isPreFirestoreOnboarding) {
          // Complete onboarding without Discord
          const pendingOnboarding = JSON.parse(sessionStorage.getItem('pendingOnboarding'));
          pendingOnboarding.accountLinkingSkipped = true;
          await completeOnboarding(pendingOnboarding);
        } else {
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
          navigate('/home');
        }
      } catch (e) {
        console.error('Failed to skip account linking:', e);
        setError('Failed to skip. Please try again.');
      } finally {
        setActionBusy(false);
      }
    };

    const linkedCount = discordLinked ? 1 : 0;
    const canContinue = linkedCount === 1;

    // Auto-continue once Discord is linked (only for non-pre-Firestore flow)
    useEffect(() => {
      const goHome = async () => {
        try {
          const res = await refreshOnboarding(user);
          if (res?.discordLinked) navigate('/home');
        } catch (e) {
          console.error('Auto-continue failed:', e);
        }
      };
      if (discordLinked && user && !isPreFirestoreOnboarding) goHome();
    }, [discordLinked, user, navigate, refreshOnboarding, isPreFirestoreOnboarding]);

    // Hard block access if onboarding already linked or explicitly skipped (only for non-pre-Firestore flow)
    useEffect(() => {
      if (isPreFirestoreOnboarding) return; // Allow access during initial onboarding
      if (!onboarding?.loaded) return;
      if (onboarding.discordLinked || onboarding.accountLinkingSkipped) {
        navigate('/home', { replace: true });
      }
    }, [onboarding, navigate, isPreFirestoreOnboarding]);

    const OptionBox = ({ icon, title, description, details, buttonText, onClick, boxWidth }) => (
        <div className="relative w-full flex" style={{ maxWidth: boxWidth || '100%' }}>
            <div className={`absolute inset-0 rounded-lg bg-gray-400 shadow-md`}
                 style={{ transform: 'translate(6px, 6px)', zIndex: 0 }}
            />

            <div
                className="flex flex-col min-h-[265px] md:min-h-[265px] items-start bg-white rounded-lg p-6 border border-gray-200 
             transition duration-300 ease-in-out relative z-10 font-titilliumWeb"
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

  const floatVariants = {
    float: (custom) => ({
      y: [0, custom.y, 0],
      x: [0, custom.x, 0],
      rotate: [custom.startRotate, custom.endRotate, custom.startRotate],
      transition: {
          duration: custom.duration,
          repeat: Infinity,
          ease: "easeInOut",
      }
    })
  };

  const objects = [
    {
        name: 'calculator',
        path: '/assets/Calculator.svg',
        style: {
            position: 'fixed',
            top: '16%',
            right: '5%',
            width: '20%',
        },
        custom: { x: 5, y: 6, startRotate: 0, endRotate: 6, duration: 5.5 }
    },
    {
        name: 'book',
        path: '/assets/Book.svg',
        style: {
            position: 'fixed',
            bottom: '3%',
            right: '2%',
            width: '18%',
        },
        custom: { x: -5, y: -6, startRotate: 0, endRotate: -6, duration: 5.5 }
    },
    {
        name: 'peechi',
        path: '/assets/LoginPipelineAssets/LoginPipelinePeechi.svg',
        style: {
            position: 'fixed',
            bottom: '8%',
            left: '5%',
            width: '12%',
        },
        custom: { x: 8, y: -5, startRotate: 0, endRotate: 3, duration: 5.5 }
    },
    {
        name: 'microphone',
        path: '/assets//Megaphone.svg',
        style: {
            position: 'fixed',
            top: '20%',
            left: '5%',
            width: '18%',
        },
        custom: { x: -5, y: -6, startRotate: 0, endRotate: -6, duration: 5.5 }
    },
  ]

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center bg-blue-950 bg-cover bg-center pt-16 pb-6 justify-center"
      style={{
        backgroundImage: "url('/assets/BasicBG.svg')"
      }}
    >
    <StarFieldOverlay count={isMobile ? 120 : 220} allowDepthBlur />
    {/* FLOATING ICONS */}
    <div className='fixed overflow-hidden w-full h-full'>
      <FloatingClouds />
    </div>
    {objects.map((obj) => (
      !isMobile &&
      <motion.div 
        key={obj.name}
        style={obj.style}
        custom={obj.custom}
        variants={floatVariants}
        animate="float"
        className='will-change-transform pointer-events-none'>
          <img src={obj.path} style={{ width: '100%', height: 'auto' }}/>
      </motion.div>
    ))}

        <div
          ref={popupRef}
          className={`flex flex-col w-full h-full items-center justify-center scale-90 transition-all duration-500 transform ${popupVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
            <h1 className='headingText text-white font-titilliumWeb-bold mt-1'>
                Account Linking
            </h1>
            <div
              className='flex flex-col bg-nexus50 p-6 rounded-xl items-center justify-center shadow-2xl'
              style={{
                width: isMobile ? '90%' : '35rem',
                minHeight: isMobile ? 'auto' : '28rem'
              }}
            >
                <div className='flex flex-col text-center mx-6 mb-4 w-full'>
                    <p className="headingText font-titilliumWeb-bold text-nexus900">
                        Link Your Discord Account
                    </p>
                </div>
                <div className={`flex flex-col gap-8 justify-center items-center mb-6 w-full px-2`}>
                    <div className="flex flex-col justify-center text-center max-w-xl  -mt-2 md:mt-0">
                        <p className="bodyText font-titilliumWeb-regular text-nexus800">
                            To access Nexus' main features, you will need to link your Discord account. If you want to skip it for now, you can link it later from the Settings page.
                        </p>
                    </div>
                    <OptionBox
                        icon={
                        <img
                            src="/assets/DiscordIcon.svg"
                            alt="Login"
                            className="w-10 h-10"
                        />
                        }
                        title={discordLinked ? `Unlink Discord${discordUsername ? ` (${discordUsername})` : ''}` : 'Link Discord'}
                        description="Linking your Discord will give you access to your courses in each Discord server."
                        details={[]}
                        buttonText={discordLinked ? 'Unlink' : 'Click to Login'}
                        onClick={() => handleDiscordAction()}
                        boxWidth={isMobile ? '100%' : '22rem'}
                    />
                </div>

                {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
                {okMsg && <div className="text-green-400 text-sm mb-2">{okMsg}</div>}

                <div className="flex w-full justify-end mt-2">
                    <div className="w-full">
                        <Button className="bg-gray-500" text={"Skip"} onClick={skipAccountLinking} />
                    </div>
                </div>
            </div>
        </div>
    </div>
    )
}

export default AccountLinking