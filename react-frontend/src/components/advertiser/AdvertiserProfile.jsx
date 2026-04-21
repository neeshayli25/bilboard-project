import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Phone, Building, Lock, Save, AlertCircle, CheckCircle, Shield, Key } from "lucide-react";
import { getProfile, updateProfile, changePassword } from "../../api";

export default function AdvertiserProfile() {
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", organization: "" });
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await getProfile();
      setProfile({
        name: res.data.name || "",
        email: res.data.email || "",
        phone: res.data.phone || "",
        organization: res.data.organization || "",
      });
    } catch (err) {
      setMessage({ text: "Failed to load profile", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });
    try {
      await updateProfile({ name: profile.name, email: profile.email, phone: profile.phone, organization: profile.organization });
      setMessage({ text: "Profile updated successfully!", type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    } catch (err) {
      setMessage({ text: err.response?.data?.message || "Update failed", type: "error" });
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });
    if (passwords.new !== passwords.confirm) {
      setMessage({ text: "New passwords do not match", type: "error" });
      return;
    }
    if (passwords.new.length < 6) {
      setMessage({ text: "Password must be at least 6 characters", type: "error" });
      return;
    }
    try {
      await changePassword({ currentPassword: passwords.current, newPassword: passwords.new });
      setMessage({ text: "Password changed successfully!", type: "success" });
      setPasswords({ current: "", new: "", confirm: "" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    } catch (err) {
      setMessage({ text: err.response?.data?.message || "Password change failed", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-indigo-400 font-bold">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-16">
      <div className="mb-2">
        <h1 className="text-3xl font-black text-white mb-2">My Profile</h1>
        <p className="text-indigo-200/60 text-sm">Manage your account information and secure your access.</p>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`flex items-center gap-3 p-4 rounded-2xl border backdrop-blur-md ${
              message.type === "success" 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                : "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
            }`}
          >
            {message.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="font-bold text-sm tracking-wide">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Profile Info Form */}
        <div className="lg:col-span-3 bg-[#131A2A]/80 backdrop-blur-md rounded-3xl p-8 border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.3)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <User size={24} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Personal Info</h2>
              <p className="text-xs text-indigo-200/50">Update your contact and public details</p>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div>
              <label className="block text-xs font-black text-white/50 uppercase tracking-widest mb-2">Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={16} className="text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full bg-[#0A0F1C]/80 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all outline-none" required />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-black text-white/50 uppercase tracking-widest mb-2">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={16} className="text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full bg-[#0A0F1C]/80 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all outline-none" required />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-black text-white/50 uppercase tracking-widest mb-2">Phone Number</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone size={16} className="text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full bg-[#0A0F1C]/80 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all outline-none" />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-black text-white/50 uppercase tracking-widest mb-2">Organization</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Building size={16} className="text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input type="text" value={profile.organization} onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
                  className="w-full bg-[#0A0F1C]/80 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all outline-none" />
              </div>
            </div>

            <div className="md:col-span-2 mt-4">
              <motion.button whileTap={{ scale: 0.97 }} type="submit"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-[0_0_30px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                <Save size={16} /> Save Changes
              </motion.button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="lg:col-span-2 bg-[#131A2A]/80 backdrop-blur-md rounded-3xl p-8 border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.3)] relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-purple-600/10 blur-[60px] rounded-full pointer-events-none" />

          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <Shield size={24} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Security</h2>
              <p className="text-xs text-indigo-200/50">Update your password</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-6 relative z-10">
            <div>
              <label className="block text-xs font-black text-white/50 uppercase tracking-widest mb-2">Current Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={16} className="text-white/30 group-focus-within:text-purple-400 transition-colors" />
                </div>
                <input type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  className="w-full bg-[#0A0F1C]/80 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/5 transition-all outline-none" required />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-black text-white/50 uppercase tracking-widest mb-2">New Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Key size={16} className="text-white/30 group-focus-within:text-purple-400 transition-colors" />
                </div>
                <input type="password" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  className="w-full bg-[#0A0F1C]/80 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/5 transition-all outline-none" required minLength={6} />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-black text-white/50 uppercase tracking-widest mb-2">Confirm Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Key size={16} className="text-white/30 group-focus-within:text-purple-400 transition-colors" />
                </div>
                <input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  className="w-full bg-[#0A0F1C]/80 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/5 transition-all outline-none" required />
              </div>
            </div>

            <div className="pt-2">
              <motion.button whileTap={{ scale: 0.97 }} type="submit"
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all">
                <Lock size={16} /> Update Password
              </motion.button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}