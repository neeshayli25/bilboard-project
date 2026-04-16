import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Monitor, CheckSquare, Users, Calendar,
  CreditCard, Bell, FileText, Settings, LogOut, Menu, X,
  ChevronRight
} from "lucide-react";
import { useState, useEffect } from "react";
import { getProfile } from "../../api"; // adjust path

const menuItems = [
  { path: "/admin",            label: "Dashboard",    icon: LayoutDashboard, color: "#6366f1" },
  { path: "/admin/billboards", label: "Billboards",   icon: Monitor,         color: "#0ea5e9" },
  { path: "/admin/approvals",  label: "Ad Approvals", icon: CheckSquare,     color: "#f59e0b" },
  { path: "/admin/users",      label: "Users",        icon: Users,           color: "#10b981" },
  { path: "/admin/schedule",   label: "Schedule",     icon: Calendar,        color: "#8b5cf6" },
  { path: "/admin/payments",   label: "Payments",     icon: CreditCard,      color: "#ec4899" },
  { path: "/admin/notifications", label: "Notifications", icon: Bell,        color: "#f97316" },
  { path: "/admin/reports",    label: "Reports",      icon: FileText,        color: "#14b8a6" },
  { path: "/admin/settings",   label: "Settings",     icon: Settings,        color: "#64748b" },
];

export default function AdminSidebar({ isOpen, setIsOpen }) {
  const navigate = useNavigate();
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
              <p style={{ fontSize: 11, color: "#6366f1", fontWeight: 500, letterSpacing: "0.05em" }}>ADMIN PANEL</p>
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

      {/* Admin Avatar */}
      {isOpen && (
        <div className="mx-4 my-4 p-3 rounded-xl flex items-center gap-3"
          style={{ background: "#f1f5ff", border: "1px solid #e0e7ff" }}>
          <div className="flex items-center justify-center rounded-full"
            style={{ width: 38, height: 38, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
              {adminName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div style={{ overflow: "hidden" }}>
            <p style={{ fontWeight: 600, fontSize: 13, color: "#1e1b4b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {adminName}
            </p>
            <p style={{ fontSize: 11, color: "#6366f1" }}>{adminRole === "admin" ? "Super Admin" : "Admin"}</p>
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
            end={item.path === "/admin"}
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

      {/* Logout */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid #e8edf5" }}>
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