import React, {useEffect, useState, useRef} from 'react'
import { HiArrowNarrowRight, HiArrowNarrowUp, HiCalculator, HiUserGroup, HiDocumentText } from 'react-icons/hi';
import { useMediaQuery } from 'react-responsive';
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence} from 'framer-motion';
import Typewriter from 'typewriter-effect'
import { useMobile } from '../context/mobileContext';
import { initializeApp, getApps, getApp } from 'firebase/app';
import StarFieldOverlay from '../components/StarFieldOverlay';
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
  const {isScreenMedium} = useMobile()
  const {isScreenSmall} = useMobile()

  const navigate = useNavigate();

  // Firebase handles
  const [auth, setAuth] = useState(null);
  const dbRef = useRef(null);

const [initLoading, setInitLoading] = useState(true);
const [initError, setInitError] = useState('');

const [user, setUser] = useState(null);
const popupRef = useRef(null);
const [popupVisible, setPopupVisible] = useState(false);
const [showScrollTop, setShowScrollTop] = useState(false);

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

  // Toggle scroll-to-top button near bottom
  useEffect(() => {
    const onScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
      setShowScrollTop(nearBottom);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Section refs for scroll snapping
  const laptopRef = useRef(null);
  const calculatorRef = useRef(null);
  const bookRef = useRef(null);

  // No custom wheel handling; rely on CSS scroll snap for parallax-like paging

  const floatingVariants = {
    float: (custom) => ({
      x: [0, custom.x, 0],
      y: [0, custom.y, 0],
      rotate: [custom.startRotate, custom.endRotate, custom.startRotate],
      transition: {
        duration: custom.duration,
        ease: 'easeInOut',
        repeat: Infinity
      }
    })
  }

  const objects = [
    {
      name: 'books',
      path: '/assets/HomePageAssets/Books.svg',
      style: {
          position: 'absolute',
          top: '2%',
          left: '6%',
          width: '17%',
      },
      custom: { x: -5, y: -6, startRotate: 0, endRotate: -6, duration: 4.5 }
    },
    {
      name: 'chair',
      path: '/assets/HomePageAssets/ChairLP.svg',
      style: {
          position: 'absolute',
          top: '32%',
          left: '3%',
          width: '19%',
      },
      custom: { x: -5, y: -6, startRotate: 0, endRotate: -6, duration: 4.5 }
    },
    {
      name: 'pigy',
      path: '/assets/HomePageAssets/PigyLP.svg',
      style: {
          position: 'absolute',
          top: '56%',
          left: '14%',
          width: '20%',
      },
      custom: { x: -5, y: -6, startRotate: -6, endRotate: 4, duration: 4.5 }
    },
    {
      name: 'coffee',
      path: '/assets/HomePageAssets/Coffee.svg',
      style: {
          position: 'absolute',
          top: '30%',
          right: '3%',
          width: '15%',
      },
      custom: { x: -5, y: -6, startRotate: -6, endRotate: 4, duration: 4.5 }
    },
    {
      name: 'peechi',
      path: '/assets/HomePageAssets/Peechi.svg',
      style: {
          position: 'absolute',
          top: '2%',
          right: '13%',
          width: '12%',
      },
      custom: { x: 5, y: -6, startRotate: 4, endRotate: 0, duration: 5.5 }
    },
    {
      name: 'megaphone',
      path: '/assets/Megaphone.svg',
      style: {
          position: 'absolute',
          top: '62%',
          right: '10%',
          width: '18%',
          scaleX: -1
          
      },
      custom: { x: 5, y: -6, startRotate: 4, endRotate: 0, duration: 5.5 }
    },
  ]

  return (
    <>
    <div
      className="min-h-screen w-full flex justify-center bg-nexus700 bg-linear-to-b from-nexus900 to-nexus700 bg-no-repeat bg-top bg-[length:100%_85vh] overflow-hidden snap-y snap-mandatory overflow-y-auto"
      style={{ scrollPaddingTop: isMobile ? 0 : '120px' }}
    >
      <StarFieldOverlay count={200}/>
      <div
        ref={popupRef}
        className={`mt-40 flex flex-col transition-all duration-500 transform gap-100 ${popupVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        style={{ scrollSnapType: isMobile ? 'none' : 'y mandatory' }}
      >
        {/* --------------------------------- HEADER --------------------------------- */}
        <div
          className={`flex flex-col h-[60vh] justify-center text-center items-center relative scale-110`}
          style={{ scrollSnapAlign: 'none' }}
        >
          <h1 className="relative mb-2 z-10 flex font-titilliumWeb-bold text-white text-center text-[clamp(3.25rem,5.2vw,5.5rem)] leading-[1.05]">
            <Typewriter options={{strings: "Welcome To Nexus!", autoStart: true, cursor: "_", delay: 50}} />
          </h1>
          <h2
            className={`relative z-10 flex font-titilliumWeb-regular text-white text-center text-[clamp(1.75rem,2.4vw,2.6rem)] leading-[1.15] ${isMobile ? 'w-[86%]' : 'w-[62%]'}`}>
            Your hub for connecting with classmates, enhancing collaboration, and planning for success.
          </h2>
          <Link to="/signup" className="relative z-10 bg-white text-nexus-blue-900 py-4 px-16 text-2xl font-titilliumWeb-bold rounded-lg mt-6 flex flex-row items-center gap-2 border border-transparent
                              transition duration-300 hover:scale-105 hover:bg-gray-100 drop-shadow-black">
            Get Started
            <HiArrowNarrowRight className="pt-0.5" size={25} />
          </Link>
                {objects.map((obj) => (
        !isScreenSmall && (
          <motion.div
              key={obj.name}
              style={obj.style}
              variants={floatingVariants}
              animate="float"
              custom={obj.custom}
              className='-z-10 will-change-transform pointer-events-none overflow-hidden'
          >
                <img 
                    src={obj.path} 
                    alt={obj.name} 
                    style={{ width: '100%', height: 'auto' }}
                />
          </motion.div>
        )
        ))}
        </div>
        
        {/* -------------------------------- LAPTOP ---------------------------------- */}
        <motion.div
          ref={laptopRef}
          className='flex relative w-full justify-start ml-20 pointer-events-none will-change-transform'
          style={{ scrollSnapAlign: isMobile ? 'none' : 'start', scrollMarginTop: isMobile ? undefined : '120px' }}
        >
          <motion.h1
            className='flex font-titilliumWeb-semibold text-white w-[52%] text-[clamp(2.6rem,3.4vw,3.8rem)] leading-[1.12]'
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            viewport={{ once: false, amount: 0.5 }}
          >
            Effortlessly connect with your peers through automated Discord servers, filtered for each one of your classes.
          </motion.h1>

          <motion.img 
            className='w-[35%] absolute left-1/2 -translate-x-[10%] -top-60 pointer-events-none will-change-transform'
            variants={floatingVariants} 
            src='/assets/HomePageAssets/Laptop.svg' 
            animate="float" custom={{x: 5, y: -6, startRotate: 4, endRotate: 0, duration: 4.5}}/>
          
          <motion.div className='flex absolute w-full justify-end pr-20 top-[45%] pointer-events-none will-change-transform'
            initial={{y:300}}
            whileInView={{y:0}}
            viewport={{once: true, amount: 0.40}}
            transition={{duration:2, type: 'spring'}}
          >
            <motion.img 
              className='w-[20%] flex pointer-events-none will-change-transform'
              src='/assets/HomePageAssets/BalloonPigy.svg'
              variants={floatingVariants}
              animate="float" custom={{x: 5, y: -6, startRotate: 4, endRotate: 0, duration: 4.5}}/>

          </motion.div>

        </motion.div>

        {/* -------------------------------- CALCULATOR ---------------------------------- */}
        <motion.div
          ref={calculatorRef}
          className='flex relative w-full justify-end pr-20'
          style={{ scrollSnapAlign: isMobile ? 'none' : 'start', scrollMarginTop: isMobile ? undefined : '120px' }}
        >
          <motion.h1
            className='flex font-titilliumWeb-semibold text-white w-[52%] text-[clamp(2.6rem,3.4vw,3.8rem)] leading-[1.12]'
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            viewport={{ once: false, amount: 0.5 }}
          >
            Determine the impact of your upcoming test or quiz to stay on top of your grades with Grade Calculator.
          </motion.h1>
          <motion.img 
            className='w-[25%] absolute right-1/2 -translate-x-[20%] scale-120 -top-70 pointer-events-none will-change-transform rotate-30'
            variants={floatingVariants} 
            src='/assets/Calculator.svg' 
            animate="float" custom={{x: 5, y: -6, startRotate: 4, endRotate: 0, duration: 4.5}}/>

            <div
              className='flex absolute w-full -left-1 top-[40%] pointer-events-none will-change-transform'
            >
              <img 
                className='w-[23%] flex pointer-events-none will-change-transform'
                src='/assets/HomePageAssets/SwingingAnimation.svg'
                alt="Swinging animation"
              />
            </div>
        </motion.div>

        {/* -------------------------------- BOOK ---------------------------------- */}
        <motion.div
          ref={bookRef}
          className='flex relative w-full justify-start ml-20 mb-100'
          style={{ scrollSnapAlign: isMobile ? 'none' : 'start', scrollMarginTop: isMobile ? undefined : '120px' }}
        >
          <motion.h1
            className='flex font-titilliumWeb-semibold text-white w-[60%] text-[clamp(2.6rem,3.4vw,3.8rem)] leading-[1.12]'
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            viewport={{ once: false, amount: 0.5 }}
          >
            Upload and combine your notes with your classmates through SuperDoc, the ultimate cramming tool and study guide.
          </motion.h1>
          <motion.img 
            className='w-[25%] absolute left-1/2 scale-120 translate-x-40 -top-40 pointer-events-none will-change-transform'
            variants={floatingVariants} 
            src='/assets/Book.svg' 
            animate="float" custom={{x: 5, y: -6, startRotate: 4, endRotate: 0, duration: 4.5}}/>
        </motion.div>

        <img src='/assets/HomePageAssets/LPBottomClouds.svg' className='flex absolute bottom-0'/>
{/*         { --------------------------------- CALCULATOR BOX --------------------------------- }
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
        { --------------------------------- MEGAPHONE BOX --------------------------------- }
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
        { --------------------------------- NOTES BOX --------------------------------- }
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
        </div> */}
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
          Give us Feedback!
        </span>

        {/*hover tip*/}
        <span
          className="absolute bottom-full right-0 mb-3 w-72 p-3 rounded-lg
                    bg-nexus900 text-white text-xs leading-snug
                    opacity-0 translate-y-2 pointer-events-none
                    transition-all duration-300
                    group-hover:opacity-100 group-hover:translate-y-0"
        >
          Run into any issues, potential improvements, or want to tell us what you like about Nexus?
          Let us know by filling out this form!
          <br />
          <br />
          We appreciate any and all input :)
        </span>
      </motion.div>
    </a>

    </div>
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 transition-all duration-220 ease-out ${
        showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <button
        className="rounded-full bg-white/95 text-nexus-blue-900 shadow-lg border border-gray-200 px-6 py-3 hover:scale-105 transition flex items-center gap-2"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
      >
        <HiArrowNarrowUp size={20} />
        <span className="font-titilliumWeb-semibold text-sm">Back to Top</span>
      </button>
    </div>
    </>
  )
}

export default LandingPage;
