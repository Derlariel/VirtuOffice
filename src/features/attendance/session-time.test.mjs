import assert from "node:assert/strict";
import test from "node:test";
import { elapsedSeconds, formatDuration } from "./session-time.ts";

test("work duration never becomes negative and supports shifts over 24 hours", () => {
  assert.equal(elapsedSeconds("2026-09-13T02:00:00.000Z", null, Date.parse("2026-09-13T03:01:01.000Z")), 3661);
  assert.equal(elapsedSeconds("2026-09-13T03:00:00.000Z", null, Date.parse("2026-09-13T02:00:00.000Z")), 0);
  assert.equal(formatDuration(90061), "25:01:01");
});
