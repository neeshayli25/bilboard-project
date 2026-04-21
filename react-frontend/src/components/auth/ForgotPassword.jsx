import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import NavBar from "../ui/NavBar";
import { requestPasswordReset, resetPassword } from "../../api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const linkedEmail = searchParams.get("email") || "";
  const [resetLinkExpired, setResetLinkExpired] = useState(false);

  const isReset = Boolean(token);

  const handleSendLink = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setPreviewUrl("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordReset({ email });
      setSuccess(res.data?.message || "Reset link sent to your Gmail account.");
      setPreviewUrl(res.data?.previewUrl || "");
      setResetLinkExpired(false);
      setEmail("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send the reset link.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password || !confirmPassword) {
      setError("Please fill both password fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(token, { password });
      setSuccess(res.data?.message || "Password reset successful. Redirecting to login...");
      setResetLinkExpired(false);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired reset link.");
      setResetLinkExpired(true);
      if (linkedEmail) {
        setEmail(linkedEmail);
      }
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
            {isReset ? "Create New Password" : "Forgot Password"}
          </h2>
          <p className="text-center text-white mb-6">
            {isReset ? "Enter your new password below" : "Enter your Gmail address to receive a reset link"}
          </p>

          {error && <div className="bg-red-500/20 text-red-400 p-2 rounded mb-4 text-center font-semibold">{error}</div>}
          {success && <div className="bg-green-500/20 text-green-400 p-2 rounded mb-4 text-center font-semibold">{success}</div>}
          {previewUrl && (
            <div className="bg-sky-500/10 text-sky-200 p-3 rounded mb-4 text-sm">
              <p className="font-semibold mb-2">Local reset preview link</p>
              <a href={previewUrl} className="underline break-all" target="_blank" rel="noreferrer">
                {previewUrl}
              </a>
            </div>
          )}

          {isReset && resetLinkExpired && (
            <div className="bg-sky-500/10 text-sky-200 p-4 rounded mb-4 text-sm">
              <p className="font-semibold mb-2">Need a fresh reset link?</p>
              <p className="mb-3">Request a new password reset email below and use only the latest email message.</p>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3 rounded-xl bg-gray-800 text-gray-200 placeholder-gray-500 outline-none focus:ring-2 focus:ring-silver-300 transition duration-300"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                disabled={loading}
                onClick={handleSendLink}
                className="mt-3 w-full bg-sky-500 text-white py-3 rounded-xl font-bold hover:bg-sky-400 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send New Reset Link"}
              </motion.button>
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
              {loading ? "Processing..." : isReset ? "Reset Password" : "Send Reset Link"}
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
