import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import NavBar from "../ui/NavBar";
import { resendVerificationEmail, verifyEmailToken } from "../../api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email...");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    const linkedEmail = searchParams.get("email") || "";
    const linkedStatus = searchParams.get("status");
    const linkedMessage = searchParams.get("message") || "";
    setEmail(linkedEmail);

    if (linkedStatus) {
      const normalizedStatus = linkedStatus === "success" ? "success" : "error";
      setStatus(normalizedStatus);
      setMessage(
        linkedMessage ||
          (normalizedStatus === "success"
            ? "Email verified successfully. You can now sign in."
            : "Verification link is invalid or expired.")
      );
      setShowSuccessPopup(normalizedStatus === "success");
      return;
    }

    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing.");
      return;
    }

    const verify = async () => {
      try {
        const res = await verifyEmailToken(token);
        setStatus("success");
        setMessage(res.data?.message || "Email verified successfully. You can now sign in.");
        setShowSuccessPopup(true);
      } catch (error) {
        setStatus("error");
        setMessage(error.response?.data?.message || "Verification link is invalid or expired.");
      }
    };

    verify();
  }, [searchParams]);

  const handleResend = async () => {
    if (!email) {
      setResendMessage("Enter your email address to receive a fresh verification link.");
      return;
    }

    setResending(true);
    setResendMessage("");
    try {
      const res = await resendVerificationEmail({ email });
      setResendMessage(res.data?.message || "A new verification email has been sent.");
    } catch (error) {
      setResendMessage(error.response?.data?.message || "Could not send a fresh verification email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-darkBg text-textMain relative overflow-hidden flex flex-col">
      <NavBar />

      <div className="absolute top-0 left-0 h-full w-full pointer-events-none overflow-hidden">
        <div className="absolute -left-10 top-10 h-[420px] w-[420px] rounded-full bg-sky-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-16">
        <AnimatePresence>
          {showSuccessPopup && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex items-center justify-center bg-[#020617]/70 backdrop-blur-sm px-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                className="w-full max-w-md rounded-3xl border border-emerald-500/20 bg-[#131A2A] p-8 text-center shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
              >
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300/70">Email Verified</p>
                <h2 className="mt-3 text-3xl font-display font-black text-white">Verification Complete</h2>
                <p className="mt-4 text-sm leading-relaxed text-emerald-100/80">
                  Your email has been verified automatically. You can now sign in to CDBMS.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSuccessPopup(false)}
                  className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-white hover:bg-emerald-400"
                >
                  Continue
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#131A2A]/90 p-10 text-center shadow-[0_0_40px_rgba(59,130,246,0.15)]"
        >
          <h1 className="text-3xl font-display font-black text-white">Email Verification</h1>
          <p
            className={`mt-5 rounded-2xl border px-5 py-4 text-sm ${
              status === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : status === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : "border-sky-500/30 bg-sky-500/10 text-sky-100"
            }`}
          >
            {message}
          </p>

          {status === "error" && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white/45">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email to get a fresh verification link"
                className="w-full rounded-xl border border-white/10 bg-[#0A0F1C]/80 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
              />
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15 disabled:opacity-50"
              >
                {resending ? "Sending..." : "Send Fresh Verification Email"}
              </button>
              {resendMessage && (
                <p className="mt-3 text-sm text-sky-200">
                  {resendMessage}
                </p>
              )}
            </div>
          )}

          <div className="mt-8">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-6 py-3 text-sm font-black text-white hover:bg-sky-400"
            >
              Go to Login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
