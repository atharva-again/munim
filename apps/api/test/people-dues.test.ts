import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { readPeopleDues } from "../src/services/people-dues.js";

config({ path: "../../.env" });

test("a person search totals only matching outstanding balances", { skip: !process.env.DATABASE_URL }, async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE TEMP TABLE munim_transactions (
      id uuid PRIMARY KEY, business_id text, counterparty text, display_text jsonb,
      occurred_at timestamptz, amount_paise bigint, direction text
    ) ON COMMIT DROP`);
    await client.query(`CREATE TEMP TABLE munim_settlements (
      transaction_id uuid, business_id text, occurred_at timestamptz, amount_paise bigint
    ) ON COMMIT DROP`);
    await client.query(`INSERT INTO munim_transactions VALUES
      ('da6789b3-672c-4bdd-84bb-fd8a76082001', 'test', 'Asha', NULL, now(), 50000, 'inflow'),
      ('da6789b3-672c-4bdd-84bb-fd8a76082002', 'test', 'Bela', NULL, now(), 70000, 'inflow'),
      ('da6789b3-672c-4bdd-84bb-fd8a76082003', 'other-account', 'Asha', NULL, now(), 90000, 'inflow')`);
    await client.query(`INSERT INTO munim_settlements VALUES
      ('da6789b3-672c-4bdd-84bb-fd8a76082001', 'test', now(), 10000)`);
    const db = drizzle(client);
    const result = await readPeopleDues(db, "test", { direction: "inflow", page: 0 }, "Asha");
    assert.equal(result.totalRemainingPaise, 40000);
    assert.equal(result.total, 1);
    assert.equal(result.items[0]?.counterparty, "Asha");
    const all = await readPeopleDues(db, "test", { direction: "inflow", page: 0 });
    assert.equal(all.totalRemainingPaise, 110000);
    const literalPercent = await readPeopleDues(db, "test", { direction: "inflow", page: 0 }, "%");
    assert.equal(literalPercent.total, 0);
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});
