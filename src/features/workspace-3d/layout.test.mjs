import assert from "node:assert/strict";
import test from "node:test";
import { clampPosition, participantPosition, ROOM_BOUND } from "./layout.ts";

test("movement stays inside the room and participant slots remain distinct", () => {
  assert.deepEqual(clampPosition([100, -100]), [ROOM_BOUND, -ROOM_BOUND]);
  assert.deepEqual(clampPosition([1.5, 2]), [1.5, 2]);
  const slots = Array.from({ length: 60 }, (_, index) => participantPosition(index));
  assert.equal(new Set(slots.map(JSON.stringify)).size, 60);
  for (const slot of slots) assert.deepEqual(clampPosition(slot), slot);
});
