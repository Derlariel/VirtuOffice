import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import {
  getActiveWorkSession,
  toWorkSessionView,
} from "@/features/attendance/work-session-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const session = await getActiveWorkSession(user.id);
  return NextResponse.json(
    {
      serverNow: new Date().toISOString(),
      session: session ? toWorkSessionView(session) : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
