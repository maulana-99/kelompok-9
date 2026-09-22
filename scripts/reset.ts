import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

(async () => {
  console.log("Resetting database...");
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE;");
  
  console.log("Applying migrations...");
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  await migrate(db, { migrationsFolder });
  
  console.log("Database reset complete. ✅");
  await pool.end();
})();
