export const NOTIFICATION_TYPES = [
  "INACTIVITY_WARNING",
  "INACTIVITY_ESCALATION",
  "TASK_ASSIGNED",
  "TASK_UPDATED",
  "SUBMISSION_UPDATED",
  "SUBMISSION_RECEIVED",
  "MEETING_INVITATION",
  "SYSTEM",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationView = {
  id: string;
  type: NotificationType;
  messageKey: string;
  data: unknown;
  actorName: string | null;
  readAt: string | null;
  createdAt: string;
};
