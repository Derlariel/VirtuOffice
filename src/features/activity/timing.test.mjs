import assert from "node:assert/strict";
import test from "node:test";
import { activityDeadline, getActivityConfig } from "./timing.ts";

test("activity deadlines use configurable idle and grace periods", () => {
  const config = getActivityConfig({ ACTIVITY_IDLE_MS: "300000", ACTIVITY_GRACE_MS: "45000" });
  assert.deepEqual(config, { idleMs: 300000, graceMs: 45000 });
  assert.equal(activityDeadline(1_000, null, config), 301_000);
  assert.equal(activityDeadline(1_000, 301_000, config), 346_000);
  assert.throws(() => getActivityConfig({ ACTIVITY_IDLE_MS: "0" }), /ACTIVITY_IDLE_MS/);
});
