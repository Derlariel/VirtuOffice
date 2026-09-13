import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import * as oidc from "openid-client";
import { prisma } from "@/server/database/client";
import { emailDomain } from "./policy";

export function entraSettings() {
  const { ENTRA_TENANT_ID: tenant, ENTRA_CLIENT_ID: clientId, ENTRA_CLIENT_SECRET: secret, APP_URL: appUrl } = process.env;
  if (!tenant || !/^[0-9a-f-]{36}$/i.test(tenant) || !clientId || !secret || !appUrl) throw new Error("AUTH_NOT_CONFIGURED");
  const origin = new URL(appUrl);
  if (origin.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && origin.protocol === "http:" && origin.hostname === "localhost")) throw new Error("AUTH_REQUIRES_HTTPS");
  return { tenant, clientId, secret, origin: origin.origin, callback: `${origin.origin}/api/auth/callback` };
}

let configuration: Promise<oidc.Configuration> | undefined;
export function entraConfiguration() {
  const { tenant, clientId, secret } = entraSettings();
  configuration ??= oidc.discovery(new URL(`https://login.microsoftonline.com/${tenant}/v2.0`), clientId, secret, undefined, {
    execute: [oidc.enableNonRepudiationChecks],
  }).catch((error) => { configuration = undefined; throw error; });
  return configuration;
}

type LoginAttempt = { state: string; nonce: string; verifier: string; createdAt: number };
export function encodeAttempt(attempt: LoginAttempt, secret: string) {
  const data = Buffer.from(JSON.stringify(attempt)).toString("base64url");
  return `${data}.${createHmac("sha256", secret).update(data).digest("base64url")}`;
}
export function decodeAttempt(cookie: string, secret: string, now = Date.now()): LoginAttempt {
  const [data, signature, extra] = cookie.split(".");
  if (!data || !signature || extra) throw new Error("INVALID_LOGIN_STATE");
  const expected = createHmac("sha256", secret).update(data).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("INVALID_LOGIN_STATE");
  const attempt = JSON.parse(Buffer.from(data, "base64url").toString()) as LoginAttempt;
  if (![attempt.state, attempt.nonce, attempt.verifier].every((value) => typeof value === "string" && value.length >= 32) || !Number.isFinite(attempt.createdAt) || now < attempt.createdAt || now - attempt.createdAt > 600_000) throw new Error("EXPIRED_LOGIN_STATE");
  return attempt;
}

// Called only with claims validated by openid-client (issuer, audience, signature, nonce and expiry).
export function entraIdentity(claims: Record<string, unknown>, tenant: string) {
  if (claims.tid !== tenant || typeof claims.oid !== "string" || !/^[0-9a-f-]{36}$/i.test(claims.oid) || claims.xms_edov !== true) throw new Error("UNVERIFIED_IDENTITY");
  const domain = emailDomain(claims.email);
  if (!domain) throw new Error("UNVERIFIED_EMAIL");
  return { subject: `${tenant}:${claims.oid}`, email: (claims.email as string).toLowerCase(), domain,
    displayName: typeof claims.name === "string" ? claims.name.slice(0, 120) : (claims.email as string).slice(0, 120) };
}

export async function createEntraSession(identity: ReturnType<typeof entraIdentity>) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1_000);
  await prisma.$transaction(async (tx) => {
    if (!(await tx.allowedEmailDomain.findUnique({ where: { domain: identity.domain } }))?.isActive) throw new Error("DOMAIN_FORBIDDEN");
    const linked = await tx.authIdentity.findUnique({
      where: { provider_providerSubject: { provider: "entra", providerSubject: identity.subject } }, include: { user: true },
    });
    // Never auto-link by mutable email: an existing account needs an explicit administrator migration.
    const user = linked?.user ?? await tx.user.create({ data: {
      email: identity.email, displayName: identity.displayName,
      authIdentities: { create: { provider: "entra", providerSubject: identity.subject, lastLoginAt: new Date() } },
      roleAssignments: { create: { role: { connect: { code: "MEMBER" } } } },
    } });
    if (user.accountStatus !== "ACTIVE" || user.deletedAt) throw new Error("ACCOUNT_FORBIDDEN");
    if (linked) {
      await tx.user.update({ where: { id: user.id }, data: { email: identity.email, displayName: identity.displayName } });
      await tx.authIdentity.update({ where: { id: linked.id }, data: { lastLoginAt: new Date() } });
    }
    await tx.authSession.create({ data: { userId: user.id, sessionTokenHash: createHash("sha256").update(token).digest("hex"), expiresAt } });
  });
  return { token, expiresAt };
}
