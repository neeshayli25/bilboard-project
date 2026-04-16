import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, CheckCircle, Calendar, DollarSign, Monitor, 
  AlertCircle, BellOff, CheckCheck, Trash2, XCircle 
} from "lucide-react";
import { getNotifications, markNotificationRead, markAllNotificationsRead, clearAllNotifications } from "../../services/adminApi";

const TYPE_CONFIG = {
  booking:  { icon: Calendar,     bg: "#eff6ff", border: "#bfdbfe", icon_color: "#3b82f6", dot: "#3b82f6", label: "Booking" },
  payment:  { icon: DollarSign,   bg: "#f0fdf4", border: "#bbf7d0", icon_color: "#10b981", dot: "#10b981", label: "Payment" },
  approval: { icon: CheckCircle,  bg: "#fffbeb", border: "#fde68a", icon_color: "#f59e0b", dot: "#f59e0b", label: "Approval" },
  billboard:{ icon: Monitor,      bg: "#faf5ff", border: "#e9d5ff", icon_color: "#8b5cf6", dot: "#8b5cf6", label: "Billboard" },
  default:  { icon: Bell,         bg: "#f8faff", border: "#e0e7ff", icon_color: "#6366f1", dot: "#6366f1", label: "General" },
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date);
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, unread, read
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNotifications();
    // Optional auto-refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getNotifications();
      setNotifications(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const clearAll = async () => {
    if (!window.confirm("Are you sure you want to delete all notifications? This action cannot be undone.")) return;
    try {
      await clearAllNotifications();
      setNotifications([]);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = notifications.filter(n => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.isRead;
    return n.isRead;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? (
              <span className="text-indigo-600 font-medium">{unreadCount} unread</span>
            ) : "All caught up!"}
            {notifications.length > 0 && ` · ${notifications.length} total`}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition text-sm font-medium"
            >
              <CheckCheck size={16} /> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition text-sm font-medium"
            >
              <Trash2 size={16} /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {[
          { key: "all", label: `All (${notifications.length})` },
          { key: "unread", label: `Unread (${unreadCount})` },
          { key: "read", label: `Read (${notifications.length - unreadCount})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === tab.key
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-gray-500">{error}</p>
            <button onClick={fetchNotifications} className="mt-3 text-indigo-600 hover:underline">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <BellOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No {filter !== "all" ? filter : ""} notifications</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((notification, idx) => {
              const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.default;
              const Icon = config.icon;
              const isUnread = !notification.isRead;

              return (
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`relative border-b border-gray-100 last:border-0 hover:bg-gray-50 transition ${
                    isUnread ? "bg-indigo-50/30" : ""
                  }`}
                >
                  <div className="flex gap-4 p-4">
                    {/* Unread indicator */}
                    {isUnread && (
                      <div className="flex-shrink-0 pt-1">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      </div>
                    )}
                    {/* Icon */}
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: config.icon_color + "15", border: `1px solid ${config.border}` }}
                    >
                      <Icon size={18} color={config.icon_color} />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <p className={`text-sm ${isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                          {notification.title}
                        </p>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {timeAgo(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: config.icon_color + "15", color: config.icon_color }}
                        >
                          {config.label}
                        </span>
                        {isUnread && (
                          <button
                            onClick={() => markRead(notification._id)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}