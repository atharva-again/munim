import { config } from "dotenv";
import { getAuth, type ApiEnv } from "./auth.js";
import { preferenceRoutes } from "./preferences.js";
import { memoryRoutes } from "./memory.js";
import { historyRoutes } from "./history.js";
import { readInsights } from "./services/insights.js";
import { conversationRoutes } from "./conversations.js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Context } from "hono";
import { insightQuerySchema, ledgerSummarySchema } from "@munim/contracts";
import { businessId, getDatabase, getPool } from "./db/index.js";
import { isMekoConfigured } from "./services/meko.js";
import {
  paymentRequests,
  settlements,
  transactions,
  webhookEvents,
} from "./db/schema.js";

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
  if (c.req.path === "/api/webhooks/razorpay") return next();
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

function razorpayStatus() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return "not_configured" as const;
  return keyId.startsWith("rzp_test_")
    ? ("test_keys_configured" as const)
    : ("live_keys_rejected" as const);
}

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
    razorpay:
      c.get("businessId") === businessId()
        ? razorpayStatus()
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
      .select({
        transaction: transactions,
        paymentRequest: paymentRequests,
      })
      .from(transactions)
      .leftJoin(
        paymentRequests,
        eq(paymentRequests.transactionId, transactions.id),
      )
      .where(eq(transactions.businessId, c.get("businessId")))
      .orderBy(desc(transactions.occurredAt))
      .limit(limit);

    return c.json(
      rows.map(({ transaction, paymentRequest }) => ({
        ...transaction,
        amountPaise: Number(transaction.amountPaise),
        occurredAt: transaction.occurredAt.toISOString(),
        createdAt: transaction.createdAt.toISOString(),
        paymentLink: paymentRequest
          ? {
              shortUrl: paymentRequest.shortUrl,
              status: paymentRequest.status,
            }
          : null,
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

app.post("/api/payment-links/:transactionId", async (c) => {
  if (c.get("businessId") !== businessId())
    return unavailable(
      c,
      "Payment collection is not configured for this account.",
    );
  const db = getDatabase();
  if (!db) return unavailable(c, "Connect YugabyteDB by setting DATABASE_URL.");

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return unavailable(
      c,
      "Add Razorpay TEST mode keys to enable payment links.",
    );
  }
  if (!keyId.startsWith("rzp_test_")) {
    return unavailable(
      c,
      "Live Razorpay keys are blocked. Use Test Mode credentials.",
    );
  }

  const transactionId = c.req.param("transactionId");
  try {
    const [entry] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.businessId, c.get("businessId")),
        ),
      )
      .limit(1);
    if (!entry) return c.json({ error: "Transaction not found." }, 404);
    if (entry.direction !== "inflow" || entry.settlementStatus === "settled") {
      return c.json(
        {
          error:
            "Payment links are only available for open incoming transactions.",
        },
        409,
      );
    }

    const [existing] = await db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.transactionId, entry.id))
      .limit(1);
    if (existing) {
      return c.json({
        shortUrl: existing.shortUrl,
        status: existing.status,
      });
    }

    const referenceId = `m_${entry.id.replaceAll("-", "")}`;
    const response = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Number(entry.amountPaise),
        currency: "INR",
        description: entry.description,
        reference_id: referenceId,
        notes: { munim_transaction_id: entry.id },
        reminder_enable: false,
      }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      id?: string;
      short_url?: string;
      status?: string;
      error?: { description?: string };
    };
    if (!response.ok || !result.id || !result.short_url) {
      console.error("[razorpay-link]", result.error ?? response.statusText);
      return c.json(
        {
          error:
            result.error?.description ??
            "Razorpay could not create the test link.",
        },
        502,
      );
    }

    const [saved] = await db
      .insert(paymentRequests)
      .values({
        businessId: c.get("businessId"),
        transactionId: entry.id,
        providerLinkId: result.id,
        shortUrl: result.short_url,
        status: result.status ?? "created",
      })
      .returning();

    return c.json({ shortUrl: saved.shortUrl, status: saved.status }, 201);
  } catch (error) {
    console.error("[payment-link-create]", error);
    return c.json({ error: "Could not create the payment link." }, 502);
  }
});

app.post("/api/webhooks/razorpay", async (c) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return c.text("Webhook secret is not configured.", 503);

  const rawBody = await c.req.text();
  const signature = c.req.header("x-razorpay-signature");
  if (!signature) return c.text("Missing signature.", 400);

  const expected = createHmac("sha256", secret).update(rawBody).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "hex");
  } catch {
    return c.text("Invalid signature.", 400);
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return c.text("Invalid signature.", 400);
  }

  const db = getDatabase();
  if (!db) return c.text("Database is not configured.", 503);

  let event: {
    event?: string;
    payload?: {
      payment_link?: {
        entity?: {
          id?: string;
          amount_paid?: number;
          status?: string;
        };
      };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.text("Invalid JSON.", 400);
  }

  if (event.event !== "payment_link.paid") return c.body(null, 200);

  const linkId = event.payload?.payment_link?.entity?.id;
  if (!linkId) return c.text("Payment link ID is missing.", 400);
  const eventId =
    c.req.header("x-razorpay-event-id") ??
    createHmac("sha256", "munim-webhook-id").update(rawBody).digest("hex");
  const amountPaid = Number(
    event.payload?.payment_link?.entity?.amount_paid ?? 0,
  );
  if (!Number.isSafeInteger(amountPaid) || amountPaid <= 0) {
    return c.text("Paid amount is invalid.", 400);
  }

  try {
    await db.transaction(async (tx) => {
      const [seen] = await tx
        .select({ id: webhookEvents.id })
        .from(webhookEvents)
        .where(eq(webhookEvents.id, eventId))
        .limit(1);
      if (seen) return;

      await tx
        .insert(webhookEvents)
        .values({ id: eventId, provider: "razorpay" });
      const [request] = await tx
        .select()
        .from(paymentRequests)
        .where(and(eq(paymentRequests.providerLinkId, linkId)))
        .limit(1);
      if (!request) return;

      const [entry] = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, request.transactionId))
        .limit(1);
      if (!entry) return;

      await tx.insert(settlements).values({
        businessId: request.businessId,
        transactionId: entry.id,
        amountPaise: amountPaid,
        direction: "inflow",
        method: "upi",
        source: "razorpay",
        providerReference: linkId,
        providerEventId: eventId,
      });

      const paidSoFar = await tx
        .select({
          total: sql<string>`coalesce(sum(${settlements.amountPaise}), 0)::text`,
        })
        .from(settlements)
        .where(eq(settlements.transactionId, entry.id));
      const totalPaid = Number(paidSoFar[0]?.total ?? 0);
      await tx
        .update(transactions)
        .set({
          settlementStatus:
            totalPaid >= Number(entry.amountPaise) ? "settled" : "partial",
        })
        .where(eq(transactions.id, entry.id));
      await tx
        .update(paymentRequests)
        .set({ status: "paid", updatedAt: new Date() })
        .where(eq(paymentRequests.id, request.id));
    });
    return c.body(null, 200);
  } catch (error) {
    console.error("[razorpay-webhook]", error);
    return c.text("Could not process webhook; Razorpay may retry.", 500);
  }
});

app.onError((error, c) => {
  console.error("[api-error]", error);
  return c.json({ error: "Unexpected server error." }, 500);
});
