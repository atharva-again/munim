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
  await pool.query(
    `CREATE INDEX IF NOT EXISTS munim_conversations_account_expires_idx ON munim_conversations(business_id,expires_at)`,
  );
  await pool.query(`CREATE TABLE IF NOT EXISTS munim_preferences (
    business_id text PRIMARY KEY, language text NOT NULL CHECK (language IN ('en', 'hi')),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await pool.query(
    `ALTER TABLE munim_preferences ADD COLUMN IF NOT EXISTS approval_mode text CHECK (approval_mode IN ('approval', 'autonomous'))`,
  );
  await pool.query(`ALTER TABLE munim_preferences ADD COLUMN IF NOT EXISTS shop_name text CHECK (char_length(btrim(shop_name)) BETWEEN 1 AND 80)`);
  await pool.query(`ALTER TABLE IF EXISTS munim_transactions ADD COLUMN IF NOT EXISTS display_text jsonb`);
  await pool.query(`CREATE TABLE IF NOT EXISTS munim_conversation_history (
    id uuid PRIMARY KEY, business_id text NOT NULL, messages jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS munim_conversation_history_account_updated_idx ON munim_conversation_history(business_id,updated_at)`);
  await pool.query(`INSERT INTO munim_conversation_history(id,business_id,messages,updated_at)
    SELECT id,business_id,state->'messages',expires_at-interval '12 hours'
    FROM munim_conversations WHERE jsonb_array_length(coalesce(state->'messages','[]'::jsonb))>0
    ON CONFLICT(id) DO NOTHING`);
  await pool.query(
    `ALTER TABLE IF EXISTS munim_transactions ADD COLUMN IF NOT EXISTS approval_mode text NOT NULL DEFAULT 'approval' CHECK (approval_mode IN ('approval', 'autonomous'))`,
  );
  await pool.query(`CREATE TABLE IF NOT EXISTS munim_memory_scopes (
    business_id text PRIMARY KEY, name text NOT NULL UNIQUE, datapack_id text,
    status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready','failed')),
    attempts integer NOT NULL DEFAULT 0, lease_token text, lease_until timestamptz,
    retry_at timestamptz NOT NULL DEFAULT now()
  )`);
  await pool.query(
    `ALTER TABLE munim_memory_scopes ADD COLUMN IF NOT EXISTS provider_conversation_id text`,
  );
  await pool.query(`ALTER TABLE munim_memory_scopes ADD COLUMN IF NOT EXISTS recall_revision integer NOT NULL DEFAULT 0`);
  await pool.query(`CREATE TABLE IF NOT EXISTS munim_memory_captures (
    request_id uuid PRIMARY KEY, business_id text NOT NULL, conversation_id uuid NOT NULL,
    revision integer NOT NULL, input text NOT NULL, output text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','done','failed')),
    attempts integer NOT NULL DEFAULT 0, lease_token text, lease_until timestamptz,
    retry_at timestamptz NOT NULL DEFAULT now(), UNIQUE(conversation_id,revision)
  )`);
  await pool.query(
    `ALTER TABLE munim_memory_captures ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`,
  );
  await pool.query(`ALTER TABLE munim_memory_captures ADD COLUMN IF NOT EXISTS capture_kind text NOT NULL DEFAULT 'conversation'`);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS munim_memory_captures_retry_idx ON munim_memory_captures(status,retry_at)`,
  );
  await pool.query(`CREATE TABLE IF NOT EXISTS munim_memory_items (
    business_id text NOT NULL, memory_id text NOT NULL, text text NOT NULL,
    source text NOT NULL, editable text NOT NULL DEFAULT 'no', UNIQUE(business_id,memory_id)
  )`);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE munim_preferences SET language='hi' WHERE language='hinglish'",
    );
    await client.query(
      "ALTER TABLE munim_preferences DROP CONSTRAINT IF EXISTS munim_preferences_language_check",
    );
    await client.query(
      "ALTER TABLE munim_preferences ADD CONSTRAINT munim_preferences_language_check CHECK (language IN ('en', 'hi'))",
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  await pool.query(`DROP TABLE IF EXISTS munim_payment_requests`);
  await pool.query(`DROP TABLE IF EXISTS munim_webhook_events`);
  await pool.query(`ALTER TABLE IF EXISTS munim_settlements
    DROP COLUMN IF EXISTS source,
    DROP COLUMN IF EXISTS provider_reference,
    DROP COLUMN IF EXISTS provider_event_id`);
  await pool.query(`DROP TYPE IF EXISTS munim_settlement_source`);
  console.info("Auth, conversation and preference tables are ready.");
} finally {
  await pool.end();
}
