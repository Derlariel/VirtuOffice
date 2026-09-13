// Run against the local dev/production server. Only uniquely named test fixtures are removed.
import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { io } from "socket.io-client";
import { prisma } from "../src/server/database/client.ts";
import { checkIn, checkOut } from "../src/features/attendance/work-session-service.ts";
import { getUserBySessionToken } from "../src/server/auth/session-user.ts";

const origin = process.env.TEST_APP_URL ?? "http://localhost:3000";
const once = (socket, event) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => { socket.off(event, receive); reject(new Error(`Timed out: ${event}`)); }, 15000);
  function receive(value) { clearTimeout(timeout); resolve(value); }
  socket.once(event, receive);
});

test("HTTP guards, room scoping, multi-tab recovery, checkout and notification ownership", { timeout: 120000 }, async () => {
  const users = [];
  const sockets = [];
  const connect = (token, extraOrigin = origin) => {
    const socket = io(origin, { path: "/api/socket", transports: ["websocket"], autoConnect: false, reconnection: false,
      extraHeaders: { Cookie: `vo_session=${token}`, Origin: extraOrigin } });
    sockets.push(socket);
    return socket;
  };
  try {
    for (const label of ["a", "b"]) {
      const token = randomBytes(32).toString("hex");
      const user = await prisma.user.create({ data: { email: `compat-${label}-${randomUUID()}@kmutt.ac.th`, displayName: "Compatibility test",
        authSessions: { create: { sessionTokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600000) } } } });
      users.push({ ...user, token });
    }
    const [a, b] = users;
    assert.equal((await fetch(`${origin}/api/work-session`)).status, 401);
    assert.equal((await fetch(`${origin}/api/notifications`)).status, 401);
    for (const route of ["/", "/unauthorized"]) assert.equal((await fetch(`${origin}${route}`)).status, 200);
    assert.equal((await fetch(`${origin}/api/auth/callback?code=invalid&state=invalid`, { redirect: "manual" })).status, 307);
    const rejected = connect(a.token);
    const denied = once(rejected, "connect_error"); rejected.connect(); await denied;
    const sessions = await Promise.all([checkIn(a.id), checkIn(a.id)]);
    assert.equal(sessions[0].id, sessions[1].id);
    await checkIn(b.id);
    const crossSite = connect(a.token, "https://untrusted.example");
    const originDenied = once(crossSite, "connect_error"); crossSite.connect(); await originDenied;
    const first = connect(a.token), second = connect(a.token), other = connect(b.token);
    for (const socket of [first, second, other]) { const ready = once(socket, "presence:snapshot"); socket.connect(); await ready; }
    assert.equal(await prisma.presence.count({ where: { userId: a.id, endedAt: null } }), 1);
    const room = await prisma.room.findUniqueOrThrow({ where: { slug: "development" } });
    const newSnapshot = once(second, "presence:snapshot");
    const removal = once(other, "presence:remove");
    assert.deepEqual(await first.timeout(5000).emitWithAck("presence:update", { roomId: room.id }), { ok: true });
    assert.equal(await removal, a.id);
    const members = await newSnapshot;
    assert.equal(members.filter((member) => member.userId === a.id).length, 1);
    assert.equal(members.some((member) => member.userId === b.id), false);
    first.emit("presence:update", { status: "FOCUS" }); // Missing callbacks must not crash the server.
    first.emit("activity:confirm");
    assert.deepEqual(await first.timeout(5000).emitWithAck("presence:update", { status: "FOCUS" }), { ok: true });
    first.disconnect();
    assert.equal(await prisma.presence.count({ where: { userId: a.id, endedAt: null } }), 1);
    const recovered = once(first, "presence:snapshot"); first.connect();
    assert.equal((await recovered).find((member) => member.userId === a.id).roomId, room.id);
    const notification = await prisma.notification.create({ data: { recipientId: a.id, type: "SYSTEM", messageKey: "test" } });
    const headers = { Cookie: `vo_session=${b.token}`, "Content-Type": "application/json" };
    assert.equal((await fetch(`${origin}/api/notifications`, { method: "PATCH", headers, body: JSON.stringify({ id: notification.id, read: true }) })).status, 404);
    await prisma.notification.create({ data: { recipientId: a.id, type: "SYSTEM", messageKey: "expired", createdAt: new Date(Date.now() - 3000), expiresAt: new Date(Date.now() - 1000) } });
    const history = await (await fetch(`${origin}/api/notifications`, { headers: { Cookie: `vo_session=${a.token}` } })).json();
    assert.equal(history.notifications.length, 1);
    assert.equal(history.unreadCount, 1);
    await checkOut(a.id);
    const disconnected = once(first, "disconnect"); first.emit("activity:signal"); await disconnected;
    const reconnectDenied = once(first, "connect_error"); first.connect(); await reconnectDenied;
    await prisma.user.update({ where: { id: a.id }, data: { email: `test@blocked-${randomUUID()}.example` } });
    assert.equal(await getUserBySessionToken(a.token), null);
    await prisma.user.update({ where: { id: b.id }, data: { accountStatus: "SUSPENDED" } });
    assert.equal(await getUserBySessionToken(b.token), null);
    const revoked = once(other, "disconnect"); other.emit("activity:signal"); await revoked;
  } finally {
    for (const socket of sockets) socket.disconnect();
    // Let the server's documented disconnect grace finish before deleting these test rows.
    await delay(11000);
    const ids = users.map(({ id }) => id);
    const activePresence = await prisma.presence.count({ where: { userId: { in: ids }, endedAt: null } });
    if (ids.length) await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { recipientId: { in: ids } } });
      await tx.activityEvent.deleteMany({ where: { userId: { in: ids } } });
      await tx.presence.deleteMany({ where: { userId: { in: ids } } });
      await tx.workSession.deleteMany({ where: { userId: { in: ids } } });
      await tx.user.deleteMany({ where: { id: { in: ids } } });
    });
    await prisma.$disconnect();
    assert.equal(activePresence, 0, "last socket disconnect must close test presence after grace");
  }
});
