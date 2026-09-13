import { NextRequest, NextResponse } from "next/server";
import * as oidc from "openid-client";
import { createHash } from "node:crypto";
import { prisma } from "@/server/database/client";
import { SESSION_COOKIE_NAME } from "@/server/auth/session-user";
import { isAllowedOrigin } from "@/server/auth/policy";
import { createEntraSession, decodeAttempt, encodeAttempt, entraConfiguration, entraIdentity, entraSettings } from "@/server/auth/entra";

export const runtime = "nodejs";
const ATTEMPT_COOKIE = "vo_login";
const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/api/auth" };

export async function GET(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action !== "signin" && action !== "callback") return new NextResponse(null, { status: 404 });
  try {
    const settings = entraSettings();
    if (action === "signin") {
      const attempt = { state: oidc.randomState(), nonce: oidc.randomNonce(), verifier: oidc.randomPKCECodeVerifier(), createdAt: Date.now() };
      const url = oidc.buildAuthorizationUrl(await entraConfiguration(), {
        redirect_uri: settings.callback, scope: "openid profile email", response_mode: "query",
        code_challenge_method: "S256", code_challenge: await oidc.calculatePKCECodeChallenge(attempt.verifier),
        state: attempt.state, nonce: attempt.nonce,
      });
      const response = NextResponse.redirect(url);
      response.cookies.set(ATTEMPT_COOKIE, encodeAttempt(attempt, settings.secret), { ...cookieOptions, maxAge: 600 });
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    const attempt = decodeAttempt(request.cookies.get(ATTEMPT_COOKIE)?.value ?? "", settings.secret);
    const callback = new URL(settings.callback);
    callback.search = request.nextUrl.search;
    const tokens = await oidc.authorizationCodeGrant(await entraConfiguration(), callback, {
      pkceCodeVerifier: attempt.verifier, expectedState: attempt.state, expectedNonce: attempt.nonce, idTokenExpected: true,
    });
    const claims = tokens.claims();
    if (!claims) throw new Error("MISSING_ID_TOKEN");
    const session = await createEntraSession(entraIdentity(claims, settings.tenant));
    const response = NextResponse.redirect(new URL("/", settings.origin));
    response.cookies.set(ATTEMPT_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    response.cookies.set(SESSION_COOKIE_NAME, session.token, { ...cookieOptions, path: "/", expires: session.expiresAt });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    // Do not log codes, tokens, claims or provider error responses.
    const response = NextResponse.redirect(new URL("/unauthorized", request.url));
    response.cookies.set(ATTEMPT_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    return response;
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  if ((await params).action !== "signout") return new NextResponse(null, { status: 404 });
  const origin = process.env.APP_URL ?? request.nextUrl.origin;
  if (!isAllowedOrigin(request.headers.get("origin") ?? undefined, origin)) return new NextResponse(null, { status: 403 });
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) await prisma.authSession.updateMany({ where: { sessionTokenHash: createHash("sha256").update(token).digest("hex") }, data: { revokedAt: new Date() } });
  const response = NextResponse.redirect(new URL("/", origin), 303);
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...cookieOptions, path: "/", maxAge: 0 });
  return response;
}
