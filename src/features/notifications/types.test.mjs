import assert from "node:assert/strict";
import test from "node:test";
import { NOTIFICATION_TYPES } from "./types.ts";

test("notification contract covers every supported internal event", () => {
  assert.deepEqual(new Set(NOTIFICATION_TYPES), new Set([
    "INACTIVITY_WARNING",
    "INACTIVITY_ESCALATION",
    "TASK_ASSIGNED",
    "TASK_UPDATED",
    "SUBMISSION_UPDATED",
    "SUBMISSION_RECEIVED",
    "MEETING_INVITATION",
    "SYSTEM",
  ]));
});
