import type { Notification } from "@/types";

/**
 * Notifications are derived from realtime inbound messages for the signed-in
 * session, so they live in memory for the lifetime of the tab.
 */
const notifications: Notification[] = [];
const listeners = new Set<() => void>();

export async function listNotifications(): Promise<Notification[]> {
  return [...notifications];
}

export async function markAllNotificationsRead(): Promise<void> {
  notifications.forEach((n) => {
    n.read = true;
  });
  listeners.forEach((l) => l());
}

export function pushNotification(notification: Notification) {
  if (notifications.some((n) => n.id === notification.id)) return;
  notifications.unshift(notification);
  if (notifications.length > 50) notifications.length = 50;
  listeners.forEach((l) => l());
}

export function onNotificationsChange(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
