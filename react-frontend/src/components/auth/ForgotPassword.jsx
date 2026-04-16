import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import NavBar from "../ui/NavBar";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const isReset = !!token;

  // Base API URL (reads from .env or defaults to localhost)
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // Forgot Password handler
  const handleSendLink = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || "Reset link sent! Please check your email.");
        setEmail("");
      } else {
        setError(data.message || "Something went wrong");
      }
    } catch (err) {
      setError("Server error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Reset Password handler
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password || !confirmPassword) {
      setError("Please fill both fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || "Password reset successful! Redirecting to login...");
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setError(data.message || "Invalid or expired reset token");
      }
    } catch (err) {
      setError("Server error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 relative overflow-hidden">
      <NavBar />
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute w-[400px] h-[400px] bg-gray-500/20 blur-3xl top-16 left-16 animate-pulse"></div>
        <div className="absolute w-[350px] h-[350px] bg-gray-400/20 blur-3xl bottom-16 right-16 animate-pulse"></div>
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-gray-900/40 backdrop-blur-md border border-gray-600 rounded-3xl p-10 w-full max-w-md shadow-xl"
        >
          <h2 className="text-3xl font-extrabold text-white text-center mb-4">
            {isReset ? "Reset Password" : "Forgot Password"}
          </h2>
          <p className="text-center text-white mb-6">
            {isReset
              ? "Enter your new password below"
              : "Enter your email to receive a reset link"}
          </p>
          {error && (
            <div className="bg-red-500/20 text-red-400 p-2 rounded mb-4 text-center font-semibold">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/20 text-green-400 p-2 rounded mb-4 text-center font-semibold">
              {success}
            </div>
          )}
          <form onSubmit={isReset ? handleResetPassword : handleSendLink} className="flex flex-col gap-4">
            {!isReset && (
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-5 py-3 rounded-xl bg-gray-800 text-gray-200 placeholder-gray-500 outline-none focus:ring-2 focus:ring-silver-300 transition duration-300"
              />
            )}
            {isReset && (
              <>
                <input
                  type="password"
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="px-5 py-3 rounded-xl bg-gray-800 text-gray-200 placeholder-gray-500 outline-none focus:ring-2 focus:ring-silver-300 transition duration-300"
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="px-5 py-3 rounded-xl bg-gray-800 text-gray-200 placeholder-gray-500 outline-none focus:ring-2 focus:ring-silver-300 transition duration-300"
                />
              </>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={loading}
              className="mt-2 bg-gradient-to-r from-gray-600 via-white to-gray-500 text-black py-3 rounded-xl font-bold shadow-lg hover:from-gray-700 hover:to-gray-500 transition-all duration-300 disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : isReset
                ? "Reset Password"
                : "Send Reset Link"}
            </motion.button>
          </form>
          <div className="mt-6 text-center text-white">
            <Link to="/login" className="hover:underline text-silver-300 font-semibold">
              Back to Login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default ForgotPassword;