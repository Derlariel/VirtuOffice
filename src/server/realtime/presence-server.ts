import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { Prisma, type WorkStatus as DatabaseWorkStatus } from "@prisma/client";
import {
  SESSION_COOKIE_NAME,
  getUserBySessionToken,
} from "@/server/auth/session-user";
import { prisma } from "@/server/database/client";
import { isAllowedOrigin } from "@/server/auth/policy";
import { canEnterRoom, getLobbyRoomId } from "@/features/presence/presence-service";
import { activityDeadline, getActivityConfig } from "@/features/activity/timing";
import {
  createNotificationRecords,
  createNotifications,
  toNotificationView,
} from "@/features/notifications/notification-service";
import { onNotification, onWorkSessionClosed, publishNotifications } from "./notification-bus";
import {
  isPresenceUpdate,
  type ClientToServerEvents,
  type PresenceAck,
  type PresenceView,
  type ServerToClientEvents,
  type WorkStatus,
} from "@/features/presence/types";

const DISCONNECT_GRACE_MS = 10_000;
const LAST_SEEN_INTERVAL_MS = 60_000;

type User = { id: string; displayName: string };
type SocketData = { user: User };
type PresenceServer = Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
type UserState = {
  presenceId: string;
  userId: string;
  displayName: string;
  status: Exclude<WorkStatus, "OFFLINE">;
  roomId: string | null;
  socketIds: Set<string>;
  mutation: Promise<void>;
  offlineTimer?: NodeJS.Timeout;
  lastActivityAt: number;
  warningAt: number | null;
  statusBeforeInactive: Exclude<WorkStatus, "OFFLINE">;
  inactiveByActivity: boolean;
  activityTimer?: NodeJS.Timeout;
};

function cookieValue(header: string | undefined, name: string) {
  for (const part of header?.split(";") ?? []) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
}

function channel(roomId: string | null) {
  return `presence:${roomId ?? "lobby"}`;
}

function userChannel(userId: string) {
  return `user:${userId}`;
}

function view(state: UserState, status: WorkStatus = state.status): PresenceView {
  return {
    userId: state.userId,
    displayName: state.displayName,
    status,
    roomId: state.roomId,
  };
}

export async function attachPresenceServer(httpServer: HttpServer, origin: string) {
  const activityConfig = getActivityConfig();
  // ponytail: single-process ownership; add a shared Socket.IO adapter before horizontal scaling.
  await prisma.presence.updateMany({
    where: { endedAt: null },
    data: { connection: "OFFLINE", endedAt: new Date(), lastSeenAt: new Date() },
  });
  const lobbyRoomId = await getLobbyRoomId();

  const io: PresenceServer = new Server(httpServer, {
    path: "/api/socket",
    transports: ["websocket"],
    pingInterval: 25_000,
    pingTimeout: 20_000,
    maxHttpBufferSize: 10_000,
    allowRequest: (request, callback) => callback(null, isAllowedOrigin(request.headers.origin, origin)),
  });
  const states = new Map<string, UserState>();
  const loads = new Map<string, Promise<UserState>>();
  const unsubscribeNotifications = onNotification(({ recipientId, notification }) => {
    io.to(userChannel(recipientId)).emit("notification:new", notification);
  });
  const unsubscribeCheckout = onWorkSessionClosed((userId) => io.in(userChannel(userId)).disconnectSockets(true));

  const snapshot = (roomId: string | null) =>
    [...states.values()]
      .filter((state) => state.roomId === roomId)
      .map((state) => view(state));

  const broadcast = (state: UserState) => {
    io.to(channel(state.roomId)).emit("presence:upsert", view(state));
  };

  async function markInactive(state: UserState) {
    if (state.socketIds.size === 0 || state.inactiveByActivity) return;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1_000);
    const result = await prisma.$transaction(async (transaction) => {
      const [workSession, relationships] = await Promise.all([
        transaction.workSession.findFirst({
          where: { userId: state.userId, status: "OPEN" },
          orderBy: { checkInAt: "desc" },
          select: { id: true },
        }),
        transaction.reportsTo.findMany({
          where: {
            memberId: state.userId,
            validFrom: { lte: now },
            OR: [{ validUntil: null }, { validUntil: { gt: now } }],
            supervisor: {
              accountStatus: "ACTIVE", deletedAt: null,
              roleAssignments: { some: {
                role: { code: "SUPERVISOR" },
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              } },
            },
          },
          select: { supervisorId: true },
        }),
      ]);
      if (!workSession) return null;
      const event = await transaction.activityEvent.create({
        data: {
          userId: state.userId,
          workSessionId: workSession?.id,
          type: "MARKED_INACTIVE",
          occurredAt: now,
          supervisorNotifiedAt: relationships.length ? now : null,
          expiresAt,
        },
        select: { id: true },
      });
      const notifications = await createNotificationRecords(
        transaction,
        relationships.map(({ supervisorId }) => ({
          recipientId: supervisorId,
          actorId: state.userId,
          activityEventId: event.id,
          type: "INACTIVITY_ESCALATION" as const,
          messageKey: "activity.inactivityEscalation",
          data: { memberId: state.userId, displayName: state.displayName },
          expiresAt,
        })),
      );
      await transaction.presence.updateMany({
        where: { id: state.presenceId, endedAt: null },
        data: { workStatus: "INACTIVE", lastSeenAt: now },
      });
      return notifications;
    });

    if (result === null) {
      io.in(userChannel(state.userId)).disconnectSockets(true);
      return;
    }
    publishNotifications(result.map((notification) => ({
      recipientId: notification.recipientId,
      notification: toNotificationView(notification),
    })));

    state.statusBeforeInactive = state.status === "INACTIVE" ? "AVAILABLE" : state.status;
    state.status = "INACTIVE";
    state.inactiveByActivity = true;
    state.warningAt = null;
    broadcast(state);
    io.to(userChannel(state.userId)).emit("activity:cleared");
  }

  async function recordActivity(state: UserState, confirmed: boolean) {
    if (state.warningAt !== null && !confirmed) return;
    const now = new Date();
    if (state.warningAt !== null) io.to(userChannel(state.userId)).emit("activity:cleared");
    state.warningAt = null;
    state.lastActivityAt = now.getTime();
    if (state.inactiveByActivity) {
      const restoredStatus = state.statusBeforeInactive;
      const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1_000);
      await prisma.$transaction([
        prisma.presence.updateMany({
          where: { id: state.presenceId, endedAt: null },
          data: { workStatus: restoredStatus as DatabaseWorkStatus, lastSeenAt: now },
        }),
        prisma.activityEvent.create({
          data: {
            userId: state.userId,
            type: "ACTIVITY_RESUMED",
            occurredAt: now,
            expiresAt,
          },
        }),
      ]);
      state.status = restoredStatus;
      state.inactiveByActivity = false;
      broadcast(state);
    }
    scheduleActivity(state);
  }

  function scheduleActivity(state: UserState) {
    if (state.activityTimer) clearTimeout(state.activityTimer);
    if (state.socketIds.size === 0 || state.inactiveByActivity) return;
    const delay = Math.max(0, activityDeadline(
      state.lastActivityAt,
      state.warningAt,
      activityConfig,
    ) - Date.now());
    state.activityTimer = setTimeout(() => {
      state.activityTimer = undefined;
      const run = state.mutation.then(async () => {
        if (state.socketIds.size === 0) return;
        if (!(await hasWorkSession(state.userId))) {
          io.in(userChannel(state.userId)).disconnectSockets(true);
          return;
        }
        const remaining = activityDeadline(
          state.lastActivityAt,
          state.warningAt,
          activityConfig,
        ) - Date.now();
        if (remaining > 0) return scheduleActivity(state);
        if (state.warningAt === null) {
          const warnedAt = Date.now();
          await createNotifications([{
            recipientId: state.userId,
            type: "INACTIVITY_WARNING",
            messageKey: "activity.inactivityWarning",
            expiresAt: new Date(warnedAt + 90 * 24 * 60 * 60 * 1_000),
          }]);
          state.warningAt = warnedAt;
          io.to(userChannel(state.userId)).emit("activity:warning", {
            deadlineAt: new Date(state.warningAt + activityConfig.graceMs).toISOString(),
          });
          scheduleActivity(state);
        } else {
          await markInactive(state);
        }
      });
      state.mutation = run.catch((error) => console.error("Activity deadline failed", error));
    }, delay);
    state.activityTimer.unref();
  }

  const load = (user: User) => {
    const ready = states.get(user.id);
    if (ready) return Promise.resolve(ready);
    const pending = loads.get(user.id);
    if (pending) return pending;

    const promise = (async () => {
      const previous = await prisma.presence.findFirst({
        where: { userId: user.id, workStatus: { not: "OFFLINE" } },
        orderBy: { startedAt: "desc" },
        select: { workStatus: true, roomId: true },
      });
      const status = (previous?.workStatus ?? "AVAILABLE") as Exclude<WorkStatus, "OFFLINE">;
      const roomId = previous?.roomId && await canEnterRoom(previous.roomId)
        ? previous.roomId
        : lobbyRoomId;
      let presence;
      try {
        presence = await prisma.presence.create({
          data: { userId: user.id, roomId, connection: "ONLINE", workStatus: status },
          select: { id: true },
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
        presence = await prisma.presence.findFirstOrThrow({
          where: { userId: user.id, endedAt: null },
          select: { id: true },
        });
      }
      const state: UserState = {
        presenceId: presence.id,
        userId: user.id,
        displayName: user.displayName,
        status,
        roomId,
        socketIds: new Set(),
        mutation: Promise.resolve(),
        lastActivityAt: Date.now(),
        warningAt: null,
        statusBeforeInactive: status === "INACTIVE" ? "AVAILABLE" : status,
        inactiveByActivity: status === "INACTIVE",
      };
      states.set(user.id, state);
      return state;
    })().finally(() => loads.delete(user.id));
    loads.set(user.id, promise);
    return promise;
  };

  const hasWorkSession = async (userId: string) => Boolean(await prisma.workSession.findFirst({
    where: { userId, status: "OPEN" }, select: { id: true },
  }));

  io.use(async (socket, next) => {
    try {
      const token = cookieValue(socket.handshake.headers.cookie, SESSION_COOKIE_NAME);
      const user = await getUserBySessionToken(token);
      if (!user || !(await hasWorkSession(user.id))) return next(new Error("UNAUTHENTICATED"));
      socket.data.user = user;
      next();
    } catch {
      next(new Error("UNAUTHENTICATED"));
    }
  });

  io.on("connection", async (socket) => {
    let state: UserState;
    try {
      state = await load(socket.data.user);
    } catch (error) {
      console.error("Failed to open presence", error);
      socket.disconnect(true);
      return;
    }
    // Revalidate before each mutation; heartbeat also expires idle sockets.
    let packetWindow = Date.now();
    let packetCount = 0;
    socket.use(async (_packet, next) => {
      if (Date.now() - packetWindow >= 1_000) { packetWindow = Date.now(); packetCount = 0; }
      if (++packetCount > 20) { socket.disconnect(true); return next(new Error("RATE_LIMITED")); }
      try {
        const user = await getUserBySessionToken(cookieValue(socket.handshake.headers.cookie, SESSION_COOKIE_NAME));
        if (!user || !(await hasWorkSession(user.id))) {
          socket.disconnect(true);
          return next(new Error("UNAUTHENTICATED"));
        }
        next();
      } catch { socket.disconnect(true); next(new Error("UNAUTHENTICATED")); }
    });
    const wasOnline = state.socketIds.size > 0 || Boolean(state.offlineTimer);
    if (state.offlineTimer) clearTimeout(state.offlineTimer);
    state.offlineTimer = undefined;
    state.socketIds.add(socket.id);
    await socket.join([channel(state.roomId), userChannel(state.userId)]);
    socket.emit("presence:snapshot", snapshot(state.roomId));
    if (!wasOnline) socket.to(channel(state.roomId)).emit("presence:upsert", view(state));
    if (state.warningAt !== null) {
      socket.emit("activity:warning", {
        deadlineAt: new Date(state.warningAt + activityConfig.graceMs).toISOString(),
      });
    } else {
      state.lastActivityAt = Date.now();
    }
    scheduleActivity(state);

    let lastSignalAt = 0;
    socket.on("activity:signal", () => {
      if (Date.now() - lastSignalAt < 5_000) return;
      lastSignalAt = Date.now();
      const run = state.mutation.then(() => recordActivity(state, false));
      state.mutation = run.catch((error) => console.error("Activity signal failed", error));
    });

    socket.on("activity:confirm", (acknowledge) => {
      if (typeof acknowledge !== "function") return;
      const run = state.mutation.then(() => recordActivity(state, true));
      state.mutation = run.catch(() => undefined);
      void run.then(
        () => acknowledge({ ok: true }),
        (error) => {
          console.error("Activity confirmation failed", error);
          acknowledge({ ok: false });
        },
      );
    });

    socket.on("presence:update", (update, acknowledge) => {
      if (typeof acknowledge !== "function") return;
      if (!isPresenceUpdate(update)) return acknowledge({ ok: false, error: "INVALID_UPDATE" });

      const run = state.mutation.then(async () => {
        const nextStatus = update.status ?? state.status;
        const nextRoomId = update.roomId === undefined ? state.roomId : update.roomId;
        if (nextStatus === state.status && nextRoomId === state.roomId) return;
        if (nextRoomId && nextRoomId !== state.roomId && !(await canEnterRoom(nextRoomId))) {
          throw new Error("ROOM_FORBIDDEN");
        }

        const oldRoomId = state.roomId;
        await prisma.presence.update({
          where: { id: state.presenceId },
          data: { workStatus: nextStatus as DatabaseWorkStatus, roomId: nextRoomId, lastSeenAt: new Date() },
        });
        state.status = nextStatus;
        state.roomId = nextRoomId;
        if (update.status !== undefined) {
          state.inactiveByActivity = false;
          state.statusBeforeInactive = nextStatus;
          scheduleActivity(state);
        }

        if (oldRoomId !== nextRoomId) {
          io.to(channel(oldRoomId)).emit("presence:remove", state.userId);
          for (const socketId of state.socketIds) {
            const peer = io.sockets.sockets.get(socketId);
            await peer?.leave(channel(oldRoomId));
            await peer?.join(channel(nextRoomId));
            peer?.emit("presence:snapshot", snapshot(nextRoomId));
          }
          io.to(channel(nextRoomId)).except([...state.socketIds]).emit("presence:upsert", view(state));
        } else {
          io.to(channel(state.roomId)).emit("presence:upsert", view(state));
        }
      });

      state.mutation = run.catch(() => undefined);
      void run.then(
        () => acknowledge({ ok: true }),
        (error: Error) => acknowledge({
          ok: false,
          error: error.message === "ROOM_FORBIDDEN" ? "ROOM_FORBIDDEN" : "UPDATE_FAILED",
        } satisfies PresenceAck),
      );
    });

    const disconnect = () => {
      state.socketIds.delete(socket.id);
      if (state.socketIds.size > 0) return;
      if (state.activityTimer) clearTimeout(state.activityTimer);
      state.activityTimer = undefined;
      state.offlineTimer = setTimeout(() => {
        if (state.socketIds.size > 0) return;
        state.offlineTimer = undefined;
        const close = state.mutation.then(async () => {
          if (state.socketIds.size > 0) return;
          await prisma.presence.updateMany({
            where: { id: state.presenceId, endedAt: null },
            data: { connection: "OFFLINE", endedAt: new Date(), lastSeenAt: new Date() },
          });
          if (state.socketIds.size > 0) {
            const replacement = await prisma.presence.create({
              data: {
                userId: state.userId,
                roomId: state.roomId,
                connection: "ONLINE",
                workStatus: state.status as DatabaseWorkStatus,
              },
              select: { id: true },
            });
            state.presenceId = replacement.id;
            return;
          }
          states.delete(state.userId);
          io.to(channel(state.roomId)).emit("presence:remove", state.userId);
        });
        state.mutation = close.catch((error) => console.error("Failed to close presence", error));
      }, DISCONNECT_GRACE_MS);
    };
    socket.on("disconnect", disconnect);
    if (!socket.connected) disconnect();
  });

  const heartbeat = setInterval(() => {
    for (const socket of io.sockets.sockets.values()) {
      void (async () => {
        const user = await getUserBySessionToken(cookieValue(socket.handshake.headers.cookie, SESSION_COOKIE_NAME));
        if (!user || !(await hasWorkSession(user.id))) socket.disconnect(true);
      })().catch(() => socket.disconnect(true));
    }
    const ids = [...states.values()].map((state) => state.presenceId);
    if (ids.length) void prisma.presence.updateMany({
      where: { id: { in: ids }, endedAt: null },
      data: { lastSeenAt: new Date() },
    }).catch((error) => console.error("Presence heartbeat failed", error));
  }, LAST_SEEN_INTERVAL_MS);
  heartbeat.unref();

  httpServer.once("close", () => {
    clearInterval(heartbeat);
    unsubscribeNotifications();
    unsubscribeCheckout();
    for (const state of states.values()) {
      clearTimeout(state.offlineTimer);
      clearTimeout(state.activityTimer);
    }
    states.clear();
  });

  return io;
}
