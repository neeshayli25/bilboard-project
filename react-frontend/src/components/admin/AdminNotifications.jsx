import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCircle,
  Calendar,
  DollarSign,
  Monitor,
  BellOff,
  CheckCheck,
  Trash2,
  Image,
} from "lucide-react";
import {
  clearAllNotifications,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/adminApi";
import { emitNotificationUpdate } from "../../utils/notificationEvents";

const TYPE_CONFIG = {
  booking: { icon: Calendar, color: "#8b5cf6", label: "Booking" },
  payment: { icon: DollarSign, color: "#06b6d4", label: "Payment" },
  approval: { icon: Image, color: "#f59e0b", label: "Ad Review" },
  billboard: { icon: Monitor, color: "#3b82f6", label: "Billboard" },
  default: { icon: Bell, color: "#6366f1", label: "General" },
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(date).toLocaleDateString();
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      emitNotificationUpdate("admin");
    } catch (error) {
      console.error(error);
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      emitNotificationUpdate("admin");
    } catch (error) {
      console.error(error);
    }
  };

  const clearAll = async () => {
    if (!window.confirm("Delete all notifications?")) return;

    try {
      await clearAllNotifications();
      setNotifications([]);
      emitNotificationUpdate("admin");
    } catch (error) {
      console.error(error);
    }
  };

  const filtered = notifications.filter((notification) => {
    if (filter === "unread") return !notification.isRead;
    if (filter === "read") return notification.isRead;
    return true;
  });

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <div className="flex flex-col gap-6 h-full bg-darkBg text-textMain relative pb-16 min-h-screen">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute w-[500px] h-[500px] bg-orange-600 opacity-5 blur-[120px] top-20 right-10 rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-black text-white flex items-center gap-3">
              <Bell className="text-orange-500" /> Notification Center
            </h1>
            <p className="text-blue-100/60 mt-1">
              {unreadCount > 0 ? (
                <span className="text-orange-400 font-bold">{unreadCount} unread alerts</span>
              ) : (
                "All caught up!"
              )}{" "}
              · {notifications.length} total
            </p>
          </div>
          <div className="flex gap-3">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
              >
                <CheckCheck size={16} /> Mark All Read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
              >
                <Trash2 size={16} /> Clear All
              </button>
            )}
          </div>
        </div>

        <div className="flex bg-[#131A2A]/80 border border-blue-500/20 rounded-2xl overflow-hidden w-fit mb-8">
          {[
            { key: "all", label: `All (${notifications.length})` },
            { key: "unread", label: `Unread (${unreadCount})` },
            { key: "read", label: `Read (${notifications.length - unreadCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-6 py-3.5 text-xs font-bold uppercase tracking-widest transition-colors ${
                filter === tab.key
                  ? "bg-orange-500/20 text-orange-400"
                  : "text-blue-200/40 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 text-orange-400 animate-pulse font-bold text-xl">
            Loading Alerts...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 bg-[#131A2A]/40 border border-white/5 border-dashed rounded-3xl">
            <BellOff size={48} className="text-white/10 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Notifications</h3>
            <p className="text-blue-200/50">No {filter !== "all" ? filter : ""} notifications to display.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((notification, index) => {
                const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.default;
                const Icon = config.icon;
                const isUnread = !notification.isRead;

                return (
                  <motion.div
                    key={notification._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`relative bg-[#131A2A]/80 border rounded-2xl p-5 flex gap-5 items-start transition-all ${
                      isUnread
                        ? "border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.05)]"
                        : "border-white/5"
                    }`}
                  >
                    {isUnread && <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}

                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: `${config.color}15`,
                        border: `1px solid ${config.color}30`,
                      }}
                    >
                      <Icon size={20} style={{ color: config.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-3 mb-1">
                        <p className={`text-sm font-bold ${isUnread ? "text-white" : "text-blue-200/70"}`}>
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-blue-200/40 whitespace-nowrap font-medium">
                          {timeAgo(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-blue-100/50 leading-relaxed">{notification.message}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span
                          className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: `${config.color}15`, color: config.color }}
                        >
                          {config.label}
                        </span>
                        {isUnread && (
                          <button
                            type="button"
                            onClick={() => markRead(notification._id)}
                            className="text-xs font-bold text-blue-400 hover:text-white transition-colors"
                          >
                            Mark as Read
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
