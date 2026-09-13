import type { NotificationView } from "@/features/notifications/types";

export const WORK_STATUSES = [
  "AVAILABLE",
  "WORKING",
  "IN_MEETING",
  "FOCUS",
  "BREAK",
  "AWAY",
  "INACTIVE",
  "OFFLINE",
] as const;

export const SELECTABLE_WORK_STATUSES = WORK_STATUSES.filter(
  (status) => status !== "INACTIVE" && status !== "OFFLINE",
);

export type WorkStatus = (typeof WORK_STATUSES)[number];
export type UserWorkStatus = Exclude<WorkStatus, "INACTIVE" | "OFFLINE">;

export type PresenceView = {
  userId: string;
  displayName: string;
  status: WorkStatus;
  roomId: string | null;
};

export type PresenceUpdate = {
  status?: UserWorkStatus;
  roomId?: string;
};

export type PresenceAck = { ok: true } | { ok: false; error: "INVALID_UPDATE" | "ROOM_FORBIDDEN" | "UPDATE_FAILED" };

export type ActivityWarning = { deadlineAt: string };

export interface ServerToClientEvents {
  "presence:snapshot": (members: PresenceView[]) => void;
  "presence:upsert": (member: PresenceView) => void;
  "presence:remove": (userId: string) => void;
  "activity:warning": (warning: ActivityWarning) => void;
  "activity:cleared": () => void;
  "notification:new": (notification: NotificationView) => void;
}

export interface ClientToServerEvents {
  "presence:update": (update: PresenceUpdate, acknowledge: (result: PresenceAck) => void) => void;
  "activity:signal": () => void;
  "activity:confirm": (acknowledge: (result: { ok: boolean }) => void) => void;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPresenceUpdate(value: unknown): value is PresenceUpdate {
  if (!value || typeof value !== "object") return false;
  const update = value as Record<string, unknown>;
  if (!("status" in update) && !("roomId" in update)) return false;
  if (
    "status" in update &&
    (typeof update.status !== "string" ||
      update.status === "INACTIVE" ||
      update.status === "OFFLINE" ||
      !WORK_STATUSES.includes(update.status as WorkStatus))
  ) return false;
  return !("roomId" in update) ||
    (typeof update.roomId === "string" && UUID.test(update.roomId));
}
