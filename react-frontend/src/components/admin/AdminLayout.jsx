import { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Bell, Calendar, CreditCard, Image, X } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import {
  getNotifications,
  markNotificationRead,
} from "../../services/adminApi";
import {
  emitNotificationUpdate,
  subscribeToNotificationUpdates,
} from "../../utils/notificationEvents";

function resolveAdminPath(notification) {
  if (notification.type === "payment" || notification.type === "booking") {
    return "/admin/bookings";
  }

  if (notification.type === "approval") {
    return "/admin/billboards";
  }

  return "/admin/notifications";
}

function TopBar({ sidebarOpen }) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState([]);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await getNotifications();
      const notifications = (Array.isArray(res.data) ? res.data : [])
        .filter((notification) => !notification.isRead)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6)
        .map((notification) => ({
          ...notification,
          action: resolveAdminPath(notification),
        }));

      setUnreadNotifs(notifications);
    } catch (error) {
      console.error(error);
      setUnreadNotifs([]);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    const unsubscribe = subscribeToNotificationUpdates("admin", loadNotifications);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [loadNotifications]);

  const handleOpenNotification = async (notification) => {
    try {
      if (!notification.isRead) {
        await markNotificationRead(notification._id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setUnreadNotifs((current) => current.filter((item) => item._id !== notification._id));
      emitNotificationUpdate("admin");
      navigate(notification.action);
      setShowDropdown(false);
    }
  };

  const ICONS = {
    approval: { Icon: Image, color: "#f59e0b" },
    booking: { Icon: Calendar, color: "#8b5cf6" },
    payment: { Icon: CreditCard, color: "#06b6d4" },
    default: { Icon: Bell, color: "#3b82f6" },
  };

  return (
    <div
      className="fixed top-0 right-0 z-40 flex items-center justify-end px-6 py-3 bg-[#0A0F1C]/95 backdrop-blur-xl border-b border-white/5"
      style={{ left: sidebarOpen ? "280px" : "88px", transition: "left 0.3s" }}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDropdown((current) => !current)}
          className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-blue-300 hover:text-white transition-all"
        >
          <Bell size={18} />
          {unreadNotifs.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
              {unreadNotifs.length > 9 ? "9+" : unreadNotifs.length}
            </span>
          )}
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-14 w-96 bg-[#131A2A] border border-blue-500/20 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] overflow-hidden z-50">
            <div className="flex justify-between items-center px-5 py-4 border-b border-white/5">
              <div>
                <p className="text-sm font-bold text-white">Notifications</p>
                <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">
                  {unreadNotifs.length} unread alert{unreadNotifs.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigate("/admin/notifications");
                    setShowDropdown(false);
                  }}
                  className="text-[10px] font-bold text-blue-400 hover:text-white transition-colors uppercase tracking-widest"
                >
                  View All
                </button>
                <button
                  type="button"
                  onClick={() => setShowDropdown(false)}
                  className="text-white/30 hover:text-white p-1"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {unreadNotifs.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-blue-200/30">
                  <Bell size={32} className="mb-2 opacity-30" />
                  <p className="text-sm font-medium">All clear - no new alerts</p>
                </div>
              ) : (
                unreadNotifs.map((notification) => {
                  const cfg = ICONS[notification.type] || ICONS.default;
                  const Icon = cfg.Icon;

                  return (
                    <button
                      key={notification._id}
                      type="button"
                      onClick={() => handleOpenNotification(notification)}
                      className="w-full flex gap-4 items-start px-5 py-4 border-b border-white/5 hover:bg-white/5 transition-colors last:border-0 text-left"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${cfg.color}20` }}
                      >
                        <Icon size={16} style={{ color: cfg.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white mb-0.5">{notification.title}</p>
                        <p className="text-xs text-blue-200/50 leading-relaxed line-clamp-2">{notification.message}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-darkBg text-textMain">
      <AdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div
        className="flex-1 flex flex-col transition-all duration-300 overflow-hidden"
        style={{ marginLeft: sidebarOpen ? "280px" : "88px" }}
      >
        <TopBar sidebarOpen={sidebarOpen} />
        <div className="flex-1 overflow-y-auto p-6 pt-20">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
