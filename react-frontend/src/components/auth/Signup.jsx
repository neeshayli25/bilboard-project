import { useState } from "react";
import { motion } from "framer-motion";
import NavBar from "../ui/NavBar";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../../api";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("advertiser");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email");
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
      await register({ name, email, password, role });
      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      const message = err.response?.data?.message || "Signup failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-blue-600 to-indigo-700 relative overflow-hidden">
      <NavBar />
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute w-[500px] h-[400px] bg-teal-400 opacity-30 blur-3xl top-10 right-10 animate-pulse"></div>
        <div className="absolute w-[600px] h-[500px] bg-blue-400 opacity-30 blur-3xl bottom-10 left-10 animate-pulse"></div>
      </div>
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between min-h-screen px-10 pt-24">
        <motion.div
          initial={{ opacity: 0, x: -80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          className="md:w-1/2 flex justify-center"
        >
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 w-full max-w-md shadow-2xl">
            <h2 className="text-3xl font-extrabold text-white text-center mb-6">Create Account</h2>
            <p className="text-center text-gray-200 mb-6">Join CDBMS platform</p>
            {error && <div className="bg-red-500/20 text-red-200 p-2 rounded mb-4 text-center font-semibold">{error}</div>}
            {success && <div className="bg-green-500/20 text-green-200 p-2 rounded mb-4 text-center font-semibold">{success}</div>}
            <form onSubmit={handleSignup} className="flex flex-col gap-4">
              <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="px-4 py-3 rounded-full bg-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-teal-300" />
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="px-4 py-3 rounded-full bg-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-teal-300" />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="px-4 py-3 rounded-full bg-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-teal-300" />
              <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="px-4 py-3 rounded-full bg-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-teal-300" />
              <div className="flex gap-6 justify-center mt-2">
                <label className="flex items-center gap-2 text-white">
                  <input type="radio" value="advertiser" checked={role === "advertiser"} onChange={(e) => setRole(e.target.value)} className="w-4 h-4" /> Advertiser
                </label>
                <label className="flex items-center gap-2 text-white">
                  <input type="radio" value="admin" checked={role === "admin"} onChange={(e) => setRole(e.target.value)} className="w-4 h-4" /> Admin
                </label>
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" disabled={loading} className="mt-4 bg-gradient-to-r from-teal-300 to-blue-400 text-black py-3 rounded-full font-bold shadow-lg disabled:opacity-50">
                {loading ? "Creating Account..." : "Create Account"}
              </motion.button>
            </form>
            <p className="mt-4 text-center text-gray-200">Already have an account? <Link to="/login" className="text-teal-200 font-bold hover:underline">Login</Link></p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1 }} className="md:w-1/2 text-white space-y-6 mt-10 md:mt-0">
          <h1 className="text-5xl font-extrabold leading-tight">JOIN THE FUTURE OF <br /><span className="text-teal-200">DIGITAL BILLBOARD</span> <br />MANAGEMENT</h1>
          <p className="text-lg text-gray-200 max-w-md">Create your account and start managing your digital advertisements with powerful tools and real-time analytics.</p>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }} className="bg-gradient-to-r from-teal-300 to-blue-400 px-6 py-3 rounded-full text-black font-bold shadow-lg">Get Started →</motion.button>
          <div className="relative mt-10">
            {[...Array(6)].map((_, i) => (
              <motion.div key={i} animate={{ y: [0, -20, 0], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2 + i }} className="absolute w-4 h-4 bg-white rounded-full" style={{ left: `${i * 40}px`, top: `${(i % 2) * 30}px` }} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Signup;