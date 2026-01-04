import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiAcademicCap, HiCalculator, HiUserCircle, HiDocumentText } from 'react-icons/hi';

import { getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';

// import the avatar menu
import AvatarMenu from './AvatarMenu';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const unsubRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Attach Firebase auth listener when the app becomes available
  useEffect(() => {
    let cancelled = false;

    const attach = () => {
      try {
        if (!getApps().length) return false; // Firebase not initialized yet
        const auth = getAuth(getApp());
        unsubRef.current = onAuthStateChanged(auth, (u) => {
          if (!cancelled) setUser(u);
        });
        setAuthReady(true);
        return true;
      } catch {
        return false;
      }
    };

    // Try immediately, if not ready, poll briefly
    if (!attach()) {
      const t = setInterval(() => {
        if (attach()) {
          clearInterval(t);
        }
      }, 150);

      return () => {
        cancelled = true;
        clearInterval(t);
        if (unsubRef.current) unsubRef.current();
      };
    }

    return () => {
      cancelled = true;
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const handleLogout = async () => {
    try {
      const auth = getAuth(getApp());
      await signOut(auth);
      navigate('/login');
    } catch (e) {
      console.error('Logout failed:', e);
      navigate('/login');
    }
  };

  const navbarClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
    isScrolled ? 'bg-white bg-opacity-90 shadow-md navbar-blur' : 'bg-gradient-to-r from-nexus800 to-nexus900 '
  }`;

  const linkClasses = `hover:text-nexus-blue-200 flex items-center relative group cursor-pointer ${
    isScrolled ? 'text-nexus-blue-900 hover:text-nexus-blue-600' : 'text-white'
  }`;

  const logoTextClasses = `text-xl font-bold ${
    isScrolled ? 'text-nexus-blue-900' : 'text-white'
  }`;

  const buttonClasses = `font-bold py-2 px-3 rounded flex items-center border transition duration-300 transform hover:scale-110 ${
    isScrolled
      ? 'bg-blue-900 border-nexus-blue-900 text-white hover:bg-nexus-blue-100'
      : 'bg-white text-nexus-blue-900 hover:bg-gray-100'
  }`;

  const handleSuperdocClick = () => {
    navigate('/superdoc', {
      state: { fileName: 'Superdoc', documentName: 'Superdoc', selectedUnit: 'Unit 1' }
    });
  };

  return (
    <nav className={navbarClasses}>
      <div className="container mx-auto ">
        <div className="flex justify-between items-center py-4 navbar-content">
          <button
            className="flex items-center transition duration-300 transform hover:scale-110 z-60 cursor-pointer"
            onClick={() => { window.scrollTo(0, 0); user ? navigate('/home') : navigate('/'); }}
          >
            <img src="/assets/Logo.svg" alt="Nexus Logo" className="h-10 mr-2" />
            <span className={logoTextClasses}>Nexus</span>
          </button>

          <div className="flex space-x-6 items-center">
            <Link to="/bbauth" className={linkClasses}>
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-current transform scale-x-0 transition-transform duration-300 origin-left group-hover:scale-x-100"></span>
            </Link>

            <Link to="/discordservers" className={linkClasses}>
              <HiAcademicCap className="mr-1" /> Courses
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-current transform scale-x-0 transition-transform duration-300 origin-left group-hover:scale-x-100"></span>
            </Link>

            <Link to="/grade-calculator" className={linkClasses}>
              <HiCalculator className="mr-1" /> Grade Calculator
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-current transform scale-x-0 transition-transform duration-300 origin-left group-hover:scale-x-100"></span>
            </Link>

            <button onClick={handleSuperdocClick} className={linkClasses}>
              <HiDocumentText className="mr-1" /> Superdoc
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-current transform scale-x-0 transition-transform duration-300 origin-left group-hover:scale-x-100"></span>
            </button>

            {/* Auth-aware area */}
            {authReady ? (
              user ? (
                // Avatar dropdown 
                <AvatarMenu
                  redirectOnLogout="/login"
                  buttonTone={isScrolled ? 'dark' : 'light'}
                />
              ) : (
                <Link to="/login" className={buttonClasses} aria-label="Login">
                  <HiUserCircle className="mr-1" /> Login
                </Link>
              )
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/40 animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
