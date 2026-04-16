import { useState } from "react";
import { motion } from "framer-motion";
import NavBar from "../ui/NavBar";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../../api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const response = await login({ email, password });
      const { token, role } = response.data;

      localStorage.setItem("token", token);

      if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/advertiser");
      }

      setSuccess("Login successful! Redirecting...");
    } catch (err) {
      const message = err.response?.data?.message || "Invalid email or password";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-600 relative overflow-hidden">
      <NavBar />

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute w-[900px] h-[600px] bg-pink-500 opacity-30 blur-3xl top-10 left-10 animate-pulse"></div>
        <div className="absolute w-[700px] h-[600px] bg-indigo-500 opacity-30 blur-3xl bottom-10 right-10 animate-pulse"></div>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between min-h-screen px-10 pt-24">
        {/* Left animated content */}
        <motion.div
          initial={{ opacity: 0, x: -80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          className="md:w-1/2 text-white space-y-6"
        >
          <h1 className="text-5xl font-extrabold leading-tight">
            CENTRALIZED DIGITAL <br />
            <span className="text-yellow-300">BILLBOARD</span> <br />
            MANAGEMENT SYSTEM
          </h1>
          <p className="text-lg text-gray-200 max-w-md">
            Manage, monitor and control your digital advertisements from one
            powerful platform. Smart. Scalable. Efficient.
          </p>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 rounded-full text-black font-bold shadow-lg"
          >
            Explore Features →
          </motion.button>
          <div className="relative mt-10">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -20, 0], opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 + i }}
                className="absolute w-5 h-5 bg-white rounded-full"
                style={{ left: `${i * 40}px`, top: `${(i % 2) * 30}px` }}
              />
            ))}
          </div>
        </motion.div>

        {/* Right side – Login form */}
        <motion.div
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          className="md:w-1/2 flex justify-center mt-10 md:mt-0"
        >
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 w-full max-w-md shadow-2xl">
            <h2 className="text-3xl font-extrabold text-white text-center mb-6">Login</h2>
            <p className="text-center text-gray-300 mb-6">Enter your credentials</p>

            {error && (
              <div className="bg-red-500/20 text-red-300 p-2 rounded mb-4 text-center font-semibold">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-500/20 text-green-300 p-2 rounded mb-4 text-center font-semibold">
                {success}
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-4 py-3 rounded-full bg-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-yellow-400 transition"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-4 py-3 rounded-full bg-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-yellow-400 transition"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={loading}
                className="mt-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black py-3 rounded-full font-bold shadow-lg disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Login"}
              </motion.button>
            </form>

            <p className="mt-4 text-center text-gray-300">
              Don't have an account?{" "}
              <Link to="/Signup" className="text-yellow-300 font-bold hover:underline">
                Sign Up
              </Link>
            </p>
            {/* Remove this block if you don't want password reset link */}
            <p className="mt-4 text-center text-gray-300">
              Can't Remember Password?{" "}
              <Link to="/ForgotPassword" className="text-yellow-300 font-bold hover:underline">
                Reset Password
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Login;