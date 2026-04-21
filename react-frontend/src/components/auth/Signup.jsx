import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import NavBar from "../ui/NavBar";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../../api";

function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewReason, setPreviewReason] = useState("");
  const [existingAccountEmail, setExistingAccountEmail] = useState("");
  const [existingAccountIsAdmin, setExistingAccountIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");
    if (token) {
      navigate(role === "admin" ? "/admin" : "/advertiser", { replace: true });
    }
  }, [navigate]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setPreviewUrl("");
    setPreviewReason("");
    setExistingAccountEmail("");
    setExistingAccountIsAdmin(false);

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("Please enter a valid email.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: form.name,
        email: form.email,
        password: form.password,
      });
      setSuccess(res.data?.message || "Verification link sent to your email. Please verify before signing in.");
      const nextPreviewUrl = res.data?.previewUrl || "";
      setPreviewUrl(nextPreviewUrl);
      setPreviewReason(res.data?.reason || "");
      if (!nextPreviewUrl) {
        setTimeout(() => navigate("/login"), 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed. Please try again.");
      setPreviewUrl(err.response?.data?.previewUrl || "");
      setPreviewReason(err.response?.data?.reason || "");
      if (err.response?.data?.canLogin) {
        setExistingAccountEmail(form.email);
      }
      setExistingAccountIsAdmin(Boolean(err.response?.data?.isAdminAccount));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-darkBg text-textMain relative overflow-hidden flex flex-col">
      <NavBar />

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-accent opacity-20 blur-[100px] top-10 right-10 rounded-full mix-blend-screen"></div>
        <div className="absolute w-[600px] h-[600px] bg-primary opacity-20 blur-[100px] bottom-10 left-10 rounded-full mix-blend-screen"></div>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between flex-grow px-10 md:px-20 py-10 md:py-0">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="md:w-1/2 flex justify-center w-full order-2 md:order-1 mt-12 md:mt-0"
        >
          <div className="bg-[#131A2A]/90 backdrop-blur-2xl border border-blue-500/20 rounded-3xl p-10 w-full max-w-md shadow-[0_0_40px_rgba(59,130,246,0.15)]">
            <h2 className="text-3xl font-display font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-300">
              Create Verified Account
            </h2>

            {error && <div className="bg-danger/20 border border-danger/50 text-danger p-3 rounded-lg mb-6 text-sm text-center">{error}</div>}
            {success && <div className="bg-success/20 border border-success/50 text-success p-3 rounded-lg mb-6 text-sm text-center">{success}</div>}
            {previewUrl && (
              <div className="bg-sky-500/10 border border-sky-500/30 text-sky-100 p-4 rounded-lg mb-6 text-sm">
                <p className="font-semibold">Local verification preview</p>
                {previewReason === "missing_sender_app_password" && (
                  <p className="mt-2 text-sky-100/80">
                    Real Gmail sending is currently off because the server sender app password has not been configured yet.
                  </p>
                )}
                <a href={previewUrl} className="mt-2 block break-all text-sky-300 underline" target="_blank" rel="noreferrer">
                  {previewUrl}
                </a>
              </div>
            )}
            {existingAccountEmail && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-100 p-4 rounded-lg mb-6 text-sm">
                <p className="font-semibold">{existingAccountIsAdmin ? "This email is already the admin account" : "This email already has an account"}</p>
                <p className="mt-2">
                  {existingAccountIsAdmin
                    ? <>Sign in with <span className="font-semibold">{existingAccountEmail}</span> on the login page. Do not use signup for the admin account.</>
                    : <>Sign in with <span className="font-semibold">{existingAccountEmail}</span>, or use Forgot Password on the login page if you do not remember the password.</>}
                </p>
                <div className="mt-3 flex gap-3">
                  <Link to="/login" className="rounded-lg bg-amber-400/20 px-3 py-2 text-amber-100 hover:bg-amber-400/30">
                    Go to Login
                  </Link>
                  {!existingAccountIsAdmin && (
                  <Link to="/forgot-password" className="rounded-lg bg-white/10 px-3 py-2 text-white/90 hover:bg-white/15">
                      Forgot Password
                    </Link>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSignup} className="flex flex-col gap-4 relative z-10">
              <div className="space-y-1">
                <label className="text-sm text-indigo-200/70 ml-1 font-medium">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0A0F1C]/80 border border-blue-500/20 text-white outline-none focus:border-blue-400"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-indigo-200/70 ml-1 font-medium">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0A0F1C]/80 border border-blue-500/20 text-white outline-none focus:border-blue-400"
                  placeholder="john@gmail.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-indigo-200/70 ml-1 font-medium">Create Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0A0F1C]/80 border border-blue-500/20 text-white outline-none focus:border-blue-400"
                  placeholder="Create a new password for this app"
                  autoComplete="new-password"
                />
                <p className="text-xs text-indigo-200/45 ml-1">Use your real email address here, but create a new password only for this app.</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-indigo-200/70 ml-1 font-medium">Confirm Password</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0A0F1C]/80 border border-blue-500/20 text-white outline-none focus:border-blue-400"
                  placeholder="Confirm password"
                  autoComplete="new-password"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-3 rounded-xl font-bold disabled:opacity-50"
              >
                {loading ? "Sending verification..." : "Create Account"}
              </motion.button>
            </form>

            <p className="mt-6 text-center text-sm text-indigo-200/60 relative z-10">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="md:w-1/2 space-y-8 order-1 md:order-2"
        >
          <h1 className="text-5xl md:text-6xl font-display font-black leading-tight tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-blue-100 to-indigo-300">
              Join the future of
            </span>{" "}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
              Digital Billboard
            </span>{" "}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-300">
              Advertising
            </span>
          </h1>
          <p className="text-lg text-blue-100/70 max-w-md font-medium leading-relaxed">
            Sign up with your real email address, verify it from your inbox, and create a new password only for this platform.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default Signup;
