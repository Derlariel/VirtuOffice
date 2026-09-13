import { EventEmitter } from "node:events";
import type { NotificationView } from "@/features/notifications/types";

type DeliveredNotification = { recipientId: string; notification: NotificationView };
const globalBus = globalThis as unknown as { notificationBus?: EventEmitter };
const bus = globalBus.notificationBus ?? new EventEmitter();
globalBus.notificationBus = bus;

export function publishNotifications(notifications: DeliveredNotification[]) {
  for (const notification of notifications) bus.emit("notification", notification);
}

export function onNotification(listener: (notification: DeliveredNotification) => void) {
  bus.on("notification", listener);
  return () => bus.off("notification", listener);
}
