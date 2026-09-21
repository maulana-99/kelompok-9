import "server-only";

import { randomBytes } from "node:crypto";

import { getDb } from "@/server/db";

const TOKEN_BYTES = 32;

export type SessionRecord = {
  userId: number;
  expiresAt: number;
};

// Opaque token (not a JWT): deleting the row is what revokes the session.
export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export async function insertSession(
  token: string,
  userId: number,
  expiresAt: number,
): Promise<void> {
  const db = await getDb();
  await db.query(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)",
    [token, userId, expiresAt],
  );
}

export async function findLiveSession(
  token: string,
): Promise<SessionRecord | null> {
  const db = await getDb();
  const { rows } = await db.query(
    "SELECT user_id, expires_at FROM sessions WHERE token = $1",
    [token],
  );

  const row = rows[0];
  if (!row) return null;

  if (row.expires_at <= Date.now()) {
    await deleteSessionByToken(token);
    return null;
  }

  return { userId: row.user_id, expiresAt: row.expires_at };
}

export async function deleteSessionByToken(token: string): Promise<void> {
  const db = await getDb();
  await db.query("DELETE FROM sessions WHERE token = $1", [token]);
}

export async function deleteExpiredSessions(): Promise<void> {
  const db = await getDb();
  await db.query("DELETE FROM sessions WHERE expires_at <= $1", [Date.now()]);
}
