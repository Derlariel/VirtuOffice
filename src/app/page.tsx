import { getTranslations } from "next-intl/server";
import { WorkSessionPanel } from "@/features/attendance/work-session-panel";
import {
  getActiveWorkSession,
  toWorkSessionView,
} from "@/features/attendance/work-session-service";
import { getCurrentUser } from "@/server/auth/current-user";
import { getAccessibleRooms } from "@/features/presence/presence-service";
import { devLogin } from "@/server/auth/dev-login";
import { cookies } from "next/headers";
import { entraSettings } from "@/server/auth/entra";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    const t = await getTranslations("Authentication");
    let signInConfigured = false;
    try { entraSettings(); signInConfigured = true; } catch { /* Local development may not have Entra credentials. */ }
    return (
      <main id="main-content" className="grid min-h-dvh place-items-center px-4 py-12">
        <div className="max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">VirtuOffice</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("requiredTitle")}</h1>
          <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-300">{t("requiredDescription")}</p>
          {signInConfigured ? <form action="/api/auth/signin" method="get"><button className="mt-6 min-h-12 w-full cursor-pointer rounded-xl bg-indigo-700 p-3 font-semibold text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">{t("signIn")}</button></form> : <p className="mt-4 text-sm">{t("unavailable")}</p>}
          {process.env.NODE_ENV === "development" ? (
            <form action={devLogin} className="mt-6">
              <button
                type="submit"
                className="min-h-12 w-full cursor-pointer rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-indigo-700"
              >
                {t("devLogin")}
              </button>
            </form>
          ) : null}
        </div>
      </main>
    );
  }

  const [session, rooms] = await Promise.all([
    getActiveWorkSession(user.id),
    getAccessibleRooms(),
  ]);
  return (
    <WorkSessionPanel
      displayName={user.displayName}
      userId={user.id}
      rooms={rooms}
      initialSession={session ? toWorkSessionView(session) : null}
      initialServerNow={new Date().toISOString()}
      initialSimpleMode={(await cookies()).get("simple-mode")?.value === "1"}
    />
  );
}
