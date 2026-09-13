"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { io, type Socket } from "socket.io-client";
import { NotificationCenter } from "@/features/notifications/notification-center";
import { WorkspacePreview } from "@/features/workspace-3d/workspace-preview";
import {
  SELECTABLE_WORK_STATUSES,
  type ClientToServerEvents,
  type PresenceUpdate,
  type PresenceView,
  type ServerToClientEvents,
} from "./types";

const ACTIVITY_SEND_INTERVAL_MS = 30_000;

export type WorkspacePanel = "workspace" | "dashboard" | "tasks" | "notifications" | null;

type Props = {
  userId: string;
  rooms: { id: string; slug: string; name: string }[];
  workspaceActive: boolean;
  simpleMode: boolean;
  activePanel: WorkspacePanel;
  onClosePanel: () => void;
  onSimpleMode: () => void;
};

export const PresencePanel = memo(function PresencePanel({
  userId,
  rooms,
  workspaceActive,
  simpleMode,
  activePanel,
  onClosePanel,
  onSimpleMode,
}: Props) {
  const t = useTranslations("Presence");
  const roomLabels = useTranslations("Rooms");
  const roomName = (room: { slug: string; name: string }) => roomLabels.has(room.slug) ? roomLabels(room.slug) : room.name;
  const locale = useLocale();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [connected, setConnected] = useState(false);
  const [members, setMembers] = useState<PresenceView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warningDeadline, setWarningDeadline] = useState<string | null>(null);
  const [realtimeSocket, setRealtimeSocket] = useState<
    Socket<ServerToClientEvents, ClientToServerEvents> | null
  >(null);
  const self = members.find((member) => member.userId === userId);
  const lobbyRoomId = rooms.find((room) => room.slug === "lobby")?.id;
  const currentRoom = rooms.find((room) => room.id === self?.roomId);
  const workspaceView = useMemo(() => currentRoom ? {
    roomId: currentRoom.id,
    roomSlug: currentRoom.slug,
    userId,
    participantIds: members.map((member) => member.userId),
  } : null, [currentRoom, members, userId]);

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      path: "/api/socket",
      transports: ["websocket"],
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      setConnected(true);
      setRealtimeSocket(socket);
      setError(null);
      socket.emit("activity:signal");
    });
    socket.on("disconnect", () => {
      setConnected(false);
      setRealtimeSocket(null);
    });
    socket.on("connect_error", () => {
      setConnected(false);
      setError("connectionFailed");
    });
    socket.on("presence:snapshot", setMembers);
    socket.on("presence:upsert", (member) => {
      setMembers((current) => [member, ...current.filter((item) => item.userId !== member.userId)]);
    });
    socket.on("presence:remove", (removedUserId) => {
      setMembers((current) => current.filter((member) => member.userId !== removedUserId));
    });
    socket.on("activity:warning", ({ deadlineAt }) => setWarningDeadline(deadlineAt));
    socket.on("activity:cleared", () => setWarningDeadline(null));

    let pendingSignal: number | undefined;
    let lastSentAt = 0;
    const signalActivity = () => {
      if (!socket.connected || document.visibilityState !== "visible" || !document.hasFocus()) return;
      const now = Date.now();
      const wait = ACTIVITY_SEND_INTERVAL_MS - (now - lastSentAt);
      if (wait <= 0) {
        lastSentAt = now;
        socket.emit("activity:signal");
      } else if (pendingSignal === undefined) {
        pendingSignal = window.setTimeout(() => {
          pendingSignal = undefined;
          signalActivity();
        }, wait);
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") signalActivity();
    };
    window.addEventListener("pointerdown", signalActivity, { passive: true });
    window.addEventListener("keydown", signalActivity);
    window.addEventListener("touchstart", signalActivity, { passive: true });
    window.addEventListener("focus", signalActivity);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      socketRef.current = null;
      socket.disconnect();
      if (pendingSignal !== undefined) window.clearTimeout(pendingSignal);
      window.removeEventListener("pointerdown", signalActivity);
      window.removeEventListener("keydown", signalActivity);
      window.removeEventListener("touchstart", signalActivity);
      window.removeEventListener("focus", signalActivity);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (warningDeadline) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      confirmRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [warningDeadline]);

  const update = (value: PresenceUpdate) => {
    socketRef.current?.emit("presence:update", value, (result) => {
      setError(result.ok ? null : result.error === "ROOM_FORBIDDEN" ? "roomForbidden" : "updateFailed");
    });
  };

  const confirmActivity = () => {
    socketRef.current?.emit("activity:confirm", (result) => {
      if (!result.ok) setError("activityConfirmFailed");
    });
  };

  return (
    <>
      {workspaceActive && currentRoom && workspaceView ? (
        <WorkspacePreview simpleMode={simpleMode} roomName={roomName(currentRoom)} view={workspaceView} onFailure={onSimpleMode} />
      ) : null}

      {workspaceActive ? (
        <div className="pointer-events-none fixed inset-0 z-20" aria-label={t("title")}>
          {activePanel ? null : (
            <div className="absolute left-3 top-[calc(env(safe-area-inset-top)+8.5rem)] max-w-[calc(100vw-1.5rem)] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-md dark:border-zinc-700 dark:bg-zinc-900 sm:left-4">
              <p className="font-semibold">{currentRoom ? roomName(currentRoom) : t("room")}</p>
              <p aria-live="polite" className="text-zinc-600 dark:text-zinc-300">
                {error ? t(error) : connected ? t("onlineCount", { count: members.length }) : t("reconnecting")}
              </p>
            </div>
          )}

          {activePanel === "workspace" ? (
            <section
              id="workspace-panel"
              aria-labelledby="presence-title"
              onKeyDown={(event) => {
                if (event.key === "Escape") onClosePanel();
              }}
              className="pointer-events-auto fixed inset-x-3 top-[calc(env(safe-area-inset-top)+8.5rem)] bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="presence-title" className="text-xl font-semibold">{t("title")}</h2>
                  <p aria-live="polite" className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {error ? t(error) : connected ? t("connected") : t("reconnecting")}
                  </p>
                </div>
                <button type="button" onClick={onClosePanel} className="min-h-11 cursor-pointer rounded-xl border border-zinc-300 px-4 font-semibold hover:bg-zinc-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 dark:border-zinc-600 dark:hover:bg-zinc-800">
                  {t("close")}
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                <label className="text-sm font-medium">
                  {t("status")}
                  <select value={self?.status ?? "AVAILABLE"} disabled={!connected} onChange={(event) => update({ status: event.target.value as PresenceUpdate["status"] })} className="mt-2 min-h-12 w-full cursor-pointer rounded-xl border border-zinc-300 bg-transparent px-3 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600">
                    {self?.status === "INACTIVE" ? <option value="INACTIVE">{t("statuses.INACTIVE")}</option> : null}
                    {SELECTABLE_WORK_STATUSES.map((status) => <option key={status} value={status}>{t(`statuses.${status}`)}</option>)}
                  </select>
                </label>
                <div>
                  <label className="text-sm font-medium" htmlFor="presence-room">{t("room")}</label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <select id="presence-room" value={self?.roomId ?? lobbyRoomId ?? ""} disabled={!connected} onChange={(event) => update({ roomId: event.target.value })} className="min-h-12 min-w-0 flex-1 cursor-pointer rounded-xl border border-zinc-300 bg-transparent px-3 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600">
                      {rooms.map((room) => <option key={room.id} value={room.id}>{roomName(room)}</option>)}
                    </select>
                    <button type="button" disabled={!connected || !lobbyRoomId || self?.roomId === lobbyRoomId} onClick={() => lobbyRoomId && update({ roomId: lobbyRoomId })} className="min-h-12 cursor-pointer rounded-xl border border-zinc-300 px-4 font-semibold hover:bg-zinc-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-800">
                      {t("leaveRoom")}
                    </button>
                  </div>
                </div>
              </div>

              <h3 className="mt-6 font-semibold">{t("members")}</h3>
              <ul className="mt-3 space-y-2">
                {members.map((member) => (
                  <li key={member.userId} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
                    <span className="min-w-0 truncate font-medium">{member.displayName}</span>
                    <span className="shrink-0 text-xs text-zinc-600 dark:text-zinc-300">{t(`statuses.${member.status}`)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

        </div>
      ) : null}

      <NotificationCenter
        socket={realtimeSocket}
        open={workspaceActive && activePanel === "notifications"}
        onClose={onClosePanel}
      />

      {warningDeadline ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="presentation">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="activity-warning-title"
            aria-describedby="activity-warning-description"
            onKeyDown={(event) => {
              if (event.key === "Tab") {
                event.preventDefault();
                confirmRef.current?.focus();
              }
            }}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl dark:bg-zinc-900 sm:p-8"
          >
            <h2 id="activity-warning-title" className="text-2xl font-semibold tracking-tight">
              {t("activityWarningTitle")}
            </h2>
            <p id="activity-warning-description" className="mt-3 leading-7 text-zinc-700 dark:text-zinc-200">
              {t("activityWarningDescription", {
                time: new Intl.DateTimeFormat(locale, { timeStyle: "medium" }).format(new Date(warningDeadline)),
              })}
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {t("inactivityDisclaimer")}
            </p>
            <button
              ref={confirmRef}
              type="button"
              onClick={confirmActivity}
              className="mt-6 min-h-12 w-full cursor-pointer rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800"
            >
              {t("confirmActivity")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
});
