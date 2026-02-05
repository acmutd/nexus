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
  onAuthStateChanged
} from 'firebase/auth';

import {
  getFirestore,
  doc,
  getDoc
} from 'firebase/firestore';

function LandingPage() {
  const {isMobile} = useMobile()

  const isMed = useMediaQuery({ query: '(max-width: 800px)' })
  const navigate = useNavigate();

  // Firebase handles
  const [auth, setAuth] = useState(null);
  const dbRef = useRef(null);

  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState('');

  const [user, setUser] = useState(null);
  const popupRef = useRef(null);
  const [popupVisible, setPopupVisible] = useState(false);

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

  // Entry popup animation
  useEffect(() => {
    setPopupVisible(false);
    const t = setTimeout(() => {
      if (popupRef.current) popupRef.current.offsetHeight;
      setPopupVisible(true);
    }, 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-blue-950 bg-no-repeat bg-cover bg-center pb-15"
      style={{backgroundImage: "url('/assets/LandingPageBG.svg')"}}
    >
      <div
        ref={popupRef}
        className={`flex flex-col items-center justify-center min-h-full pt-30 transition-all duration-500 transform ${popupVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        {/* --------------------------------- HEADER --------------------------------- */}
        <h1 className={`flex font-titilliumWeb-bold text-white titleText text-center`}>
          <Typewriter options={{strings: "Welcome To Nexus!", autoStart: true, cursor: "_", delay: 50}}>
          </Typewriter>
        </h1>
        <h2
          className={`flex ${isMobile ? 'w-[80%]' : 'w-1/2'} bodyText font-titilliumWeb-regular text-white text-center pt-4`}>
          Your hub for connecting with classmates, enhancing collaboration, and planning for success.
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
                Determine the impact of your upcoming test or quiz to stay on top of your grades with Grade Calculator.
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
        <div className="min-w-[300px] w-[53%] bg-gradient-to-b from-nexus50 to-nexus200 rounded-xl flex flex-row mt-20 relative items-center justify-center">
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
            Effortlessly connect with your peers through automated Discord servers, filtered for each one of your classes.
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
              Upload and combine your notes with your classmates through SuperDoc, the ultimate cramming tool and study guide.
            </h2>
          </div>
          {!isMobile && <motion.ul whileHover={{rotate: 12, scale: 1.1}} 
                    transition={{type: "spring", visualDuration: .25, bounce: .2}}
                    className="w-full">
            <img src="/assets/Book.svg"/>
          </motion.ul>}
        </div>
      </div>
      <a
      href="https://docs.google.com/forms/d/e/1FAIpQLSfA5sNwJUlHn3QroikwHuDGhOve6qjb7ssMjkvLd-RGK_PLaQ/viewform"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 group"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="relative bg-nexus800 text-white px-5 py-3 rounded-full shadow-lg
                  flex items-center gap-2 cursor-pointer
                  hover:scale-105 hover:bg-nexus700 transition"
      >
        <span className="tinyText font-titilliumWeb-semibold whitespace-nowrap">
          Fill out feedback form
        </span>

        {/*hover tip*/}
        <span
          className="absolute bottom-full right-0 mb-3 w-72 p-3 rounded-lg
                    bg-nexus900 text-white text-xs leading-snug
                    opacity-0 translate-y-2 pointer-events-none
                    transition-all duration-300
                    group-hover:opacity-100 group-hover:translate-y-0"
        >
          Run into any issues, potential improvements, or want to tell us what you like about Nexus,
          let us know by filling out this form.
          <br />
          <br />
          We appreciate any and all input :)
        </span>
      </motion.div>
    </a>

    </div>
  )
}

export default LandingPage;
