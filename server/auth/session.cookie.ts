import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/lib/constants";
import { SESSION_TTL_MS, resolveSession, type PublicUser } from "./auth.service";

/**
 * Session cookie adapter. Keeps Next.js request APIs (`cookies()`) out of the
 * service layer so the auth logic stays testable and transport-agnostic.
 */

const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
/** Length of a base64url-encoded 32-byte token. */
const TOKEN_LENGTH = 43;

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function readSessionCookie(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Authoritative "who is logged in" check. The proxy only inspects cookie
 * presence, so pages and Server Actions call this before trusting a request.
 */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const token = await readSessionCookie();
  if (!token || token.length !== TOKEN_LENGTH) return null;
  return resolveSession(token);
}
