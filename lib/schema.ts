import { sql } from "drizzle-orm";
import { bigserial, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Case-insensitive unique so "Alice" and "alice" are treated as the same
    // account. Postgres code 23505 is checked on INSERT to surface a clean
    // "username taken" error without a separate SELECT first.
    uniqueIndex("users_username_lower_idx").on(sql`lower(${table.username})`),
  ],
);
