import "server-only";

import {
  loginUser,
  logoutUser,
  registerUser,
  resolveSession,
  type PublicUser,
} from "@/server/auth/auth.service";
import {
  clearSessionCookie,
  readSessionCookie,
  setSessionCookie,
} from "@/server/auth/session.cookie";

export type { PublicUser };

// Authoritative "who is logged in" check; the proxy only inspects cookie presence.
export async function getCurrentUser(): Promise<PublicUser | null> {
  return resolveSession(await readSessionCookie());
}

export async function signUp(raw: {
  username: unknown;
  password: unknown;
}): Promise<PublicUser> {
  const { user, token } = await registerUser(raw);
  await setSessionCookie(token);
  return user;
}

export async function signIn(raw: {
  username: unknown;
  password: unknown;
}): Promise<PublicUser> {
  const { user, token } = await loginUser(raw);
  await setSessionCookie(token);
  return user;
}

export async function signOut(): Promise<void> {
  await logoutUser(await readSessionCookie());
  await clearSessionCookie();
}
