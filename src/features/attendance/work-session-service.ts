import { Prisma } from "@prisma/client";
import { prisma } from "@/server/database/client";
import type { WorkSessionView } from "./types";
import { publishWorkSessionClosed } from "@/server/realtime/notification-bus";

const sessionSelect = {
  id: true,
  status: true,
  checkInAt: true,
  checkOutAt: true,
  durationSeconds: true,
} satisfies Prisma.WorkSessionSelect;

type SelectedSession = Prisma.WorkSessionGetPayload<{
  select: typeof sessionSelect;
}>;

export function toWorkSessionView(session: SelectedSession): WorkSessionView {
  return {
    ...session,
    checkInAt: session.checkInAt.toISOString(),
    checkOutAt: session.checkOutAt?.toISOString() ?? null,
  };
}

export async function getActiveWorkSession(userId: string) {
  return prisma.workSession.findFirst({
    where: { userId, status: "OPEN" },
    orderBy: { checkInAt: "desc" },
    select: sessionSelect,
  });
}

export async function checkIn(userId: string) {
  const existing = await getActiveWorkSession(userId);
  if (existing) return existing;

  try {
    return await prisma.workSession.create({
      data: { userId },
      select: sessionSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const concurrentSession = await getActiveWorkSession(userId);
      if (concurrentSession) return concurrentSession;
    }

    throw error;
  }
}

export async function checkOut(userId: string) {
  const closed = await prisma.$transaction(async (transaction) => {
    const active = await transaction.workSession.findFirst({
      where: { userId, status: "OPEN" },
      orderBy: { checkInAt: "desc" },
      select: sessionSelect,
    });
    if (!active) return null;

    const checkOutAt = new Date();
    const durationSeconds = Math.max(
      0,
      Math.floor((checkOutAt.getTime() - active.checkInAt.getTime()) / 1000),
    );
    const retentionExpiresAt = new Date(checkOutAt.getTime() + 365 * 24 * 60 * 60 * 1000);

    const result = await transaction.workSession.updateMany({
      where: { id: active.id, status: "OPEN" },
      data: {
        status: "CLOSED",
        checkOutAt,
        durationSeconds,
        retentionExpiresAt,
      },
    });

    if (result.count === 0) return null;
    return transaction.workSession.findUniqueOrThrow({
      where: { id: active.id },
      select: sessionSelect,
    });
  });
  publishWorkSessionClosed(userId);
  return closed;
}
