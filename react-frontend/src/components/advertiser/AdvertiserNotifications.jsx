import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications,
} from "../../api";

const AdvertiserNotifications = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    await markNotificationRead(id);
    setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = async () => {
    await markAllNotificationsRead();
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const clearAll = async () => {
    await clearAllNotifications();
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type) => {
    switch (type) {
      case 'booking':
      case 'payment':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'approval':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'rejection':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40"
          />
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Actions */}
            <div className="p-3 bg-gray-100 flex gap-2 justify-end">
              <button
                onClick={markAllAsRead}
                className="text-xs px-3 py-1 bg-gray-300 hover:bg-gray-400 rounded-md text-gray-800 transition"
              >
                Mark all as read
              </button>
              <button
                onClick={clearAll}
                className="text-xs px-3 py-1 bg-gray-300 hover:bg-gray-400 rounded-md text-gray-800 transition"
              >
                Clear all
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-gray-500">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No notifications</div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {notifications.map((n) => (
                    <motion.div
                      key={n._id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition ${!n.isRead ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getIcon(n.type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-800">{n.message}</p>
                          {!n.isRead && (
                            <button
                              onClick={() => markAsRead(n._id)}
                              className="text-xs text-blue-600 mt-1 hover:underline"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AdvertiserNotifications;