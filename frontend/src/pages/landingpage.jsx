import React, {useEffect, useState, useRef} from 'react'
import { HiArrowNarrowRight, HiCalculator, HiUserGroup, HiDocumentText } from 'react-icons/hi';
import { useMediaQuery } from 'react-responsive';
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence} from 'framer-motion';
import Typewriter from "typewriter-effect"
import { useMobile } from '../context/mobileContext';
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
  const {isMobile} = useMobile()
  const {isSmallMobile} = useMobile()

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
      style={{backgroundImage: "url('/assets/LandingPageBG.svg')"}}
    >
      <div className="flex flex-col items-center justify-center min-h-full pt-30">
        {/* --------------------------------- HEADER --------------------------------- */}
        <h1 className={`flex font-titilliumWeb-bold text-white titleText text-center`}>
          <Typewriter options={{strings: "Welcome To Nexus!", autoStart: true, cursor: "_", delay: 50}}>
          </Typewriter>
        </h1>
        <h2
          className={`flex ${isMobile ? 'w-[80%]' : 'w-1/2'} bodyText font-titilliumWeb-regular text-white text-center pt-4`}>
          The best place for connecting with classmates, enhancing collaboration, and boosting academic success.
        </h2>
        <Link to="/signup" className="text-white bg-nexus500 py-3 px-14 text-xl font-titilliumWeb-bold rounded-lg mt-8 flex flex-row 
                            transition duration-300 hover:scale-105 drop-shadow-black">
          Get Started
          <HiArrowNarrowRight className="pt-0.5" size={25} />
        </Link>
        {/* --------------------------------- CALCULATOR BOX --------------------------------- */}
        <div className="min-w-[300px] w-[53%] bg-gradient-to-b from-nexus50 to-nexus200 rounded-xl flex flex-row mt-15 relative">
          {!isMobile && <img src="/assets/Person.svg" className="h-[250px] w-[225px] absolute -right-16 -top-32"/>}
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} items-center`}>
            <div className={`flex flex-col m-10 gap-2 ${isMobile && 'items-center justify-center text-center'}`}>
              {isMobile && <HiCalculator size={34} color='#003D99'/>}
              <h1 className="text-nexus700 font-titilliumWeb-bold headingText text-centerflex flex flex-row">
                Smart Learning
              </h1>
              <h2 className="text-nexus900 font-titilliumWeb-regular bodyText overflow-wrap">
                Stay on top of your grades and assignments and see the impact of a quiz or exam on your grade using the grade calculator.
              </h2>
            </div>
            {!isMobile && <motion.ul whileHover={{rotate: 12, scale: 1.1}} 
                      transition={{type: "spring", visualDuration: .25, bounce: .2}}
                      className="w-full">
              <img src="/assets/Calculator.svg" />
            </motion.ul>}
          </div>
        </div>
        {/* --------------------------------- MEGAPHONE BOX --------------------------------- */}
        <div className="min-w-[300px] w-[53%] bg-gradient-to-b from-nexus50 to-nexus200 rounded-xl flex flex-row mt-20 relative">
          {!isMobile && <motion.ul whileHover={{rotate: -12, scale: 1.1}} 
                    transition={{type: "spring", visualDuration: .25, bounce: .2}}
                    className="w-full">
            <img src="/assets/Megaphone.svg"/>
          </motion.ul>}
          <div className={`flex flex-col m-10 gap-2 ${isMobile && 'items-center justify-center text-center'}`}>
            {isMobile && <HiUserGroup size={34} color='#003D99'/>}
            <h1 className="text-nexus700 font-titilliumWeb-bold headingText text-centerflex flex flex-row">
              Collaborative Environment
            </h1>
            <h2 className="text-nexus900 font-titilliumWeb-regular bodyText overflow-wrap">
              Connect with peers and share knowledge effortlessly with our automated Discord server filtering for all your classes.
            </h2>
          </div>
        </div>
        {/* --------------------------------- NOTES BOX --------------------------------- */}
        <div className="min-w-[300px] w-[53%] bg-gradient-to-b from-nexus50 to-nexus200 rounded-xl flex flex-row mt-20 relative items-center justify-center">
          <div className={`flex flex-col m-10 gap-2 ${isMobile && 'items-center justify-center text-center'}`}>
            {isMobile && <HiDocumentText size={34} color='#003D99'/>}
            <h1 className="text-nexus700 font-titilliumWeb-bold headingText text-centerflex flex flex-row">
              Resource Sharing
            </h1>
            <h2 className="text-nexus900 font-titilliumWeb-regular bodyText overflow-wrap">
              Missed a lecture? Cramming for an exam? No problem! Access and contribute to study materials alongside your classmates using Nexus’ Superdoc!
            </h2>
          </div>
          {!isMobile && <motion.ul whileHover={{rotate: 12, scale: 1.1}} 
                    transition={{type: "spring", visualDuration: .25, bounce: .2}}
                    className="w-full">
            <img src="/assets/Book.svg"/>
          </motion.ul>}
        </div>
      </div>
    </div>
  )
}

export default LandingPage;
