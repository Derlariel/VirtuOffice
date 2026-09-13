"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PresencePanel, type WorkspacePanel } from "@/features/presence/presence-panel";
import { updateWorkSessionAction } from "./actions";
import { elapsedSeconds, formatDuration } from "./session-time";
import type { AttendanceActionState, WorkSessionView } from "./types";

const SYNC_INTERVAL_MS = 15_000;
const CHANNEL_NAME = "virtuoffice-work-session";

type Props = {
  displayName: string;
  userId: string;
  rooms: { id: string; slug: string; name: string }[];
  initialSession: WorkSessionView | null;
  initialServerNow: string;
};

export function WorkSessionPanel({ displayName, userId, rooms, initialSession, initialServerNow }: Props) {
  const t = useTranslations("Attendance");
  const hud = useTranslations("WorkspaceHUD");
  const locale = useLocale();
  const [session, setSession] = useState(initialSession);
  const [nowMs, setNowMs] = useState(() => Date.parse(initialServerNow));
  const [syncIssue, setSyncIssue] = useState(false);
  const [activePanel, setActivePanel] = useState<WorkspacePanel>(null);
  const [simpleMode, setSimpleMode] = useState(false);
  const [feedback, setFeedback] = useState<
    Pick<AttendanceActionState, "event" | "error"> | null
  >(null);
  const initialActionState: AttendanceActionState = {
    revision: 0,
    serverNow: initialServerNow,
    session: initialSession,
    event: null,
    error: null,
  };
  const [, formAction, pending] = useActionState(async (
    previous: AttendanceActionState,
    formData: FormData,
  ) => {
    let next: AttendanceActionState;
    try {
      next = await updateWorkSessionAction(previous, formData);
    } catch {
      next = {
        ...previous,
        revision: Date.now(),
        serverNow: new Date().toISOString(),
        error: "UPDATE_FAILED",
      };
    }

    setSession(next.session);
    setNowMs(Date.parse(next.serverNow));
    setFeedback({ event: next.event, error: next.error });

    if (!next.error && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage("changed");
      channel.close();
    }

    return next;
  }, initialActionState);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/work-session", { cache: "no-store" });
      if (response.status === 401) {
        setSession(null);
        setFeedback({ event: null, error: "UNAUTHENTICATED" });
        setSyncIssue(false);
        return;
      }
      if (!response.ok) throw new Error("Session sync failed");
      const snapshot = (await response.json()) as {
        serverNow: string;
        session: WorkSessionView | null;
      };
      setSession(snapshot.session);
      setNowMs(Date.parse(snapshot.serverNow));
      setFeedback(null);
      setSyncIssue(false);
    } catch {
      setSyncIssue(true);
    }
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshSession();
    };
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;
    if (channel) channel.onmessage = () => void refreshSession();

    window.addEventListener("focus", refreshSession);
    window.addEventListener("online", refreshSession);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshSession();
    }, SYNC_INTERVAL_MS);

    return () => {
      channel?.close();
      window.removeEventListener("focus", refreshSession);
      window.removeEventListener("online", refreshSession);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  const duration = session
    ? formatDuration(elapsedSeconds(session.checkInAt, session.checkOutAt, nowMs))
    : "00:00:00";
  const checkInTime = session
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
      }).format(new Date(session.checkInAt))
    : null;

  const closePanel = useCallback(() => setActivePanel(null), []);
  const attendanceCard = (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${session ? "bg-emerald-500" : "bg-zinc-400"}`} />
        <p className="font-medium">{session ? t("checkedIn") : t("checkedOut")}</p>
      </div>
      <dl className="mt-6 space-y-5">
        <div>
          <dt className="text-sm text-zinc-500 dark:text-zinc-400">{t("duration")}</dt>
          <dd aria-label={`${t("duration")}: ${duration}`} className="mt-1 font-mono text-4xl font-semibold tabular-nums tracking-tight">{duration}</dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-500 dark:text-zinc-400">{t("checkInTime")}</dt>
          <dd className="mt-1 font-medium">{checkInTime ? <time dateTime={session?.checkInAt}>{checkInTime}</time> : t("notStarted")}</dd>
        </div>
      </dl>
      <form action={formAction} className="mt-6">
        <button type="submit" name="intent" value={session ? "check-out" : "check-in"} disabled={pending} className={`min-h-12 w-full cursor-pointer rounded-xl px-5 py-3 font-semibold text-white transition-colors focus-visible:outline-3 focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:opacity-50 ${session ? "bg-rose-700 hover:bg-rose-800 focus-visible:outline-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500" : "bg-indigo-700 hover:bg-indigo-800 focus-visible:outline-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"}`}>
          {pending ? t("updating") : session ? t("checkOut") : t("checkIn")}
        </button>
      </form>
      <div aria-live="polite" className="mt-4 min-h-6 text-sm text-zinc-600 dark:text-zinc-300">
        {feedback?.error ? t(`errors.${feedback.error}`) : null}
        {!feedback?.error && feedback?.event ? t(`events.${feedback.event}`) : null}
        {!feedback?.error && !feedback?.event && syncIssue ? t("syncIssue") : null}
      </div>
    </div>
  );

  return (
    <main id="main-content" className={session ? "fixed inset-0 h-dvh w-screen overflow-hidden" : "mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-6 sm:px-8 sm:py-10"}>
      <PresencePanel
        userId={userId}
        rooms={rooms}
        workspaceActive={Boolean(session)}
        simpleMode={simpleMode}
        activePanel={activePanel}
        onClosePanel={closePanel}
      />

      {session ? (
        <div className="pointer-events-none fixed inset-0 z-20">
          <header className="pointer-events-auto absolute inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 sm:inset-x-4">
            <div className="min-w-0">
              <h1 className="truncate font-semibold tracking-tight">VirtuOffice</h1>
              <p className="truncate text-xs text-zinc-600 dark:text-zinc-300">{displayName}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <p className="hidden items-center gap-2 text-sm font-medium sm:flex">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {t("checkedIn")}
              </p>
              <p aria-label={`${t("duration")}: ${duration}`} className="font-mono text-sm font-semibold tabular-nums sm:text-base">{duration}</p>
              <button type="button" aria-pressed={simpleMode} onClick={() => setSimpleMode((value) => !value)} className="min-h-11 cursor-pointer rounded-xl border border-zinc-300 px-3 text-sm font-semibold hover:bg-zinc-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 dark:border-zinc-600 dark:hover:bg-zinc-800">
                {simpleMode ? hud("enable3d") : hud("simpleMode")}
              </button>
            </div>
          </header>

          <nav aria-label={hud("panels")} className="pointer-events-auto absolute inset-x-3 top-[calc(env(safe-area-inset-top)+5rem)] grid grid-cols-4 gap-2 sm:inset-x-auto sm:right-4 sm:w-[30rem]">
            {(["workspace", "tasks", "dashboard", "notifications"] as const).map((panel) => (
              <button
                key={panel}
                type="button"
                aria-pressed={activePanel === panel}
                aria-controls={`${panel}-panel`}
                onClick={() => setActivePanel((current) => current === panel ? null : panel)}
                className="min-h-11 cursor-pointer rounded-xl border border-zinc-200 bg-white px-2 text-xs font-semibold shadow-md hover:bg-zinc-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 sm:text-sm"
              >
                {hud(panel)}
              </button>
            ))}
          </nav>

          {activePanel === "dashboard" ? (
            <section id="dashboard-panel" aria-labelledby="dashboard-title" onKeyDown={(event) => { if (event.key === "Escape") closePanel(); }} className="pointer-events-auto fixed inset-x-3 top-[calc(env(safe-area-inset-top)+8.5rem)] bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 overflow-y-auto rounded-2xl sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96">
              <div className="mb-2 flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-2 shadow-md dark:border-zinc-700 dark:bg-zinc-900">
                <h2 id="dashboard-title" className="font-semibold">{hud("dashboard")}</h2>
                <button type="button" onClick={closePanel} className="min-h-11 cursor-pointer rounded-lg px-3 font-semibold hover:bg-zinc-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 dark:hover:bg-zinc-800">{hud("close")}</button>
              </div>
              {attendanceCard}
            </section>
          ) : null}

          {activePanel === "tasks" ? (
            <section id="tasks-panel" aria-labelledby="tasks-title" onKeyDown={(event) => { if (event.key === "Escape") closePanel(); }} className="pointer-events-auto fixed inset-x-3 top-[calc(env(safe-area-inset-top)+8.5rem)] z-30 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 sm:inset-x-auto sm:right-4 sm:w-96">
              <div className="flex items-center justify-between gap-3">
                <h2 id="tasks-title" className="text-xl font-semibold">{hud("tasks")}</h2>
                <button type="button" onClick={closePanel} className="min-h-11 cursor-pointer rounded-xl border border-zinc-300 px-4 font-semibold hover:bg-zinc-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 dark:border-zinc-600 dark:hover:bg-zinc-800">{hud("close")}</button>
              </div>
              <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-300">{hud("tasksPlaceholder")}</p>
            </section>
          ) : null}
        </div>
      ) : (
        <>
          <header className="mb-12 flex items-center justify-between gap-4">
            <span className="text-lg font-semibold tracking-tight">VirtuOffice</span>
            <span className="min-w-0 truncate text-sm font-medium text-zinc-600 dark:text-zinc-300">{displayName}</span>
          </header>
          <section aria-labelledby="attendance-title" className="my-auto grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-center">
            <div className="max-w-xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-300">{t("eyebrow")}</p>
              <h1 id="attendance-title" className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{t("readyTitle")}</h1>
              <p className="mt-4 max-w-lg text-pretty text-base leading-7 text-zinc-600 dark:text-zinc-300">{t("readyDescription")}</p>
            </div>
            {attendanceCard}
          </section>
          <p className="mt-12 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{t("recoveryNote")}</p>
        </>
      )}
    </main>
  );
}
