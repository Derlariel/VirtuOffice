export function emailDomain(email: unknown): string | null {
  if (typeof email !== "string" || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email.slice(email.indexOf("@") + 1).toLowerCase();
}

export function isAllowedOrigin(origin: string | undefined, expected: string) {
  try { return Boolean(origin) && new URL(origin!).origin === new URL(expected).origin; }
  catch { return false; }
}
