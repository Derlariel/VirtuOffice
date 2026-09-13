export type WorkSessionView = {
  id: string;
  status: "OPEN" | "CLOSED";
  checkInAt: string;
  checkOutAt: string | null;
  durationSeconds: number | null;
};

export type AttendanceEvent = "CHECKED_IN" | "CHECKED_OUT" | null;

export type AttendanceActionState = {
  revision: number;
  serverNow: string;
  session: WorkSessionView | null;
  event: AttendanceEvent;
  error: "UNAUTHENTICATED" | "UPDATE_FAILED" | null;
};
