import { config } from "dotenv";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serve } from "@hono/node-server";
import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Context } from "hono";
import {
  createTransactionSchema,
  ledgerSummarySchema,
} from "@munim/contracts";
import { businessId, getDatabase, getPool } from "./db/index.js";
import {
  isMekoConfigured,
  MekoConfigurationError,
  callMekoTool,
} from "./services/meko.js";
import {
  paymentRequests,
  settlements,
  transactions,
  webhookEvents,
} from "./db/schema.js";

config({ path: "../../.env" });
config();

const app = new Hono();
const currentBusinessId = businessId();

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
    meko: isMekoConfigured() ? "configured" : "not_configured",
    speechToText:
      process.env.STT_PROVIDER && process.env.STT_API_KEY
        ? "adapter_pending"
        : "not_configured",
    razorpay: razorpayStatus(),
  });
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
      .where(eq(transactions.businessId, currentBusinessId))
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
      { error: "Could not read the ledger. Check the database schema and connection." },
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
      .where(eq(transactions.businessId, currentBusinessId))
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

app.post("/api/transactions", async (c) => {
  const db = getDatabase();
  if (!db) return unavailable(c, "Connect YugabyteDB by setting DATABASE_URL.");

  const body = await c.req.json().catch(() => null);
  const parsed = createTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Check the transaction details.", details: parsed.error.issues }, 400);
  }

  const input = parsed.data;
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();

  try {
    const created = await db.transaction(async (tx) => {
      const [entry] = await tx
        .insert(transactions)
        .values({
          businessId: currentBusinessId,
          kind: input.kind,
          direction: input.direction,
          amountPaise: input.amountPaise,
          description: input.description,
          counterparty: input.counterparty ?? "",
          paymentMethod: input.paymentMethod,
          settlementStatus: input.settlementStatus,
          source: "manual",
          occurredAt,
        })
        .returning();

      if (input.settlementStatus === "settled" && input.direction !== "transfer") {
        await tx.insert(settlements).values({
          businessId: currentBusinessId,
          transactionId: entry.id,
          amountPaise: input.amountPaise,
          direction: input.direction,
          method: input.paymentMethod,
          source: "manual",
          occurredAt,
        });
      }

      return entry;
    });

    return c.json(
      {
        ...created,
        amountPaise: Number(created.amountPaise),
        occurredAt: created.occurredAt.toISOString(),
        createdAt: created.createdAt.toISOString(),
        paymentLink: null,
      },
      201,
    );
  } catch (error) {
    console.error("[transaction-create]", error);
    return c.json(
      { error: "The transaction was not saved. Check the ledger connection and try again." },
      503,
    );
  }
});

app.post("/api/payment-links/:transactionId", async (c) => {
  const db = getDatabase();
  if (!db) return unavailable(c, "Connect YugabyteDB by setting DATABASE_URL.");

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return unavailable(c, "Add Razorpay TEST mode keys to enable payment links.");
  }
  if (!keyId.startsWith("rzp_test_")) {
    return unavailable(c, "Live Razorpay keys are blocked. Use Test Mode credentials.");
  }

  const transactionId = c.req.param("transactionId");
  try {
    const [entry] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.businessId, currentBusinessId),
        ),
      )
      .limit(1);
    if (!entry) return c.json({ error: "Transaction not found." }, 404);
    if (entry.direction !== "inflow" || entry.settlementStatus === "settled") {
      return c.json(
        { error: "Payment links are only available for open incoming transactions." },
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
        { error: result.error?.description ?? "Razorpay could not create the test link." },
        502,
      );
    }

    const [saved] = await db
      .insert(paymentRequests)
      .values({
        businessId: currentBusinessId,
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
  const amountPaid = Number(event.payload?.payment_link?.entity?.amount_paid ?? 0);
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

      await tx.insert(webhookEvents).values({ id: eventId, provider: "razorpay" });
      const [request] = await tx
        .select()
        .from(paymentRequests)
        .where(
          and(
            eq(paymentRequests.providerLinkId, linkId),
            eq(paymentRequests.businessId, currentBusinessId),
          ),
        )
        .limit(1);
      if (!request) return;

      const [entry] = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, request.transactionId))
        .limit(1);
      if (!entry) return;

      await tx.insert(settlements).values({
        businessId: currentBusinessId,
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

app.get("/api/memory/status", (c) =>
  c.json({
    configured: isMekoConfigured(),
    datapackConfigured: Boolean(process.env.MEKO_DATAPACK_ID),
  }),
);

app.post("/api/memory/search", async (c) => {
  const body = await c.req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) return c.json({ error: "Add a search query." }, 400);

  try {
    const result = await callMekoTool("context_search", { query, limit: 8 });
    return c.json({ result });
  } catch (error) {
    const message =
      error instanceof MekoConfigurationError
        ? error.message
        : "Meko could not search business memory.";
    return c.json({ error: message }, error instanceof MekoConfigurationError ? 503 : 502);
  }
});

app.post("/api/memory/add", async (c) => {
  const body = await c.req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 2000) {
    return c.json({ error: "Memory text must be between 1 and 2,000 characters." }, 400);
  }

  try {
    const result = await callMekoTool("memory_add", {
      text,
      metadata: { source: "munim-ui", business_id: currentBusinessId },
    });
    return c.json({ result }, 201);
  } catch (error) {
    const message =
      error instanceof MekoConfigurationError
        ? error.message
        : "Meko could not save this business memory.";
    return c.json({ error: message }, error instanceof MekoConfigurationError ? 503 : 502);
  }
});

app.post("/api/memory/promote", async (c) => {
  const body = await c.req.json().catch(() => null);
  const memoryIds = Array.isArray(body?.memoryIds)
    ? body.memoryIds.filter((id: unknown): id is string => typeof id === "string")
    : [];
  if (body?.confirmed !== true || memoryIds.length === 0) {
    return c.json(
      { error: "Select memories and explicitly confirm sharing them with the business." },
      400,
    );
  }

  try {
    const result = await callMekoTool("memory_promote", {
      memory_ids: memoryIds,
    });
    return c.json({ result });
  } catch (error) {
    const message =
      error instanceof MekoConfigurationError
        ? error.message
        : "Meko could not promote the selected memories.";
    return c.json({ error: message }, error instanceof MekoConfigurationError ? 503 : 502);
  }
});

app.post("/api/stt/transcribe", async (c) => {
  if (!process.env.STT_PROVIDER || !process.env.STT_API_KEY) {
    return c.json(
      { error: "Choose an STT provider and configure its API key to enable voice capture." },
      503,
    );
  }
  return c.json(
    { error: `STT provider "${process.env.STT_PROVIDER}" is selected but its adapter is not implemented yet.` },
    501,
  );
});

app.onError((error, c) => {
  console.error("[api-error]", error);
  return c.json({ error: "Unexpected server error." }, 500);
});

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Munim API listening on http://localhost:${info.port}`);
});

