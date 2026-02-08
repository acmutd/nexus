import React, { useState, useEffect, useRef } from "react";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import { getAuth, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from 'framer-motion'
import StarFieldOverlay from '../components/StarFieldOverlay';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const oobCode = searchParams.get("oobCode");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwError, setPwError] = useState("");
  const [status, setStatus] = useState("loading"); // loading, ready, error, success

  // Popup animation state: retrigger on every navigation to this route
  const popupRef = useRef(null);
  const [popupVisible, setPopupVisible] = useState(false);

  useEffect(() => {
    setPopupVisible(false);
    const t = setTimeout(() => {
      // Force reflow so transition runs reliably
      if (popupRef.current) popupRef.current.offsetHeight;
      setPopupVisible(true);
    }, 60);
    return () => clearTimeout(t);
  }, [location.pathname, location.key, location.search]);

  useEffect(() => {
    if (!oobCode) {
      setStatus("error");
      return;
    }
    const auth = getAuth();
    verifyPasswordResetCode(auth, oobCode)
      .then(setEmail)
      .then(() => setStatus("ready"))
      .catch(() => setStatus("error"));
  }, [oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPwError("");
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    setStatus("submitting");
    try {
      const auth = getAuth();
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus("success");
      setTimeout(() => navigate("/login"), 2000);
    } catch {
      setStatus("error");
    }
  };

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen bg-blue-950 text-blue-200 font-titilliumWeb-regular">Checking link…</div>;
  if (status === "error") return <div className="flex items-center justify-center min-h-screen bg-blue-950 text-red-400 font-titilliumWeb-regular">Invalid or expired reset link.</div>;
  if (status === "success") return <div className="flex items-center justify-center min-h-screen bg-blue-950 text-blue-200 font-titilliumWeb-bold" style={{backgroundImage: "url('/assets/SignUpBG.svg')"}}>Password changed! Redirecting…</div>;

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

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-linear-to-b from-nexus900 to-nexus700 font-titilliumWeb-regular">

      { /* BACKGROUN ASSETS */}
      <div className="fixed inset-0">
        <StarFieldOverlay count={200}/>

        { /* BG CLOUDS */}
        <motion.img initial={{y:200, opacity:0}} animate={{y:10, opacity:1}} transition={{duration:1, type: 'spring', damping: 15, delay:0.3}} 
                    src="/assets/LoginSignUpAssets/LSBGClouds.svg" className="bottom-0 fixed will-change-transform pointer-events-none w-full"/>

        { /* CLIFF */}
        <motion.img initial={{y:200, opacity:0}} animate={{y:10, opacity:1}} transition={{duration:1, type: 'spring', damping: 15, delay:0.4}} 
                    src="/assets/LoginSignUpAssets/LSCliff.svg" className="bottom-0 fixed w-[35%] will-change-transform pointer-events-none"/>
        
        { /* MOON */}
        <motion.div initial={{y:300, opacity:0}} animate={{y:0, opacity:1}} transition={{duration:2.5, type:'spring', damping: 12, delay:0.6}} >
          <motion.img 
                      variants={floatingVariants} animate="float" custom={{x:2, y:-6, duration:5.5, startRotate:0, endRotate:5}}
                      src="/assets/LoginSignUpAssets/LSMoon.svg" className="top-25 right-20 fixed w-[15%] will-change-transform pointer-events-none"/>
        </motion.div>
        
        { /* RIGHT CLOUD */}
        <motion.img initial={{y:200, opacity:0}} animate={{y:10, opacity:1}} transition={{duration:1, type: 'spring', damping: 15, delay:0.4}} 
                    src="/assets/LoginSignUpAssets/LSRightCloud.svg" className="bottom-0 right-0 fixed w-[20%] will-change-transform pointer-events-none"/>
      </div>

      <div
        ref={popupRef}
        className={`bg-nexus100 rounded-lg shadow-lg p-8 mt-30 mb-10 w-[clamp(320px,30%,1000px)] overflow-hidden relative transition-all duration-500 transform flex flex-col
          ${popupVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
      >   
      
        <h2 className="text-2xl mb-1 text-gray-800 font-titilliumWeb-bold">Reset Password</h2>
        <p className="text-blue-900 mb-6 text-base font-titilliumWeb-bold">Resetting password for {email}</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4 relative font-titilliumWeb-bold">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New password"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none bg-white text-black placeholder-gray-400 pr-10"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-600 cursor-pointer"
              tabIndex={-1}
            >
              {showPassword ? <IoMdEye /> : <IoMdEyeOff />}
            </button>
          </div>

          <div className="mb-4 relative font-titilliumWeb-bold">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none bg-white text-black placeholder-gray-400 pr-10"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(v => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-600 cursor-pointer"
              tabIndex={-1}
            >
              {showConfirmPassword ? <IoMdEye /> : <IoMdEyeOff />}
            </button>
          </div>

          {pwError && <div className="text-red-600 mb-4 text-sm font-medium font-titilliumWeb-bold">{pwError}</div>}

          <button
            type="submit"
            className="w-full font-titilliumWeb-bold bg-nexus600 text-white py-2 rounded font-semibold transition transform hover:bg-nexus700 cursor-pointer"
            disabled={status === "submitting"}
          >
            {status === "submitting" ? "Resetting…" : "Set New Password"}
          </button>
        </form>
      </div>
    </div>
  );
}