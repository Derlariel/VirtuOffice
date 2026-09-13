# Realtime Architecture

Implemented in `src/server/realtime/presence-server.ts` and `src/features/presence`. Single persistent Node process; no Redis/distributed ownership yet.

## Socket Connection

`/api/socket`, WebSocket-only Socket.IO; same-origin browser handshake, 10KB payload limit and per-socket packet rate limit. No meeting media.

## Authentication

Server resolves the hashed session cookie, account state and active email domain; an OPEN work session is required. Packet middleware revalidates access; the 60s heartbeat closes expired/revoked/checked-out idle sockets. Checkout publishes a process-local immediate disconnect; other clients reconcile attendance through existing polling.

## Presence

One state and active presence row per user. Status/room mutations serialize per user. Room snapshots contain only occupants in that room. Last disconnect gets a 10s recovery grace; it does not close attendance.

## Heartbeats

Socket ping every 25s, timeout 20s; aggregate database lastSeenAt every 60s. Activity signals are separate, coarse and throttled. Neither heartbeat nor inactivity proves productivity.

## Rooms

All active, unarchived rooms currently allow checked-in users. Server validates UUID/existence/activity, derives identity and synchronizes all tabs to one room. Switch emits removal to old room and snapshot/upsert only to new room. Leave returns to Lobby. RoomMembership/capacity are not enforced as a private-room policy yet.

## Avatar Movement

Phase 9 implements local movement only; remote meshes are deterministic presence markers. No movement packets exist. Before adding them in their requested phase: derive user and room from authenticated server state, reject malformed/nonfinite/out-of-bounds data, throttle well below render FPS, broadcast only to that room, interpolate remotely and keep one authoritative transform per user across devices. Never persist movement trails for monitoring.

## Reconnection

Client reconnect backoff: 1–10s. Reconnection receives an authoritative room snapshot; HTML retains last state with connection feedback. Canvas survives temporary disconnect. Notification history reloads on reconnect/open/focus. Listeners, activity deadlines, offline timers and event-bus subscriptions are cleaned up on unmount/server close.

## Multi-tab

Socket IDs aggregate under user ID. One room/status is shared across all devices. Attendance uses BroadcastChannel invalidation plus 15s visible polling. Browser crashes leave the work session recoverable.

## Message Schemas

`src/features/presence/types.ts` defines presence snapshot/upsert/remove/update, activity signal/confirm/warning/cleared and notification:new. Client updates accept only selectable status and UUID room intent. Server assigns user/role/scope. Notifications use private `user:<id>` channels; presence uses `presence:<roomId>`. No global movement channel or media messages.
