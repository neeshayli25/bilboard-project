import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Monitor, Calendar,
  CreditCard, FileText, Bell, User, LogOut,
  Menu, X, ChevronRight, Sparkles, Settings
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getProfile } from "../../api";

const MENU_ITEMS = [
  { path: "/advertiser",              label: "Dashboard",    icon: LayoutDashboard, color: "#6366f1", end: true },
  { path: "/advertiser/create-ad",    label: "Create Ad",    icon: FileText,        color: "#f59e0b" },
  { path: "/advertiser/create-booking", label: "Create Booking", icon: Calendar,    color: "#38bdf8" },
  { path: "/advertiser/billboards",   label: "Billboards",   icon: Monitor,         color: "#0ea5e9" },
  { path: "/advertiser/my-bookings",  label: "My Bookings",  icon: Calendar,        color: "#10b981" },
  { path: "/advertiser/payments",     label: "Payments",     icon: CreditCard,      color: "#8b5cf6" },
  { path: "/advertiser/invoices",     label: "Invoices",     icon: FileText,        color: "#14b8a6" },
  { path: "/advertiser/notifications",label: "Notifications",icon: Bell,            color: "#f97316" },
  { path: "/advertiser/profile",      label: "Profile",      icon: User,            color: "#94a3b8" },
  { path: "/advertiser/settings",     label: "Settings",     icon: Settings,        color: "#64748b" },
];


const SIDEBAR_W  = 280;
const COLLAPSED_W = 88;

export default function AdvertiserSidebar({ isOpen, setIsOpen }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const [name, setName] = useState("Advertiser");
  const [email, setEmail] = useState("");

  useEffect(() => {
    getProfile()
      .then(r => { setName(r.data.name || "Advertiser"); setEmail(r.data.email || ""); })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div
      animate={{ width: isOpen ? SIDEBAR_W : COLLAPSED_W }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed top-0 left-0 h-full z-50 flex flex-col overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0D1525 0%, #0A0F1C 100%)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "4px 0 30px rgba(0,0,0,0.4)",
      }}
    >
      {/* ── Logo / Toggle ─────────────────────────────── */}
      <div className="flex items-center justify-between px-4 border-b border-white/5 flex-shrink-0" style={{ height: 72 }}>
        <AnimatePresence>
          {isOpen && (
            <motion.div initial={{ opacity: 0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-10 }} transition={{ duration:0.2 }}
              className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                <Sparkles size={18} color="#fff" />
              </div>
              <div>
                <p className="text-[15px] font-black text-white leading-tight">CDBMS</p>
                <p className="text-[10px] font-bold tracking-[0.2em] text-indigo-400">ADVERTISER</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 flex-shrink-0"
          style={{ marginLeft: isOpen ? 0 : "auto", marginRight: isOpen ? 0 : "auto" }}
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* ── User Card ─────────────────────────────────── */}
      <button 
        onClick={() => navigate("/advertiser/profile")}
        className={`w-[stretch] text-left mx-3 my-3 rounded-2xl overflow-hidden flex-shrink-0 transition-all duration-300 hover:bg-white/5 cursor-pointer ${isOpen ? "p-4" : "p-2"}`}
        style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}>
        <div className={`flex items-center ${isOpen ? "gap-3" : "justify-center"}`}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-white text-sm"
            style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
            {initials}
          </div>
          <AnimatePresence>
            {isOpen && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{name}</p>
                <p className="text-[10px] text-indigo-300/70 font-medium truncate">{email || "Advertiser Account"}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>

      {/* ── Section Label ─────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="px-5 pb-2 text-[10px] font-black text-white/20 uppercase tracking-[0.18em]">
            Main Menu
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Nav Items ─────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 flex flex-col gap-1" style={{ scrollbarWidth: "none" }}>
        {MENU_ITEMS.map(item => {
          const isActive = item.end
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <NavLink key={item.path} to={item.path} end={item.end}
              className="flex items-center rounded-2xl transition-all duration-200 group relative"
              style={{
                gap: isOpen ? 12 : 0,
                padding: isOpen ? "11px 14px" : "11px 0",
                justifyContent: isOpen ? "flex-start" : "center",
                background: isActive ? `${item.color}18` : "transparent",
                border: isActive ? `1px solid ${item.color}35` : "1px solid transparent",
                textDecoration: "none",
              }}
            >
              {/* Active left bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                  style={{ backgroundColor: item.color }} />
              )}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                style={{ background: isActive ? `${item.color}25` : "transparent" }}>
                <Icon size={18} style={{ color: isActive ? item.color : "#475569" }} />
              </div>
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                    className="flex items-center flex-1 min-w-0">
                    <span className="text-[13.5px] font-semibold flex-1"
                      style={{ color: isActive ? "#fff" : "#64748b" }}>
                      {item.label}
                    </span>
                    {isActive && <ChevronRight size={14} style={{ color: item.color }} />}
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Tooltip when collapsed */}
              {!isOpen && (
                <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl text-xs font-bold text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap"
                  style={{ background: "#131A2A", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Bottom Logout ──────────────────────────────── */}
      <div className="px-3 py-4 border-t border-white/5 flex-shrink-0">
        <button onClick={handleLogout}
          className="flex items-center w-full rounded-2xl transition-all duration-200 group relative"
          style={{
            gap: isOpen ? 12 : 0,
            padding: isOpen ? "11px 14px" : "11px 0",
            justifyContent: isOpen ? "flex-start" : "center",
            background: "transparent",
            border: "1px solid transparent",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.border = "1px solid rgba(239,68,68,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.border = "1px solid transparent"; }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-500/10">
            <LogOut size={18} className="text-red-400" />
          </div>
          <AnimatePresence>
            {isOpen && (
              <motion.span initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                className="text-[13.5px] font-semibold text-red-400">
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
          {!isOpen && (
            <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl text-xs font-bold text-red-400 opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap"
              style={{ background: "#131A2A", border: "1px solid rgba(239,68,68,0.2)" }}>
              Sign Out
            </div>
          )}
        </button>
      </div>
    </motion.div>
  );
}
