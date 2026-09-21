import "server-only";

import { Pool, types } from "pg";

const DEFAULT_URL = "postgresql://postgres@localhost:5432/postgres";

// `pg` returns BIGINT (OID 20) as a string by default; ids and epoch-ms
// timestamps fit in a JS number, so parse them as such.
types.setTypeParser(types.builtins.INT8, (value) => Number(value));

export function resolveDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || DEFAULT_URL;
}

function redact(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return url;
  }
}

const globalForDb = globalThis as unknown as {
  __dbPromise?: Promise<Pool>;
};

async function migrate(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            BIGSERIAL PRIMARY KEY,
      username      TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx
      ON users (LOWER(username));

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at BIGINT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
  `);
}

export async function getDb(): Promise<Pool> {
  if (!globalForDb.__dbPromise) {
    globalForDb.__dbPromise = (async () => {
      const pool = new Pool({ connectionString: resolveDatabaseUrl() });

      if (process.env.NODE_ENV !== "production") {
        console.log(`[db] PostgreSQL: ${redact(resolveDatabaseUrl())}`);
      }

      await migrate(pool);
      return pool;
    })();
  }

  return globalForDb.__dbPromise;
}
