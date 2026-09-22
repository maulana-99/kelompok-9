import { Pool, types } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// `pg` returns BIGINT (OID 20) as a string by default, so a BIGSERIAL primary
// key arrives as `"7"` even though every layer types it as a number. Row ids
// here are small and never exceed Number.MAX_SAFE_INTEGER, so parse them.
types.setTypeParser(types.builtins.INT8, (value) => Number(value));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default pool;
