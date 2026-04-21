import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileImage,
  Mail,
  Search,
  User,
  Users,
} from "lucide-react";
import { getUsers } from "../../services/adminApi";

const MEDIA_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/api$/, "");

function buildMediaUrl(url = "") {
  if (!url) return "";
  return url.startsWith("http") ? url : `${MEDIA_BASE_URL}${url}`;
}

function formatPkr(value) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

export default function AdminUsers() {
  const [advertisers, setAdvertisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [verificationFilter, setVerificationFilter] = useState("verified");

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const res = await getUsers();
        const onlyAdvertisers = (res.data || [])
          .filter((user) => user.role === "advertiser")
          .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
        setAdvertisers(onlyAdvertisers);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const verifiedAdvertisers = advertisers.filter((user) => user.isEmailVerified);
  const pendingAdvertisers = advertisers.filter((user) => !user.isEmailVerified);

  const summary = useMemo(
    () => ({
      verifiedRevenue: advertisers.reduce((sum, user) => sum + (Number(user.totalSpent) || 0), 0),
      totalAds: advertisers.reduce((sum, user) => sum + (Number(user.adCount) || 0), 0),
      totalBookings: advertisers.reduce((sum, user) => sum + (Number(user.bookingCount) || 0), 0),
    }),
    [advertisers]
  );

  const filtered = advertisers.filter((user) => {
    const matchesSearch =
      (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVerification =
      verificationFilter === "all" ||
      (verificationFilter === "verified" && user.isEmailVerified) ||
      (verificationFilter === "pending" && !user.isEmailVerified);

    return matchesSearch && matchesVerification;
  });

  const toggleExpand = (id) => setExpandedId((current) => (current === id ? null : id));

  return (
    <div className="flex flex-col gap-6 h-full bg-darkBg text-textMain relative pb-16 min-h-screen">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute w-[500px] h-[500px] bg-emerald-600 opacity-5 blur-[120px] top-20 right-10 rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-black text-white flex items-center gap-3">
              <Users className="text-emerald-500" /> Advertiser Registry
            </h1>
            <p className="text-blue-100/60 mt-1">
              Real advertiser activity now reflects uploaded creatives, booked slots, scheduled campaigns, and verified payments.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#131A2A]/80 border border-emerald-500/20 rounded-xl px-5 py-3 text-center">
              <p className="text-[10px] text-emerald-200/50 uppercase tracking-widest mb-1 font-bold">Verified</p>
              <p className="text-lg font-black text-emerald-400">{verifiedAdvertisers.length}</p>
            </div>
            <div className="bg-[#131A2A]/80 border border-amber-500/20 rounded-xl px-5 py-3 text-center">
              <p className="text-[10px] text-amber-200/50 uppercase tracking-widest mb-1 font-bold">
                Pending Verification
              </p>
              <p className="text-lg font-black text-amber-400">{pendingAdvertisers.length}</p>
            </div>
            <div className="bg-[#131A2A]/80 border border-cyan-500/20 rounded-xl px-5 py-3 text-center">
              <p className="text-[10px] text-cyan-200/50 uppercase tracking-widest mb-1 font-bold">Booked Slots</p>
              <p className="text-lg font-black text-cyan-400">{summary.totalBookings}</p>
            </div>
            <div className="bg-[#131A2A]/80 border border-blue-500/20 rounded-xl px-5 py-3 text-center">
              <p className="text-[10px] text-blue-200/50 uppercase tracking-widest mb-1 font-bold">Paid</p>
              <p className="text-lg font-black text-blue-300">{formatPkr(summary.verifiedRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="relative mb-6 max-w-xl">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full bg-[#131A2A]/80 border border-blue-500/20 text-white rounded-2xl py-4 pl-14 pr-4 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
          <Search size={20} className="absolute left-5 top-4 text-blue-500/50" />
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {[
            { id: "verified", label: "Verified Accounts" },
            { id: "pending", label: "Pending Verification" },
            { id: "all", label: "All Advertisers" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setVerificationFilter(option.id)}
              className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                verificationFilter === option.id
                  ? option.id === "pending"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                  : "bg-white/5 text-blue-100/55 border border-white/10 hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 text-emerald-400 animate-pulse font-bold text-xl">
            Loading Advertiser Registry...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 bg-[#131A2A]/40 border border-white/5 border-dashed rounded-3xl">
            <Users size={48} className="text-white/10 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {verificationFilter === "pending"
                ? "No Pending Signups"
                : verificationFilter === "verified"
                ? "No Verified Advertisers Yet"
                : "No Advertisers Yet"}
            </h3>
            <p className="text-blue-200/50 text-center max-w-sm">
              {verificationFilter === "pending"
                ? "Unverified signups will appear here until they confirm their email."
                : verificationFilter === "verified"
                ? "Once advertisers verify their email, they will appear in this active registry."
                : "When users sign up as advertisers, their profiles will appear here with their current verification state."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((user, index) => (
              <motion.div
                key={user._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#131A2A]/80 backdrop-blur-md border border-white/5 hover:border-emerald-500/30 transition-all duration-300 rounded-3xl overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full flex flex-col md:flex-row items-start md:items-center gap-5 p-6 cursor-pointer group text-left"
                  onClick={() => toggleExpand(user._id)}
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
                    <span className="text-white font-black text-xl">{(user.name || "?")[0].toUpperCase()}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {user.name}
                    </h3>
                    <p className="text-sm text-blue-200/50 flex items-center gap-1.5 mt-0.5">
                      <Mail size={12} className="text-primary" /> {user.email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                          user.isEmailVerified
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                            : "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                        }`}
                      >
                        {user.isEmailVerified ? "Verified" : "Pending Verification"}
                      </span>
                      {!user.isActive && (
                        <span className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/20 text-red-300">
                          Disabled
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mr-4">
                    <div className="bg-[#0A0F1C] border border-white/5 rounded-xl px-4 py-2 text-center">
                      <p className="text-[9px] uppercase tracking-widest text-blue-200/40 font-bold mb-0.5">
                        Displayed Ads
                      </p>
                      <p className="text-base font-black text-white">{user.adCount ?? 0}</p>
                    </div>
                    <div className="bg-[#0A0F1C] border border-white/5 rounded-xl px-4 py-2 text-center">
                      <p className="text-[9px] uppercase tracking-widest text-blue-200/40 font-bold mb-0.5">
                        Booked Slots
                      </p>
                      <p className="text-base font-black text-white">{user.bookingCount ?? 0}</p>
                    </div>
                    <div className="bg-[#0A0F1C] border border-white/5 rounded-xl px-4 py-2 text-center">
                      <p className="text-[9px] uppercase tracking-widest text-blue-200/40 font-bold mb-0.5">
                        Scheduled
                      </p>
                      <p className="text-base font-black text-emerald-300">{user.scheduledCount ?? 0}</p>
                    </div>
                    <div className="bg-[#0A0F1C] border border-white/5 rounded-xl px-4 py-2 text-center">
                      <p className="text-[9px] uppercase tracking-widest text-blue-200/40 font-bold mb-0.5">Paid</p>
                      <p className="text-base font-black text-cyan-400">{formatPkr(user.totalSpent ?? 0)}</p>
                    </div>
                  </div>

                  <div className="text-blue-400/50 group-hover:text-blue-400 transition-colors flex-shrink-0">
                    {expandedId === user._id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                <AnimatePresence>
                  {expandedId === user._id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden border-t border-white/5"
                    >
                      <div className="p-6 bg-[#0A0F1C]/50 grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="flex flex-col gap-3">
                          <p className="text-xs font-black text-blue-200/40 uppercase tracking-widest mb-1">
                            Account Details
                          </p>
                          <div className="flex flex-col gap-2 text-sm">
                            <div className="flex items-center gap-2 text-blue-100/70">
                              <User size={14} className="text-primary flex-shrink-0" /> {user.name}
                            </div>
                            <div className="flex items-center gap-2 text-blue-100/70">
                              <Mail size={14} className="text-primary flex-shrink-0" /> {user.email}
                            </div>
                            <div className="flex items-center gap-2 text-blue-100/70">
                              <Calendar size={14} className="text-primary flex-shrink-0" /> Joined{" "}
                              {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                Advertiser
                              </span>
                              <span
                                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                  user.isEmailVerified
                                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                                    : "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                                }`}
                              >
                                {user.isEmailVerified ? "Email Verified" : "Email Pending"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          <p className="text-xs font-black text-blue-200/40 uppercase tracking-widest mb-1">Recent Ads</p>
                          {(user.ads || []).length === 0 ? (
                            <p className="text-sm text-blue-200/30 italic">No ads submitted yet.</p>
                          ) : (
                            <div className="flex flex-col gap-3">
                              {(user.ads || []).slice(0, 3).map((ad) => (
                                <div
                                  key={ad._id}
                                  className="flex items-center gap-3 bg-[#131A2A] border border-white/5 rounded-xl p-3"
                                >
                                  <div className="h-14 w-14 overflow-hidden rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                                    {ad.mediaUrl ? (
                                      ad.mediaType === "video" ? (
                                        <video
                                          src={buildMediaUrl(ad.mediaUrl)}
                                          className="h-full w-full object-cover"
                                          muted
                                          autoPlay
                                          loop
                                          playsInline
                                        />
                                      ) : (
                                        <img src={buildMediaUrl(ad.mediaUrl)} alt={ad.title} className="h-full w-full object-cover" />
                                      )
                                    ) : (
                                      <FileImage size={14} className="text-amber-400 flex-shrink-0" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{ad.title}</p>
                                    <span
                                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                        ad.approvalStatus === "approved"
                                          ? "bg-emerald-500/10 text-emerald-400"
                                          : ad.approvalStatus === "rejected"
                                          ? "bg-red-500/10 text-red-400"
                                          : "bg-amber-500/10 text-amber-400"
                                      }`}
                                    >
                                      {ad.approvalStatus}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-3">
                          <p className="text-xs font-black text-blue-200/40 uppercase tracking-widest mb-1">
                            Payment Activity
                          </p>
                          {(user.payments || []).length === 0 ? (
                            <p className="text-sm text-blue-200/30 italic">No payments yet.</p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {(user.payments || []).slice(0, 3).map((payment) => (
                                <div
                                  key={payment._id}
                                  className="flex justify-between items-center bg-[#131A2A] border border-white/5 rounded-xl p-3 text-sm"
                                >
                                  <div>
                                    <div className="flex items-center gap-2 text-blue-100/70">
                                      <CreditCard size={13} className="text-cyan-400" />
                                      {payment.description || "Booking payment"}
                                    </div>
                                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-blue-100/35">
                                      {payment.status === "completed" ? "verified" : payment.status}
                                    </p>
                                  </div>
                                  <span className="text-cyan-400 font-bold">{formatPkr(payment.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
