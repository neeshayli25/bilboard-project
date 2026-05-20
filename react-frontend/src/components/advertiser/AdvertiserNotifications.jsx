import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, CheckCircle, AlertCircle, XCircle, ChevronRight } from "lucide-react";
import {
  clearAllNotifications,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api";
import { emitNotificationUpdate } from "../../utils/notificationEvents";

function getIcon(type) {
  switch (type) {
    case "booking":
    case "payment":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "approval":
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    case "rejection":
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
}

function buildNotificationPath(notification) {
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

  if (notification?.type === "payment") return "/advertiser/payments";
  if (notification?.type === "booking" || notification?.type === "approval") return "/advertiser/my-bookings";
  return "/advertiser";
}

function NotificationRow({ notification, onOpen, onMarkRead, showArrow = true }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={`w-full border-b border-gray-100 px-4 py-4 text-left transition hover:bg-gray-50 ${
        !notification.isRead ? "bg-blue-50" : "bg-white"
      }`}
    >
      <div className="flex gap-3">
        <div className="mt-1 flex-shrink-0">{getIcon(notification.type)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">{notification.message}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-gray-400">
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </div>
            {showArrow && <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-400" />}
          </div>
          {!notification.isRead && (
            <span
              onClick={(event) => {
                event.stopPropagation();
                onMarkRead(notification._id);
              }}
              className="mt-3 inline-block text-xs font-medium text-blue-600 hover:underline"
            >
              Mark as read
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function AdvertiserNotifications({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const isDrawerMode = typeof isOpen === "boolean";
  const shouldRender = isDrawerMode ? isOpen : true;

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
    if (shouldRender) {
      fetchNotifications();
    }
  }, [fetchNotifications, shouldRender]);

  const markAsRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((current) =>
        current.map((item) => (item._id === id ? { ...item, isRead: true } : item))
      );
      emitNotificationUpdate("advertiser");
    } catch (error) {
      console.error(error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      emitNotificationUpdate("advertiser");
    } catch (error) {
      console.error(error);
    }
  };

  const clearAll = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      emitNotificationUpdate("advertiser");
    } catch (error) {
      console.error(error);
    }
  };

  const openNotification = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    navigate(buildNotificationPath(notification));
    if (isDrawerMode && onClose) {
      onClose();
    }
  };

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const listContent = loading ? (
    <div className="p-6 text-center text-gray-500">Loading...</div>
  ) : notifications.length === 0 ? (
    <div className="p-6 text-center text-gray-500">No notifications</div>
  ) : (
    notifications.map((notification) => (
      <NotificationRow
        key={notification._id}
        notification={notification}
        onOpen={openNotification}
        onMarkRead={markAsRead}
      />
    ))
  );

  if (!isDrawerMode) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/5 bg-[#131A2A]/80 p-6 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white">Notifications</h1>
              <p className="mt-2 text-sm text-blue-100/55">
                Open any approval or payment alert to jump straight into the related booking.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={markAllAsRead}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70 hover:bg-white/10 hover:text-white"
              >
                Mark All Read
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70 hover:bg-white/10 hover:text-white"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/5 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">All Alerts</h2>
            </div>
            <span className="rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white">
              {unreadCount} unread
            </span>
          </div>
          <div>{listContent}</div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {shouldRender && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 flex h-full w-96 flex-col overflow-hidden bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-1 text-xs text-white">{unreadCount}</span>
                )}
              </div>
              <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex justify-end gap-2 bg-gray-100 p-3">
              <button
                type="button"
                onClick={markAllAsRead}
                className="rounded-md bg-gray-300 px-3 py-1 text-xs text-gray-800 transition hover:bg-gray-400"
              >
                Mark all as read
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-md bg-gray-300 px-3 py-1 text-xs text-gray-800 transition hover:bg-gray-400"
              >
                Clear all
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">{listContent}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
