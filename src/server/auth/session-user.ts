import { createHash } from "node:crypto";
import { prisma } from "@/server/database/client";
import { emailDomain } from "./policy";

export const SESSION_COOKIE_NAME = "vo_session";

export async function getUserBySessionToken(token: string | undefined) {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;

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
          email: true,
          roleAssignments: {
            where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
            select: { role: { select: { code: true } } },
          },
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

  const domain = emailDomain(session.user.email);
  if (!domain || !(await prisma.allowedEmailDomain.findUnique({ where: { domain } }))?.isActive) return null;

  return {
    id: session.user.id,
    displayName: session.user.displayName,
    roles: session.user.roleAssignments.map(({ role }) => role.code),
  };
}
