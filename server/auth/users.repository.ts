import "server-only";

import { getDb } from "@/server/db";

export type UserRecord = {
  id: number;
  username: string;
  passwordHash: string;
};

export type NewUser = {
  username: string;
  passwordHash: string;
};

export class UserAlreadyExistsError extends Error {
  constructor(username: string) {
    super(`Username "${username}" is already registered.`);
    this.name = "UserAlreadyExistsError";
  }
}

// PostgreSQL unique-violation code (23505).
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "23505"
  );
}

export async function findUserByUsername(
  username: string,
): Promise<UserRecord | null> {
  const db = await getDb();
  const { rows } = await db.query(
    "SELECT id, username, password_hash FROM users WHERE LOWER(username) = LOWER($1)",
    [username],
  );

  const row = rows[0];
  if (!row) return null;
  return { id: row.id, username: row.username, passwordHash: row.password_hash };
}

export async function findUserById(id: number): Promise<UserRecord | null> {
  const db = await getDb();
  const { rows } = await db.query(
    "SELECT id, username, password_hash FROM users WHERE id = $1",
    [id],
  );

  const row = rows[0];
  if (!row) return null;
  return { id: row.id, username: row.username, passwordHash: row.password_hash };
}

export async function insertUser(user: NewUser): Promise<{ id: number }> {
  try {
    const db = await getDb();
    const { rows } = await db.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id",
      [user.username, user.passwordHash],
    );

    return { id: rows[0].id };
  } catch (error) {
    if (isUniqueViolation(error)) throw new UserAlreadyExistsError(user.username);
    throw error;
  }
}
