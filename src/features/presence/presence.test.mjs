import assert from "node:assert/strict";
import test from "node:test";
import { isPresenceUpdate } from "./types.ts";

test("presence updates accept valid changes and reject offline or malformed payloads", () => {
  assert.equal(isPresenceUpdate({ status: "FOCUS" }), true);
  assert.equal(isPresenceUpdate({ roomId: null }), false);
  assert.equal(isPresenceUpdate({ roomId: "123e4567-e89b-12d3-a456-426614174000" }), true);
  assert.equal(isPresenceUpdate({ status: "OFFLINE" }), false);
  assert.equal(isPresenceUpdate({ status: "INACTIVE" }), false);
  assert.equal(isPresenceUpdate({}), false);
  assert.equal(isPresenceUpdate({ roomId: "lobby" }), false);
});
