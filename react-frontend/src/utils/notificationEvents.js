const NOTIFICATION_EVENT_MAP = {
  admin: "cdbms-admin-notifications-updated",
  advertiser: "cdbms-advertiser-notifications-updated",
};

export function emitNotificationUpdate(scope) {
  if (typeof window === "undefined") return;
  const eventName = NOTIFICATION_EVENT_MAP[scope];
  if (!eventName) return;
  window.dispatchEvent(new CustomEvent(eventName));
}

export function subscribeToNotificationUpdates(scope, handler) {
  if (typeof window === "undefined") return () => {};
  const eventName = NOTIFICATION_EVENT_MAP[scope];
  if (!eventName) return () => {};

  window.addEventListener(eventName, handler);
  return () => window.removeEventListener(eventName, handler);
}

