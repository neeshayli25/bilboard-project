import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Monitor, PlusCircle, List, Upload, CreditCard, FileText, ChartBar, Bell, User, LogOut, Menu, X, ChevronRight, Sun, Moon
} from "lucide-react";
import { useState, useEffect } from "react";
import { getProfile } from "../../api";

const menuItems = [
  { path: "/advertiser", label: "Dashboard", icon: LayoutDashboard, color: "#6366f1" },
  { path: "/advertiser/billboards", label: "Billboards", icon: Monitor, color: "#0ea5e9" },
  { path: "/advertiser/my-bookings", label: "My Bookings", icon: PlusCircle, color: "#10b981" },
  { path: "/advertiser/upload", label: "Upload Ad", icon: Upload, color: "#f59e0b" },
  { path: "/advertiser/my-ads", label: "My Ads", icon: List, color: "#ec4899" },
  { path: "/advertiser/payments", label: "Payments", icon: CreditCard, color: "#8b5cf6" },
  { path: "/advertiser/invoices", label: "Invoices", icon: FileText, color: "#14b8a6" },
  { path: "/advertiser/reports", label: "Reports", icon: ChartBar, color: "#f97316" },
  { path: "/advertiser/notifications", label: "Notifications", icon: Bell, color: "#f97316" },
  { path: "/advertiser/profile", label: "Profile", icon: User, color: "#64748b" },
];

export default function AdvertiserSidebar({ isOpen, setIsOpen }) {
  const navigate = useNavigate();
  const [advertiserName, setAdvertiserName] = useState("Advertiser");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        setAdvertiserName(res.data.name);
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    };
    fetchProfile();
  }, []);

  // Load saved theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark";
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Apply theme changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  return (
    <div
      className={`fixed top-0 left-0 h-full transition-all duration-300 z-50 flex flex-col`}
      style={{
        width: isOpen ? "260px" : "72px",
        background: "linear-gradient(180deg, #ffffff 0%, #f8faff 100%)",
        borderRight: "1px solid #e8edf5",
        boxShadow: "4px 0 24px rgba(99,102,241,0.06)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4"
        style={{ borderBottom: "1px solid #e8edf5", minHeight: "68px" }}
      >
        {isOpen && (
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 36, height: 36,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              }}
            >
              <Monitor size={18} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b", lineHeight: 1.2 }}>CDBMS</p>
              <p style={{ fontSize: 11, color: "#6366f1", fontWeight: 500, letterSpacing: "0.05em" }}>ADVERTISER</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center rounded-lg transition-all"
          style={{
            width: 36, height: 36,
            background: "#f1f5ff",
            color: "#6366f1",
            border: "1px solid #e0e7ff",
            marginLeft: isOpen ? 0 : "auto",
            marginRight: isOpen ? 0 : "auto",
          }}
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Advertiser Avatar */}
      {isOpen && (
        <div className="mx-4 my-4 p-3 rounded-xl flex items-center gap-3"
          style={{ background: "#f1f5ff", border: "1px solid #e0e7ff" }}>
          <div className="flex items-center justify-center rounded-full"
            style={{ width: 38, height: 38, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
              {advertiserName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div style={{ overflow: "hidden" }}>
            <p style={{ fontWeight: 600, fontSize: 13, color: "#1e1b4b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {advertiserName}
            </p>
            <p style={{ fontSize: 11, color: "#6366f1" }}>Advertiser</p>
          </div>
        </div>
      )}

      {/* Section label */}
      {isOpen && (
        <p style={{ fontSize: 10, fontWeight: 600, color: "#a5b4fc", letterSpacing: "0.1em", padding: "0 20px 8px" }}>
          MAIN MENU
        </p>
      )}

      {/* Nav Items */}
      <nav className="flex flex-col gap-1 px-3 flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/advertiser"}
            className="flex items-center rounded-xl transition-all duration-200 group"
            style={({ isActive }) => ({
              gap: isOpen ? 12 : 0,
              padding: isOpen ? "10px 14px" : "10px 0",
              justifyContent: isOpen ? "flex-start" : "center",
              background: isActive ? `${item.color}15` : "transparent",
              border: isActive ? `1px solid ${item.color}30` : "1px solid transparent",
              color: isActive ? item.color : "#64748b",
              fontWeight: isActive ? 600 : 400,
              textDecoration: "none",
            })}
          >
            {({ isActive }) => (
              <>
                <div
                  className="flex items-center justify-center rounded-lg transition-all"
                  style={{
                    width: 34, height: 34, flexShrink: 0,
                    background: isActive ? `${item.color}20` : "transparent",
                  }}
                >
                  <item.icon size={18} style={{ color: isActive ? item.color : "#94a3b8" }} />
                </div>
                {isOpen && (
                  <>
                    <span style={{ fontSize: 13.5, flex: 1 }}>{item.label}</span>
                    {isActive && <ChevronRight size={14} style={{ color: item.color }} />}
                  </>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom buttons: Dark mode toggle + Logout */}
      <div className="px-3 py-4 space-y-2" style={{ borderTop: "1px solid #e8edf5" }}>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="flex items-center rounded-xl transition-all duration-200 w-full"
          style={{
            gap: isOpen ? 12 : 0,
            padding: isOpen ? "10px 14px" : "10px 0",
            justifyContent: isOpen ? "flex-start" : "center",
            background: "transparent",
            border: "1px solid transparent",
            color: "#64748b",
            cursor: "pointer",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#f1f5ff";
            e.currentTarget.style.border = "1px solid #e0e7ff";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.border = "1px solid transparent";
          }}
        >
          <div className="flex items-center justify-center rounded-lg"
            style={{ width: 34, height: 34, flexShrink: 0, background: "#f1f5ff" }}>
            {darkMode ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#6366f1" />}
          </div>
          {isOpen && <span style={{ fontSize: 13.5, fontWeight: 500 }}>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center rounded-xl transition-all duration-200 w-full"
          style={{
            gap: isOpen ? 12 : 0,
            padding: isOpen ? "10px 14px" : "10px 0",
            justifyContent: isOpen ? "flex-start" : "center",
            background: "transparent",
            border: "1px solid transparent",
            color: "#ef4444",
            cursor: "pointer",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#fef2f2";
            e.currentTarget.style.border = "1px solid #fecaca";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.border = "1px solid transparent";
          }}
        >
          <div className="flex items-center justify-center rounded-lg"
            style={{ width: 34, height: 34, flexShrink: 0, background: "#fef2f2" }}>
            <LogOut size={18} color="#ef4444" />
          </div>
          {isOpen && <span style={{ fontSize: 13.5, fontWeight: 500 }}>Logout</span>}
        </button>
      </div>
    </div>
  );
}