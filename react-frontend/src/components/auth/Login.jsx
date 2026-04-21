import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import NavBar from "../ui/NavBar";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { login, resendVerificationEmail } from "../../api";
import { useSettings } from "../../context/SettingsContext";

const SAVED_EMAIL_KEY = "savedEmail";
const SAVED_LOGIN_ACCOUNTS_KEY = "savedLoginAccounts";

const persistLoginSession = ({ token, role, _id, name, email }) => {
  sessionStorage.setItem("token", token);
  sessionStorage.setItem("role", role);
  sessionStorage.setItem("userId", _id);
  sessionStorage.setItem("userName", name);
  sessionStorage.setItem("email", email || "");
  sessionStorage.setItem("name", name);
};

const canStoreBrowserPassword = () =>
  window.isSecureContext && "PasswordCredential" in window && Boolean(navigator.credentials?.store);

const storeBrowserPassword = async ({ email, password, name }) => {
  if (!canStoreBrowserPassword()) {
    return { saved: false, reason: "unsupported" };
  }

  try {
    const credential = new window.PasswordCredential({
      id: email,
      password,
      name: name || email,
    });
    await navigator.credentials.store(credential);
    return { saved: true, reason: "saved" };
  } catch {
    return { saved: false, reason: "blocked" };
  }
};

const readSavedLoginAccounts = () => {
  try {
    const raw = localStorage.getItem(SAVED_LOGIN_ACCOUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((account) => account?.email);
    }

    const legacyEmail = localStorage.getItem(SAVED_EMAIL_KEY);
    return legacyEmail ? [{ email: legacyEmail, name: "", role: "", lastUsedAt: Date.now() }] : [];
  } catch {
    const legacyEmail = localStorage.getItem(SAVED_EMAIL_KEY);
    return legacyEmail ? [{ email: legacyEmail, name: "", role: "", lastUsedAt: Date.now() }] : [];
  }
};

const writeSavedLoginAccounts = (accounts) => {
  localStorage.setItem(SAVED_LOGIN_ACCOUNTS_KEY, JSON.stringify(accounts));
};

const upsertSavedLoginAccount = (accounts, loginData) => {
  const normalizedEmail = String(loginData.email || "").trim().toLowerCase();
  const nextAccount = {
    email: normalizedEmail,
    name: loginData.name || "",
    role: loginData.role || "",
    lastUsedAt: Date.now(),
  };

  const remaining = accounts.filter((account) => String(account.email || "").trim().toLowerCase() !== normalizedEmail);
  return [nextAccount, ...remaining].slice(0, 8);
};

const removeSavedLoginAccount = (accounts, targetEmail) =>
  accounts.filter((account) => String(account.email || "").trim().toLowerCase() !== String(targetEmail || "").trim().toLowerCase());

function Login() {
  const { settings } = useSettings();
  const location = useLocation();
  const registrationBlocked = location.state?.blocked || !settings.allowNewRegistrations;
  const [savedAccounts, setSavedAccounts] = useState(() => readSavedLoginAccounts());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [needsVerificationHelp, setNeedsVerificationHelp] = useState(false);
  const navigate = useNavigate();
  const secureContextAvailable = window.isSecureContext;
  const hasHydratedSavedEmail = useRef(false);

  useEffect(() => {
    if (hasHydratedSavedEmail.current) return;

    hasHydratedSavedEmail.current = true;
    const savedEmail = localStorage.getItem(SAVED_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberDevice(true);
    } else if (savedAccounts[0]?.email) {
      setEmail(savedAccounts[0].email);
      setRememberDevice(true);
    }
  }, [savedAccounts]);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");
    if (token) {
      navigate(role === "admin" ? "/admin" : "/advertiser", { replace: true });
    }
  }, [navigate]);

  const handleEmailChange = (value) => {
    setEmail(value);

    if (savedAccounts.some((account) => account.email === String(value || "").trim().toLowerCase())) {
      setRememberDevice(true);
    }
  };

  const finishLogin = async (loginData, plainPassword) => {
    persistLoginSession(loginData);

    const normalizedEmail = String(loginData.email || email || "").trim().toLowerCase();
    const alreadySaved = savedAccounts.some((account) => account.email === normalizedEmail);
    if (rememberDevice) {
      localStorage.setItem(SAVED_EMAIL_KEY, normalizedEmail);
      const nextAccounts = upsertSavedLoginAccount(savedAccounts, { ...loginData, email: normalizedEmail });
      writeSavedLoginAccounts(nextAccounts);
      setSavedAccounts(nextAccounts);
    } else {
      const remainingAccounts = removeSavedLoginAccount(savedAccounts, normalizedEmail);
      writeSavedLoginAccounts(remainingAccounts);
      setSavedAccounts(remainingAccounts);
      if (remainingAccounts[0]?.email) {
        localStorage.setItem(SAVED_EMAIL_KEY, remainingAccounts[0].email);
      } else {
        localStorage.removeItem(SAVED_EMAIL_KEY);
      }
    }

    let successMessage = "Login successful! Redirecting...";
    if (rememberDevice && !alreadySaved) {
      const passwordSave = await storeBrowserPassword({
        email: normalizedEmail,
        password: plainPassword,
        name: loginData.name || normalizedEmail,
      });

      if (passwordSave.saved) {
        successMessage = "Login successful. This sign-in is now saved on this device.";
      } else if (!secureContextAvailable) {
        successMessage =
          "Login successful. Email saved on this device. Password saving needs localhost or HTTPS, so it will not work on this network URL.";
      } else {
        successMessage = "Login successful. Email saved on this device. Your browser did not save the password.";
      }
    } else if (rememberDevice && alreadySaved) {
      successMessage = "Login successful. This email is already saved on this device.";
    }

    setSuccess(successMessage);
    setTimeout(() => {
      navigate(loginData.role === "admin" ? "/admin" : "/advertiser");
    }, 700);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setNeedsVerificationHelp(false);

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const response = await login({ email, password });
      const loginData = response.data;
      await finishLogin(loginData, password);
    } catch (err) {
      const message = err.response?.data?.message || "Invalid email or password";
      if (message.toLowerCase().includes("verify your email")) {
        setNeedsVerificationHelp(true);
        setError("Your email is not verified yet. Use the button below to send a fresh verification link, then open that email and click verify.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError("");
    setSuccess("");

    if (!email) {
      setError("Enter your email first so we can send a fresh verification link.");
      return;
    }

    setResendingVerification(true);
    try {
      const response = await resendVerificationEmail({ email });
      setSuccess(response.data?.message || "A fresh verification email has been sent.");
      setNeedsVerificationHelp(true);
    } catch (err) {
      setError(err.response?.data?.message || "We could not send a fresh verification email right now.");
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <div className="min-h-screen bg-darkBg text-textMain relative overflow-hidden flex flex-col">
      <NavBar />

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute w-[600px] h-[600px] bg-primary opacity-20 blur-[100px] -top-20 -left-20 rounded-full mix-blend-screen"></div>
        <div className="absolute w-[500px] h-[500px] bg-accent opacity-20 blur-[100px] bottom-10 -right-20 rounded-full mix-blend-screen"></div>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between flex-grow px-10 md:px-20">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="md:w-1/2 space-y-8"
        >
          <h1 className="text-5xl md:text-6xl font-display font-black leading-tight tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-blue-100 to-indigo-300">
              Centralized Digital
            </span>{" "}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
              Billboard
            </span>{" "}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-300">
              Management
            </span>
          </h1>
          <p className="text-lg text-blue-100/70 max-w-md font-medium leading-relaxed">
            Sign in with your verified email and manage real advertiser bookings from one secure platform.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="md:w-1/2 flex justify-center mt-12 md:mt-0 w-full"
        >
          <div className="bg-[#131A2A]/90 backdrop-blur-2xl border border-blue-500/20 rounded-3xl p-10 w-full max-w-md shadow-[0_0_40px_rgba(59,130,246,0.15)]">
            <h2 className="text-3xl font-display font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-300">
              Welcome Back
            </h2>

            {error && <div className="bg-danger/20 border border-danger/50 text-danger p-3 rounded-lg mb-6 text-sm text-center">{error}</div>}
            {success && <div className="bg-success/20 border border-success/50 text-success p-3 rounded-lg mb-6 text-sm text-center">{success}</div>}
            {needsVerificationHelp && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-100 p-4 rounded-lg mb-6 text-sm">
                <p className="font-semibold">Email verification is still pending</p>
                <p className="mt-2 text-amber-100/80">
                  If the old email does not work, send a fresh one. On another device, open the newest email and tap the verify button from there.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="rounded-xl bg-amber-400/20 px-4 py-2 font-bold text-amber-100 hover:bg-amber-400/30 disabled:opacity-50"
                  >
                    {resendingVerification ? "Sending..." : "Send Fresh Verification Email"}
                  </button>
                  <Link
                    to={`/verify-email${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                    className="rounded-xl bg-white/10 px-4 py-2 font-bold text-white/90 hover:bg-white/15"
                  >
                    Open Verification Help
                  </Link>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-5 relative z-10">
              <div className="space-y-1">
                <label className="text-sm text-indigo-200/70 ml-1 font-medium">Email Address</label>
                <input
                  type="email"
                  name="email"
                  list="saved-login-emails"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  autoComplete="username"
                  className="w-full px-4 py-3 rounded-xl bg-[#0A0F1C]/80 border border-blue-500/20 text-white outline-none focus:border-blue-400"
                  placeholder="name@gmail.com"
                />
                <datalist id="saved-login-emails">
                  {savedAccounts.map((account) => (
                    <option key={account.email} value={account.email}>
                      {account.name || account.email}
                    </option>
                  ))}
                </datalist>
                {savedAccounts.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {savedAccounts.map((account) => (
                      <button
                        key={account.email}
                        type="button"
                        onClick={() => handleEmailChange(account.email)}
                        className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                          email === account.email
                            ? "border-sky-400 bg-sky-500/10 text-white"
                            : "border-white/10 bg-white/5 text-blue-100/65 hover:border-sky-500/30"
                        }`}
                      >
                        {account.email}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm text-indigo-200/70 ml-1 font-medium">Password</label>
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-xl bg-[#0A0F1C]/80 border border-blue-500/20 text-white outline-none focus:border-blue-400"
                  placeholder="Enter password"
                />
              </div>

              <label className="flex items-center gap-3 text-sm text-indigo-200/70 ml-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="h-4 w-4 rounded border border-blue-400/50 bg-[#0A0F1C] accent-sky-500"
                />
                <span>Remember this sign-in on this device</span>
              </label>

              {rememberDevice && !secureContextAvailable && (
                <p className="text-xs text-amber-300/80 leading-relaxed rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                  Your browser can only save passwords on <strong>localhost</strong> or <strong>HTTPS</strong>. On this current address it will remember the email only.
                </p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="mt-4 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-3 rounded-xl font-bold disabled:opacity-50"
              >
                {loading ? "Authenticating..." : "Sign In"}
              </motion.button>
            </form>

            <div className="mt-8 text-center text-sm text-indigo-200/60 space-y-2 relative z-10">
              {registrationBlocked ? (
                <p className="text-amber-400/70 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs font-medium">
                  New registrations are currently closed by the administrator.
                </p>
              ) : (
                <p>
                  Don't have an account?{" "}
                  <Link to="/signup" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-medium">
                    Create one now
                  </Link>
                </p>
              )}
              <p>
                <Link to="/forgot-password" className="text-indigo-300/70 hover:text-indigo-300 transition-colors">
                  Forgot your password?
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Login;
