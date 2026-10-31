import { config } from "dotenv";
import { getMigrations } from "better-auth/db/migration";
import { authTables } from "../auth.js";
import { getPool } from "../db/index.js";
config({ path: "../../.env" });
config();
const pool = getPool();
if (!pool) throw new Error("DATABASE_URL is required.");
try {
  const auth = await getMigrations({
    database: pool,
    ...authTables,
    advanced: { database: { generateId: "uuid" } },
  });
  await auth.runMigrations();
  await pool.query(`CREATE TABLE IF NOT EXISTS munim_conversations (
    id uuid PRIMARY KEY, business_id text NOT NULL, token_hash text NOT NULL,
    auth_session_id text NOT NULL,
    state jsonb NOT NULL, receipts jsonb NOT NULL DEFAULT '{}'::jsonb,
    expires_at timestamptz NOT NULL
  )`);
  await pool.query(
    `ALTER TABLE munim_conversations ADD COLUMN IF NOT EXISTS auth_session_id text`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS munim_conversations_expires_idx ON munim_conversations(expires_at)`,
  );
  await pool.query(`CREATE TABLE IF NOT EXISTS munim_preferences (
    business_id text PRIMARY KEY, language text NOT NULL CHECK (language IN ('en', 'hi', 'hinglish')),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  console.info("Auth, conversation and preference tables are ready.");
} finally {
  await pool.end();
}
