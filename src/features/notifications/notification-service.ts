import { Prisma, type NotificationType as DatabaseNotificationType } from "@prisma/client";
import { prisma } from "@/server/database/client";
import { publishNotifications } from "@/server/realtime/notification-bus";
import type { NotificationType, NotificationView } from "./types";

const notificationSelect = {
  id: true,
  recipientId: true,
  type: true,
  messageKey: true,
  data: true,
  readAt: true,
  createdAt: true,
  actor: { select: { displayName: true } },
} satisfies Prisma.NotificationSelect;

type NotificationRow = Prisma.NotificationGetPayload<{ select: typeof notificationSelect }>;

export type NewNotification = {
  recipientId: string;
  actorId?: string;
  activityEventId?: string;
  type: NotificationType;
  messageKey: string;
  data?: Prisma.InputJsonValue;
  expiresAt?: Date;
};

export function toNotificationView(row: NotificationRow): NotificationView {
  return {
    id: row.id,
    type: row.type as NotificationType,
    messageKey: row.messageKey,
    data: row.data,
    actorName: row.actor?.displayName ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createNotificationRecords(
  transaction: Prisma.TransactionClient,
  inputs: NewNotification[],
) {
  return Promise.all(inputs.map((input) => transaction.notification.create({
    data: { ...input, type: input.type as DatabaseNotificationType },
    select: notificationSelect,
  })));
}

export async function createNotifications(inputs: NewNotification[]) {
  const rows = await prisma.$transaction((transaction) => createNotificationRecords(transaction, inputs));
  const delivered = rows.map((row) => ({
    recipientId: row.recipientId,
    notification: toNotificationView(row),
  }));
  publishNotifications(delivered);
  return delivered;
}

export async function listNotifications(userId: string, limit: number, cursor?: string) {
  const rows = await prisma.notification.findMany({
    where: { recipientId: userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: notificationSelect,
  });
  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();
  return {
    notifications: rows.map(toNotificationView),
    nextCursor: hasMore ? rows.at(-1)?.id ?? null : null,
  };
}

export function countUnreadNotifications(userId: string) {
  return prisma.notification.count({ where: { recipientId: userId, readAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } });
}

export async function setNotificationReadState(
  userId: string,
  read: boolean,
  id?: string,
) {
  return prisma.notification.updateMany({
    where: { recipientId: userId, ...(id ? { id } : {}), OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    data: { readAt: read ? new Date() : null },
  });
}
