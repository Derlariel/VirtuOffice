"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/features/presence/types";
import type { NotificationView } from "./types";

type Props = {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  open: boolean;
  onClose: () => void;
};

export function NotificationCenter({ socket, open, onClose }: Props) {
  const t = useTranslations("Notifications");
  const locale = useLocale();
  const [notifications, setNotifications] = useState<NotificationView[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (cursor?: string) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ limit: "30" });
      if (cursor) query.set("cursor", cursor);
      const response = await fetch(`/api/notifications?${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Notification history failed");
      const result = await response.json() as {
        notifications: NotificationView[];
        unreadCount: number;
        nextCursor: string | null;
      };
      setNotifications((current) => {
        const receivedIds = new Set(result.notifications.map((item) => item.id));
        return cursor
          ? [...current, ...result.notifications.filter((item) => !current.some((saved) => saved.id === item.id))]
          : [...current.filter((item) => !receivedIds.has(item.id)), ...result.notifications];
      });
      setUnreadCount((count) => cursor ? result.unreadCount : Math.max(count, result.unreadCount));
      setNextCursor(result.nextCursor);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onNotification = (notification: NotificationView) => {
      setNotifications((current) => [
        notification,
        ...current.filter((item) => item.id !== notification.id),
      ]);
      setUnreadCount((count) => count + 1);
    };
    socket.on("notification:new", onNotification);
    return () => {
      socket.off("notification:new", onNotification);
    };
  }, [socket]);

  const setRead = async (notification: NotificationView, read: boolean) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notification.id, read }),
      });
      if (!response.ok) throw new Error("Notification update failed");
      setNotifications((current) => current.map((item) =>
        item.id === notification.id
          ? { ...item, readAt: read ? new Date().toISOString() : null }
          : item
      ));
      setUnreadCount((count) => Math.max(0, count + (read ? -1 : 1)));
      setError(false);
    } catch {
      setError(true);
    }
  };

  const markAllRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, read: true }),
      });
      if (!response.ok) throw new Error("Notification update failed");
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, readAt })));
      setUnreadCount(0);
      setError(false);
    } catch {
      setError(true);
    }
  };

  if (!open) return null;

  return (
    <section
      id="notifications-panel"
      aria-labelledby="notifications-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className="pointer-events-auto fixed inset-x-3 top-[calc(env(safe-area-inset-top)+8.5rem)] bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="notifications-title" className="text-xl font-semibold">{t("title")}</h2>
          <p aria-live="polite" className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {error ? t("loadFailed") : t("unreadCount", { count: unreadCount })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 cursor-pointer rounded-xl border border-zinc-300 px-4 font-semibold hover:bg-zinc-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 dark:border-zinc-600 dark:hover:bg-zinc-800 dark:focus-visible:outline-indigo-400"
        >
          {t("close")}
        </button>
      </div>

      <div className="mt-6">
          {error ? (
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-11 cursor-pointer text-sm font-semibold text-indigo-700 underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 dark:text-indigo-300"
            >
              {t("retry")}
            </button>
          ) : null}
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="min-h-11 cursor-pointer text-sm font-semibold text-indigo-700 underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 dark:text-indigo-300"
            >
              {t("markAllRead")}
            </button>
          ) : null}

          {loading && notifications.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">{t("loading")}</p>
          ) : !loading && notifications.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">{t("empty")}</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => void setRead(notification, notification.readAt === null)}
                    className="min-h-12 w-full cursor-pointer rounded-xl border border-zinc-200 px-4 py-3 text-left hover:bg-zinc-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:focus-visible:outline-indigo-400"
                  >
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className={notification.readAt ? "font-medium" : "font-semibold"}>
                        {t(`types.${notification.type}`, {
                          name: notification.actorName ?? t("someone"),
                        })}
                      </span>
                      {notification.readAt ? null : (
                        <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100">
                          {t("unread")}
                        </span>
                      )}
                    </span>
                    <time
                      dateTime={notification.createdAt}
                      className="mt-1 block text-xs text-zinc-600 dark:text-zinc-300"
                    >
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(notification.createdAt))}
                    </time>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {nextCursor ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => void load(nextCursor)}
              className="mt-4 min-h-11 cursor-pointer rounded-xl border border-zinc-300 px-4 text-sm font-semibold hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              {loading ? t("loading") : t("loadMore")}
            </button>
          ) : null}
      </div>
    </section>
  );
}
