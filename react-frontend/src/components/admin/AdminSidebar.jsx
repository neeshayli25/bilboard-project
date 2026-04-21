import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Monitor, Users, Calendar,
  CreditCard, Bell, FileText, Settings, LogOut, Menu, X,
  ChevronRight, Sparkles
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getProfile } from "../../api"; // adjust path

const menuItems = [
  { path: "/admin",            label: "Dashboard",    icon: LayoutDashboard, color: "#3b82f6" }, // blue
  { path: "/admin/bookings",   label: "Bookings",     icon: Calendar,        color: "#22c55e" }, // green
  { path: "/admin/billboards", label: "Operational Assets", icon: Monitor,    color: "#8b5cf6" }, // purple
  { path: "/admin/users",      label: "Users",        icon: Users,           color: "#10b981" }, // emerald
  { path: "/admin/schedule",   label: "Schedule",     icon: Calendar,        color: "#ec4899" }, // pink
  { path: "/admin/payments",   label: "Payments",     icon: CreditCard,      color: "#06b6d4" }, // cyan
  { path: "/admin/notifications", label: "Notifications", icon: Bell,        color: "#f97316" }, // orange
  { path: "/admin/reports",    label: "Reports",      icon: FileText,        color: "#84cc16" }, // lime
  { path: "/admin/settings",   label: "Settings",     icon: Settings,        color: "#94a3b8" }, // slate
];

export default function AdminSidebar({ isOpen, setIsOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminName, setAdminName] = useState("Admin");
  const [adminRole, setAdminRole] = useState("");

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const res = await getProfile();
        setAdminName(res.data.name);
        setAdminRole(res.data.role);
      } catch (err) {
        console.error("Failed to load admin profile", err);
      }
    };
    fetchAdminProfile();
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("userName");
    navigate("/login", { replace: true });
  };

  return (
    <motion.div
      initial={{ width: 280 }}
      animate={{ width: isOpen ? 280 : 88 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-0 left-0 h-full z-50 flex flex-col bg-[#0A0F1C]/95 backdrop-blur-xl border-r border-blue-500/10 shadow-[20px_0_60px_rgba(0,0,0,0.5)] overflow-hidden"
    >
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute w-64 h-64 bg-blue-600/10 blur-[80px] top-[-50px] left-[-50px] rounded-full mix-blend-screen"></div>
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Header Module */}
        <div className="flex items-center justify-between p-6 h-[90px]">
          <AnimatePresence>
            {isOpen && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 overflow-hidden whitespace-nowrap"
              >
                <div className="relative flex items-center justify-center rounded-xl w-10 h-10 bg-gradient-to-br from-primary to-purple-600 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                  <Sparkles size={20} className="text-white" />
                  <div className="absolute inset-0 bg-white/20 rounded-xl mix-blend-overlay"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-black tracking-wide text-white drop-shadow-md">CDBMS</span>
                  <span className="text-[10px] font-bold text-blue-400 tracking-[0.2em] uppercase leading-none mt-1">Command Center</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-blue-300 hover:text-white transition-all shadow-inner group"
            style={{ marginLeft: isOpen ? "auto" : "0" }}
          >
            {isOpen ? <X size={20} className="group-hover:rotate-90 transition-transform duration-300"/> : <Menu size={20} className="group-hover:scale-110 transition-transform duration-300"/>}
          </button>
        </div>

        {/* Admin Profile Plaque */}
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, height: 0, margin: 0 }}
              className="mx-6 mb-6 p-3 rounded-2xl flex items-center gap-4 bg-[#131A2A]/80 border border-blue-500/20 shadow-inner group cursor-pointer hover:border-blue-500/40 transition-colors"
              onClick={() => navigate("/admin/profile")}
            >
              <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex-shrink-0 shadow-lg">
                <span className="text-white font-black text-lg shadow-black drop-shadow-md">
                  {adminName.charAt(0).toUpperCase()}
                </span>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#131A2A] rounded-full animate-pulse"></div>
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-white text-sm truncate group-hover:text-blue-200 transition-colors">{adminName}</span>
                <span className="text-xs font-medium text-blue-400/60 capitalize tracking-wide">{adminRole === "admin" ? "Super Admin" : "Administrator"}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section label */}
        <AnimatePresence>
          {isOpen && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-7 mb-2">
               <span className="text-[10px] font-black text-blue-500/50 uppercase tracking-widest block">Main Navigation</span>
             </motion.div>
          )}
        </AnimatePresence>

        {/* Nav Link Scroller */}
        <nav className="flex flex-col flex-1 px-4 overflow-y-auto custom-scrollbar gap-1.5 pb-4">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`relative flex items-center rounded-2xl transition-all duration-300 group overflow-hidden ${isOpen ? 'px-3 py-3' : 'justify-center p-3 mx-auto w-12'}`}
                style={{
                  background: isActive ? `${item.color}15` : "transparent",
                }}
              >
                {/* Hover / Active Indicator Backgrounds */}
                <div className={`absolute inset-0 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-10'}`} style={{ backgroundColor: item.color }}></div>
                {isActive && (
                   <motion.div layoutId="activeNavIndicator" className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full" style={{ backgroundColor: item.color }}></motion.div>
                )}
                
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 shadow-inner flex-shrink-0 z-10 ${isActive ? 'scale-110 shadow-lg' : 'group-hover:scale-110 bg-white/5'}`}
                     style={{
                       backgroundColor: isActive ? item.color : '',
                       color: isActive ? '#fff' : item.color
                     }}>
                  <item.icon size={20} />
                </div>
                
                <AnimatePresence>
                  {isOpen && (
                    <motion.div 
                      className="ml-4 flex-1 flex items-center justify-between z-10 whitespace-nowrap"
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }}
                    >
                      <span className={`font-bold text-sm tracking-wide transition-colors ${isActive ? 'text-white' : 'text-blue-100/60 group-hover:text-white'}`}>{item.label}</span>
                      {isActive && <ChevronRight size={16} className="text-white/50" />}
                    </motion.div>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </nav>

        {/* Global Action Footer */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <button
            onClick={handleLogout}
            className={`flex items-center rounded-2xl transition-all duration-300 group w-full bg-red-500/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 ${isOpen ? 'px-3 py-3 gap-4' : 'justify-center p-3'}`}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all shadow-inner group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] flex-shrink-0">
              <LogOut size={20} />
            </div>
            {isOpen && (
               <span className="font-bold text-red-500 group-hover:text-red-400 text-sm whitespace-nowrap">Terminate Session</span>
            )}
          </button>
        </div>

      </div>
    </motion.div>
  );
}
