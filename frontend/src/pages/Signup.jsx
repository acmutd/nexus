import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import Button from "../components/Button";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();

  const [pwVisible, setPwVisible] = useState(false);
  const [pw2Visible, setPw2Visible] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

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
  }, [location.pathname, location.key]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !pw || !pw2) {
      setError("Please fill in all fields.");
      return;
    }
    if (pw !== pw2) {
      setError("Passwords do not match.");
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setSendingEmail(true);

    try {
      // Store email and password temporarily
      sessionStorage.setItem('pendingSignup', JSON.stringify({
        email: email.trim(),
        password: pw,
        createdAt: new Date().toISOString(),
      }));

      // Send verification code WITHOUT creating Firebase account yet
      const sendCodeResponse = await fetch('/api/email/sendVerificationCode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(),
          isPreAuth: true // Flag to indicate this is before account creation
        })
      });

      if (!sendCodeResponse.ok) {
        const errorData = await sendCodeResponse.json();
        console.error('Send code error:', errorData);
        throw new Error(errorData.error || 'Failed to send verification code');
      }

      // Navigate to verification page
      navigate("/verify-code", { 
        state: { 
          email: email.trim(),
          isPreAuth: true // Flag to tell verify page to create account after verification
        } 
      });

    } catch (e) {
      console.error("Signup error:", e);
      const msg = (e?.message || "Signup failed").replace("Firebase: ", "");
      setError(msg);
      setSendingEmail(false);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-blue-950 font-titilliumWeb-regular"
      style={{
        backgroundImage: "url('/assets/SignUpBG.svg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div
        ref={popupRef}
        className={`bg-nexus100 rounded-lg shadow-lg p-8 w-full max-w-md transition-all duration-500 transform ${
          popupVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
      >
        <h2 className="bodyText mb-1 text-gray-800 font-titilliumWeb-bold">Sign up for Nexus</h2>
        <p className="text-blue-900 mb-6 tinyText font-titilliumWeb-bold">Create an account to get started</p>
        
        <form onSubmit={onSubmit}>
          <div className="mb-4 font-titilliumWeb-semibold tinyText">
            <h1 className="tinyText font-titilliumWeb-semibold text-nexus700 mb-2">
              Email
            </h1>
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none bg-white text-black placeholder-gray-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-4 relative font-titilliumWeb-semibold tinyText">
            <h1 className="tinyText font-titilliumWeb-semibold text-nexus700 mb-2">
              Password
            </h1>            
            <div className="flex relative tinyText">
              <input
                type={pwVisible ? "text" : "password"}
                placeholder="Password"
                className="w-full px-4 py-3 border border-gray-300 rounded pr-10 focus:outline-none bg-white text-black placeholder-gray-400"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setPwVisible(v => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-600 cursor-pointer"
                tabIndex={-1}
              >
                {pwVisible ? <IoMdEye /> : <IoMdEyeOff />}
              </button>
            </div>      
          </div>

          <div className="mb-4 relative font-titilliumWeb-semibold tinyText">
            <h1 className="tinyText font-titilliumWeb-semibold text-nexus700 mb-2">
              Confirm Password
            </h1>    
            <div className="flex relative tinyText">
              <input
                type={pw2Visible ? "text" : "password"}
                placeholder="Confirm Password"
                className="w-full px-4 py-3 border border-gray-300 rounded pr-10 focus:outline-none bg-white text-black placeholder-gray-400"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setPw2Visible(v => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-600 cursor-pointer"
                tabIndex={-1}
              >
                {pw2Visible ? <IoMdEye /> : <IoMdEyeOff />}
              </button>
            </div>        
          </div>

          {error && <div className="text-red-600 mb-4 text-sm font-medium">{error}</div>}

          <Button
            type="submit"
            className={"mb-2"}
            text={sendingEmail ? "Verifying..." : "Continue"}
            disabled={sendingEmail}
          />
        </form>

        <div className="text-center tinyText text-gray-700 font-titilliumWeb-bold">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-blue-900 hover:underline">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}