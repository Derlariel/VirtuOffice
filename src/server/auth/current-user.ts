import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, getUserBySessionToken } from "./session-user";

export async function getCurrentUser() {
  return getUserBySessionToken((await cookies()).get(SESSION_COOKIE_NAME)?.value);
}

export { SESSION_COOKIE_NAME } from "./session-user";
