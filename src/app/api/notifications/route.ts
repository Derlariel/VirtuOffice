import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import {
  countUnreadNotifications,
  listNotifications,
  setNotificationReadState,
} from "@/features/notifications/notification-service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 30);
  if ((cursor && !UUID.test(cursor)) || !Number.isInteger(requestedLimit)) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  const limit = Math.min(50, Math.max(1, requestedLimit));
  const [history, unreadCount] = await Promise.all([
    listNotifications(user.id, limit, cursor),
    countUnreadNotifications(user.id),
  ]);
  return NextResponse.json(
    { ...history, unreadCount },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  const { id, all, read } = body as Record<string, unknown>;
  if (
    typeof read !== "boolean" ||
    (all !== true && (typeof id !== "string" || !UUID.test(id))) ||
    (all === true && id !== undefined)
  ) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const result = await setNotificationReadState(
    user.id,
    read,
    all === true ? undefined : id as string,
  );
  if (all !== true && result.count === 0) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ updated: result.count });
}
