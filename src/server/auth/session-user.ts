import { createHash } from "node:crypto";
import { prisma } from "@/server/database/client";

export const SESSION_COOKIE_NAME = "vo_session";

export async function getUserBySessionToken(token: string | undefined) {
  if (!token) return null;

  const sessionTokenHash = createHash("sha256").update(token).digest("hex");
  const session = await prisma.authSession.findUnique({
    where: { sessionTokenHash },
    select: {
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          displayName: true,
          accountStatus: true,
          deletedAt: true,
        },
      },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    session.user.accountStatus !== "ACTIVE" ||
    session.user.deletedAt
  ) return null;

  return { id: session.user.id, displayName: session.user.displayName };
}
