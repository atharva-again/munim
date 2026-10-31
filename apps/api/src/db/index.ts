import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

let pool: Pool | undefined;
let database: NodePgDatabase<typeof schema> | undefined;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
    });
  }
  return pool;
}

export function getDatabase(): NodePgDatabase<typeof schema> | null {
  const currentPool = getPool();
  if (!currentPool) return null;
  database ??= drizzle(currentPool, { schema });
  return database;
}

export const businessId = () => process.env.MUNIM_BUSINESS_ID ?? "demo-business";

