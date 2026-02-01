import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiUserCircle, HiDocumentText } from 'react-icons/hi';
import { FaCalculator } from "react-icons/fa";
import { AiFillDiscord } from "react-icons/ai";
import { useAuth } from '../context/authContext';
import { getAuth, signOut } from 'firebase/auth';
import { getApp } from 'firebase/app';
import AvatarMenu from './AvatarMenu';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
    isScrolled ? 'bg-white bg-opacity-90 shadow-md navbar-blur' : 'bg-gradient-to-r from-nexus800 to-nexus900'
  }`;

  const linkClasses = `flex items-center justify-center md:justify-start gap-1 md:gap-2 md:text-sm text-2xl md:text-base cursor-pointer`;

  const buttonClasses = `font-bold py-1.5 md:py-2 px-2.5 md:px-3 text-sm md:text-base rounded flex items-center border transition duration-300 transform hover:scale-110 ${
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
    <nav className={`${navbarClasses} font-titilliumWeb-semibold`}>
      <div className="container mx-auto">
        <div className="flex justify-between items-center py-5 md:py-4 px-3 md:px-0">

          {/* Logo + Nexus text */}
          <button
            className="flex items-center flex-shrink-0 transition duration-300 transform hover:scale-110 z-60 cursor-pointer"
            onClick={() => { window.scrollTo(0, 0); user ? navigate('/home') : navigate('/'); }}
          >
            <img
              src="/assets/Logo.svg"
              alt="Nexus Logo"
              className="h-9 w-9 md:h-10 md:w-auto rounded-full md:rounded-none"
            />
            <span 
              className={`text-xl font-bold hidden md:inline ml-2 ${
                isScrolled ? 'text-nexus-blue-700' : 'text-white'
              }`}
            >
              Nexus
            </span>
          </button>

          {/* Mobile icon only menu + desktop text */}
          <div className="flex flex-1 items-center justify-between md:justify-end gap-0 md:gap-6">

            {/* Discord */}
            <Link
              to="/discordservers"
              className="flex justify-center items-center w-full md:w-auto"
            >
              <AiFillDiscord 
                className={`text-4xl md:text-xl ml-5 md:ml-4 ${
                  isScrolled ? 'text-nexus-blue-700' : 'text-white'
                }`} 
              />
              <span 
                className={`hidden md:inline ml-2 ${
                  isScrolled ? 'text-nexus-blue-700' : 'text-white'
                }`}
              >
                Discord Servers
              </span>
            </Link>

            {/* Grade Calculator */}
            <Link
              to="/grade-calculator"
              className="flex justify-center items-center w-full md:w-auto"
            >
              <FaCalculator 
                className={`text-3xl md:text-lg ml-5 md:ml-4 ${
                  isScrolled ? 'text-nexus-blue-700' : 'text-white'
                }`} 
              />
              <span 
                className={`hidden md:inline ml-2 ${
                  isScrolled ? 'text-nexus-blue-700' : 'text-white'
                }`}
              >
                Grade Calculator
              </span>
            </Link>

            {/* Superdoc */}
            <button
              onClick={handleSuperdocClick}
              className="flex justify-center items-center w-full md:w-auto"
            >
              <HiDocumentText 
                className={`text-4xl md:text-xl ml-5 md:ml-4 ${
                  isScrolled ? 'text-nexus-blue-700' : 'text-white'
                }`} 
              />
              <span 
                className={`hidden md:inline ml-2 ${
                  isScrolled ? 'text-nexus-blue-700' : 'text-white'
                }`}
              >
                Superdoc
              </span>
            </button>

            {/* Avatar / Login */}
            <div className="flex justify-center w-full md:w-auto ml-0 md:ml-0">
              {loading ? (
                <div className="h-10 w-10 rounded-full bg-white/40 animate-pulse" />
              ) : user ? (
                <AvatarMenu buttonTone={isScrolled ? 'dark' : 'light'} />
              ) : (
                <Link
                  to="/login"
                  className={`flex font-bold py-1.5 px-3 text-sm md:text-base rounded border transition duration-300 transform hover:scale-110 ${
                    isScrolled 
                      ? 'bg-blue-900 border-nexus-blue-900 text-white hover:bg-nexus-blue-100' 
                      : 'bg-white text-nexus-blue-900 hover:bg-gray-100'
                  }`}
                >
                  <HiUserCircle className="mr-1" /> Login
                </Link>
              )}
            </div>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;