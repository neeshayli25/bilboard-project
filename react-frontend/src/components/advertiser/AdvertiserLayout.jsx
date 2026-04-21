import { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Bell, Calendar, CheckSquare, CreditCard, X } from "lucide-react";
import AdvertiserSidebar from "./AdvertiserSidebar";
import {
  getAdvertiserNotifications,
  markAdvertiserNotificationRead,
} from "../../services/adminApi";
import {
  emitNotificationUpdate,
  subscribeToNotificationUpdates,
} from "../../utils/notificationEvents";

function resolveNotificationVisual(notification) {
  if (notification.type === "payment") {
    return {
      color: "#6366f1",
      Icon: CreditCard,
    };
  }

  if (notification.type === "booking" || notification.type === "approval") {
    return {
      color: "#10b981",
      Icon: CheckSquare,
    };
  }

  return {
    color: "#f59e0b",
    Icon: Calendar,
  };
}

function resolveNotificationPath(notification) {
  const relatedId = notification?.relatedId ? String(notification.relatedId) : "";
  const content = `${notification?.title || ""} ${notification?.message || ""}`.toLowerCase();
  const needsPaymentAction =
    content.includes("payment required") ||
    content.includes("complete payment") ||
    content.includes("pay now") ||
    (content.includes("approved") && !content.includes("paid"));

  if (relatedId) {
    const params = new URLSearchParams({ booking: relatedId });
    if (needsPaymentAction) {
      params.set("action", "pay");
    }
    return `/advertiser/my-bookings?${params.toString()}`;
  }

  if (notification?.type === "payment") {
    return "/advertiser/payments";
  }

  if (notification?.type === "booking" || notification?.type === "approval") {
    return "/advertiser/my-bookings";
  }

  return "/advertiser/notifications";
}

function AdvertiserTopBar({ sidebarOpen }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await getAdvertiserNotifications();
      const items = (Array.isArray(res.data) ? res.data : [])
        .filter((notification) => !notification.isRead)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6)
        .map((notification) => ({
          ...notification,
          ...resolveNotificationVisual(notification),
          path: resolveNotificationPath(notification),
        }));
      setAlerts(items);
    } catch {
      setAlerts([]);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const intervalId = setInterval(loadNotifications, 30000);
    const unsubscribe = subscribeToNotificationUpdates("advertiser", loadNotifications);

    return () => {
      clearInterval(intervalId);
      unsubscribe();
    };
  }, [loadNotifications]);

  const handleOpenNotification = async (notification) => {
    try {
      if (!notification.isRead) {
        await markAdvertiserNotificationRead(notification._id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAlerts((current) => current.filter((item) => item._id !== notification._id));
      emitNotificationUpdate("advertiser");
      navigate(notification.path);
      setOpen(false);
    }
  };

  return (
    <div
      className="fixed top-0 right-0 z-40 flex items-center justify-end px-6 py-3 border-b border-white/5"
      style={{
        left: sidebarOpen ? "280px" : "88px",
        transition: "left 0.3s",
        background: "rgba(10,15,28,0.95)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-indigo-300 hover:text-white transition-all"
        >
          <Bell size={18} />
          {alerts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
              {alerts.length > 9 ? "9+" : alerts.length}
            </span>
          )}
        </button>

        {open && (
          <div
            className="absolute right-0 top-14 w-96 rounded-2xl overflow-hidden z-50 shadow-[0_0_60px_rgba(0,0,0,0.6)]"
            style={{ background: "#131A2A", border: "1px solid rgba(99,102,241,0.2)" }}
          >
            <div className="flex justify-between items-center px-5 py-4 border-b border-white/5">
              <div>
                <p className="text-sm font-bold text-white">Notifications</p>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">
                  {alerts.length} unread alert{alerts.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigate("/advertiser/notifications");
                    setOpen(false);
                  }}
                  className="text-[10px] font-bold text-indigo-400 hover:text-white transition-colors uppercase tracking-widest"
                >
                  View All
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-white/30 hover:text-white p-1"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-indigo-200/30">
                  <Bell size={28} className="mb-2 opacity-30" />
                  <p className="text-sm">All clear, no new alerts</p>
                </div>
              ) : (
                alerts.map((notification) => {
                  const Icon = notification.Icon;
                  return (
                    <button
                      key={notification._id}
                      type="button"
                      onClick={() => handleOpenNotification(notification)}
                      className="w-full flex gap-4 items-start px-5 py-4 border-b border-white/5 hover:bg-white/5 transition-colors last:border-0 text-left"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${notification.color}20` }}
                      >
                        <Icon size={16} style={{ color: notification.color }} />
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

export default function AdvertiserLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-darkBg text-textMain">
      <AdvertiserSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div
        className="flex-1 flex flex-col transition-all duration-300 overflow-hidden"
        style={{ marginLeft: sidebarOpen ? "280px" : "88px" }}
      >
        <AdvertiserTopBar sidebarOpen={sidebarOpen} />
        <div className="flex-1 overflow-y-auto p-6 pt-20">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
