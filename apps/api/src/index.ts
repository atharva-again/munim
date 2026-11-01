import { config } from "dotenv";
import { getAuth, type ApiEnv } from "./auth.js";
import { preferenceRoutes } from "./preferences.js";
import { memoryRoutes } from "./memory.js";
import { historyRoutes } from "./history.js";
import { readInsights } from "./services/insights.js";
import { conversationRoutes } from "./conversations.js";
import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Context } from "hono";
import { insightQuerySchema, ledgerSummarySchema } from "@munim/contracts";
import { getDatabase, getPool } from "./db/index.js";
import { isMekoConfigured } from "./services/meko.js";
import { settlements, transactions } from "./db/schema.js";

config({ path: "../../.env" });
config();

export const app = new Hono<ApiEnv>();
app.get("/readyz", async (c) => {
  try {
    const pool = getPool();
    if (!pool) return c.json({ ready: false }, 503);
    await pool.query("select 1");
    return c.json({ ready: true });
  } catch {
    return c.json({ ready: false }, 503);
  }
});
app.get("/api/auth-status", (c) => c.json({ configured: Boolean(getAuth()) }));
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  const auth = getAuth();
  return auth
    ? auth.handler(c.req.raw)
    : c.json({ error: "Configure Google sign-in first." }, 503);
});
app.use("/api/*", async (c, next) => {
  if (
    /^\/api\/conversations\/[0-9a-f-]+(?:\/[^/]+)?$/.test(c.req.path) &&
    c.req.header("Authorization")?.startsWith("Bearer ")
  )
    return next();
  const auth = getAuth();
  if (!auth) return c.json({ error: "Google sign-in is not configured." }, 503);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Sign in to continue." }, 401);
  c.set("businessId", `account:${session.user.id}`);
  c.set("authSessionId", session.session.id);
  if (!["GET", "HEAD"].includes(c.req.method)) {
    const origin = c.req.header("Origin");
    if (origin && origin !== new URL(process.env.BETTER_AUTH_URL!).origin)
      return c.json({ error: "Invalid origin." }, 403);
  }
  return next();
});
app.route("/api/conversations", conversationRoutes);
app.route("/api/preferences", preferenceRoutes);
app.route("/api/memory", memoryRoutes);
app.route("/api/conversation-history", historyRoutes);

function unavailable(c: Context, message: string) {
  return c.json({ error: message }, 503);
}

app.get("/api/health", async (c) => {
  const pool = getPool();
  let database = "not_configured";
  if (pool) {
    try {
      await pool.query("select 1");
      database = "connected";
    } catch {
      database = "unreachable";
    }
  }

  return c.json({
    service: "munim-api",
    database,
    meko:
      isMekoConfigured() && process.env.MUNIM_MEMORY_ENABLED !== "false"
        ? "configured"
        : "not_configured",
    speechToText: process.env.SARVAM_API_KEY
      ? "provider_selected"
      : "not_configured",
  });
});

app.get("/api/insights", async (c) => {
  const db = getDatabase();
  if (!db) return unavailable(c, "Connect your ledger to view insights.");
  const query = insightQuerySchema.safeParse(c.req.query());
  if (!query.success)
    return c.json({ error: "Choose a valid insights period and filter." }, 400);
  try {
    return c.json(await readInsights(db, c.get("businessId"), query.data));
  } catch (error) {
    console.error("[insights-read]", error);
    return c.json({ error: "Could not load insights. Please try again." }, 503);
  }
});

app.get("/api/ledger/summary", async (c) => {
  const db = getDatabase();
  if (!db) return unavailable(c, "Connect YugabyteDB by setting DATABASE_URL.");

  try {
    const rows = await db
      .select({
        direction: transactions.direction,
        amountPaise: transactions.amountPaise,
        settledPaise: sql<string>`coalesce(sum(${settlements.amountPaise}), 0)::text`,
      })
      .from(transactions)
      .leftJoin(settlements, eq(settlements.transactionId, transactions.id))
      .where(eq(transactions.businessId, c.get("businessId")))
      .groupBy(transactions.id);

    let settledInflowPaise = 0;
    let settledOutflowPaise = 0;
    let openInflowPaise = 0;
    let openOutflowPaise = 0;

    for (const row of rows) {
      const amount = Number(row.amountPaise);
      const settled = Number(row.settledPaise);
      const open = Math.max(0, amount - settled);
      if (row.direction === "inflow") {
        settledInflowPaise += settled;
        openInflowPaise += open;
      } else if (row.direction === "outflow") {
        settledOutflowPaise += settled;
        openOutflowPaise += open;
      }
    }

    const summary = ledgerSummarySchema.parse({
      settledInflowPaise,
      settledOutflowPaise,
      openInflowPaise,
      openOutflowPaise,
      transactionCount: rows.length,
    });
    return c.json(summary);
  } catch (error) {
    console.error("[ledger-summary]", error);
    return c.json(
      {
        error:
          "Could not read the ledger. Check the database schema and connection.",
      },
      503,
    );
  }
});

app.get("/api/transactions", async (c) => {
  const db = getDatabase();
  if (!db) return unavailable(c, "Connect YugabyteDB by setting DATABASE_URL.");

  const requestedLimit = Number(c.req.query("limit") ?? 50);
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 200)
    : 50;

  try {
    const rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.businessId, c.get("businessId")))
      .orderBy(desc(transactions.occurredAt))
      .limit(limit);

    return c.json(
      rows.map((transaction) => ({
        ...transaction,
        amountPaise: Number(transaction.amountPaise),
        occurredAt: transaction.occurredAt.toISOString(),
        createdAt: transaction.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    console.error("[transactions-read]", error);
    return c.json(
      { error: "Could not read transactions. Run the database setup first." },
      503,
    );
  }
});

app.onError((error, c) => {
  console.error("[api-error]", error);
  return c.json({ error: "Unexpected server error." }, 500);
});
