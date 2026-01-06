import React, { useState, useEffect } from "react";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import { getAuth, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get("oobCode");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwError, setPwError] = useState("");
  const [status, setStatus] = useState("loading"); // loading, ready, error, success

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

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-blue-950 font-titilliumWeb-regular"
      style={{
        backgroundImage: "url('/assets/SignUpBG.svg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="bg-blue-200 rounded-lg shadow-lg p-8 w-full max-w-md">
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
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-600"
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
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-600"
              tabIndex={-1}
            >
              {showConfirmPassword ? <IoMdEye /> : <IoMdEyeOff />}
            </button>
          </div>

          {pwError && <div className="text-red-600 mb-4 text-sm font-medium font-titilliumWeb-bold">{pwError}</div>}

          <button
            type="submit"
            className="w-full font-titilliumWeb-bold bg-nexus600 text-white py-2 rounded font-semibold transition transform hover:bg-nexus700"
            disabled={status === "submitting"}
          >
            {status === "submitting" ? "Resetting…" : "Set New Password"}
          </button>
        </form>
      </div>
    </div>
  );
}