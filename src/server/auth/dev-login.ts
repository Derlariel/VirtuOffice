"use server";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/server/database/client";
import { SESSION_COOKIE_NAME } from "./session-user";

export async function devLogin() {
  if (process.env.NODE_ENV !== "development") throw new Error("Dev login is disabled");

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const user = await prisma.user.upsert({
    where: { email: "dev@kmutt.ac.th" },
    update: { accountStatus: "ACTIVE", deletedAt: null },
    create: { email: "dev@kmutt.ac.th", displayName: "Dev User" },
  });

  await prisma.authSession.create({
    data: {
      userId: user.id,
      sessionTokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt,
    },
  });
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  redirect("/");
}
