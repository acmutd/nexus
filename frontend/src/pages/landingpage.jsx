import React, {useEffect, useState, useRef} from 'react'
import { HiArrowNarrowRight } from 'react-icons/hi';
import { useMediaQuery } from 'react-responsive';
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence} from 'framer-motion';
import Typewriter from "typewriter-effect"
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

function LandingPage() {
  const isMed = useMediaQuery({ query: '(max-width: 800px)' })
  const navigate = useNavigate();

  // Firebase handles
  const [auth, setAuth] = useState(null);
  const dbRef = useRef(null);

  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState('');

  const [user, setUser] = useState(null);

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

  useEffect(() => {
    if(user) {
      navigate("/home")
    } 
  }, [user])

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-blue-950 bg-no-repeat bg-cover bg-center pb-15"
      style={isMed ? { backgroundImage: "url('/assets/LandingPageLongBG.svg')" } : {backgroundImage: "url('/assets/LandingPageBG.svg')"}}
    >
      <div className="flex flex-col items-center justify-center min-h-full pt-30">
        {/* --------------------------------- HEADER --------------------------------- */}
        <h1 className="font-titilliumWeb-bold text-white text-5xl">
          <Typewriter options={{strings: "Welcome To Nexus!", autoStart: true, cursor: "_", delay: 50}}>
          </Typewriter>
        </h1>
        <h2
          className="w-1/2 font-titilliumWeb-regular text-white text-2xl text-center pt-4"
          style={{ width: isMed ? 524 : 824 }}>
          The best place for connecting with classmates, enhancing collaboration, and boosting academic success.
        </h2>
        <Link to="/signup" className="text-white bg-nexus500 py-3 px-14 text-xl font-titilliumWeb-bold rounded-lg mt-8 flex flex-row 
                            transition duration-300 hover:scale-105 drop-shadow-black">
          Get Started
          <HiArrowNarrowRight className="pt-0.5" size={25} />
        </Link>
        {/* --------------------------------- CALCULATOR BOX --------------------------------- */}
        <div className="w-3/5 bg-gradient-to-b from-nexus50 to-nexus200 rounded-xl flex flex-row"
          style={{ width: isMed ? 575 : 775, scale: isMed ? .8 : 1, marginTop: isMed ? 8 : 48 }}>
          <img src="/assets/Person.svg" className="h-[250px] w-[225px] absolute -right-16 -top-32" />
          <div className="flex flex-row">
            <div className="pt-12 pl-12 pb-12">
              <h1 className="text-nexus700 font-titilliumWeb-bold text-4xl">
                Smart Learning
              </h1>
              <h2 className="text-nexus900 font-titilliumWeb-regular text-2xl overflow-wrap">
                Stay on top of your grades and assignments and see the impact of a quiz or exam on your grade using the grade calculator.
              </h2>
            </div>
            <motion.ul whileHover={{rotate: 12, scale: 1.1}} 
                      transition={{type: "spring", visualDuration: .25, bounce: .2}}
                      className="w-full">
              <img src="/assets/Calculator.svg" />
            </motion.ul>
          </div>
        </div>
        {/* --------------------------------- MEGAPHONE BOX --------------------------------- */}
        <div className="w-3/5 bg-gradient-to-b from-nexus50 to-nexus200 rounded-xl flex flex-row"
          style={{ width: isMed ? 575 : 775, scale: isMed ? .8 : 1, marginTop: isMed ? 0 : 48 }}>
          <motion.ul whileHover={{rotate: -12, scale: 1.1}} 
                    transition={{type: "spring", visualDuration: .25, bounce: .2}}
                    className="w-full">
            <img src="/assets/Megaphone.svg"/>
          </motion.ul>
          <div className="pt-12 pr-12 pb-12">
            <h1 className="text-nexus700 font-titilliumWeb-bold text-4xl">
              Collaborative Environment
            </h1>
            <h2 className="text-nexus900 font-titilliumWeb-regular text-2xl overflow-wrap">
              Connect with peers and share knowledge effortlessly with our automated Discord server filtering for all your classes.
            </h2>
          </div>
        </div>
        {/* --------------------------------- NOTES BOX --------------------------------- */}
        <div className="w-3/5 bg-gradient-to-b from-nexus50 to-nexus200 rounded-xl flex flex-row"
          style={{ width: isMed ? 575 : 775, scale: isMed ? .8 : 1, marginTop: isMed ? 0 : 48 }}>
          <div className="pt-12 pl-12 pb-12">
            <h1 className="text-nexus700 font-titilliumWeb-bold text-4xl">
              Resource Sharing
            </h1>
            <h2 className="text-nexus900 font-titilliumWeb-regular text-2xl overflow-wrap">
              Missed a lecture? Cramming for an exam? No problem! Access and contribute to study materials alongside your classmates using Nexus’ Superdoc!
            </h2>
          </div>
          <motion.ul whileHover={{rotate: 12, scale: 1.1}} 
                    transition={{type: "spring", visualDuration: .25, bounce: .2}}
                    className="w-full">
            <img src="/assets/Book.svg"/>
          </motion.ul>
        </div>
      </div>
    </div>
  )
}

export default LandingPage;
