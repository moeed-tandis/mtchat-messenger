import type { Notification } from "@/types";
import { delay } from "../client";
import { notifications } from "../mock/db";

/** GET /api/notifications */
export async function listNotifications(): Promise<Notification[]> {
  await delay(160);
  return [...notifications];
}

export async function markAllNotificationsRead(): Promise<void> {
  await delay(120);
  notifications.forEach((n) => {
    n.read = true;
  });
}

export function pushNotification(notification: Notification) {
  notifications.unshift(notification);
}
