import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import {
  conversationSchema,
  formDraftSchema,
  revisionSchema,
  turnSchema,
  validateDraft,
  type Conversation,
} from "@munim/contracts";
import type { ApiEnv } from "./auth.js";
import { getDatabase } from "./db/index.js";
import { conversations } from "./db/schema.js";
import { insertTransaction } from "./services/ledger.js";
import { interpret, interpreterConfigured } from "./services/interpreter.js";
import {
  canConfirm,
  isConfirmation,
  reviewText,
} from "./services/conversation-logic.js";

export const conversationRoutes = new Hono<ApiEnv>();
const hash = (token: string) => createHash("sha256").update(token).digest();
const receiptsSchema = z.record(z.string(), conversationSchema);
class ConversationError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401 | 404 | 409 | 410 | 503,
  ) {
    super(message);
  }
}
conversationRoutes.use("*", bodyLimit({ maxSize: 16_384 }));
conversationRoutes.onError((error, c) => {
  if (error instanceof ConversationError)
    return c.json({ error: error.message }, error.status);
  if (error instanceof z.ZodError)
    return c.json(
      { error: "Check the conversation request.", details: error.issues },
      400,
    );
  console.error("[conversation]", error);
  return c.json(
    {
      error:
        error instanceof Error ? error.message : "Conversation unavailable.",
    },
    503,
  );
});
conversationRoutes.post("/", async (c) => {
  const db = getDatabase();
  if (!db) throw new ConversationError("Connect the ledger first.", 503);
  const recent = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.businessId, c.get("businessId")),
        gt(
          conversations.expiresAt,
          new Date(Date.now() + 12 * 60 * 60_000 - 60_000),
        ),
      ),
    );
  if (recent.length >= 10)
    return c.json(
      { error: "Please wait a minute before starting another entry." },
      429,
    );
  const id = randomUUID(),
    token = randomBytes(32).toString("base64url");
  const state: Conversation = {
    id,
    revision: 0,
    draft: {},
    phase: "collecting",
    messages: [],
    reply: "Tell me what happened. बोलिए, क्या लेन-देन हुआ?",
    reviewedRevision: null,
    voiceReviewedRevision: null,
    transactionId: null,
  };
  await db.delete(conversations).where(lt(conversations.expiresAt, new Date()));
  await db.insert(conversations).values({
    id,
    tokenHash: hash(token).toString("hex"),
    businessId: c.get("businessId"),
    authSessionId: c.get("authSessionId"),
    state,
    expiresAt: new Date(Date.now() + 12 * 60 * 60_000),
  });
  return c.json(
    {
      conversation: state,
      token,
      textConfigured: interpreterConfigured(),
      voiceConfigured: Boolean(
        process.env.LIVEKIT_URL &&
          process.env.LIVEKIT_API_KEY &&
          process.env.LIVEKIT_API_SECRET &&
          process.env.SARVAM_API_KEY &&
          interpreterConfigured(),
      ),
    },
    201,
  );
});

conversationRoutes.all("/:id/:action?", async (c) => {
  const db = getDatabase();
  if (!db) throw new ConversationError("Connect the ledger first.", 503);
  const id = z.string().uuid().parse(c.req.param("id"));
  const bearer = c.req.header("Authorization")?.replace(/^Bearer /, "") ?? "";
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .for("update");
    if (!row) throw new ConversationError("Conversation not found.", 404);
    const actual = hash(bearer),
      expected = Buffer.from(row.tokenHash, "hex");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new ConversationError("Conversation access denied.", 401);
    if (c.get("businessId") && c.get("businessId") !== row.businessId)
      throw new ConversationError("Conversation access denied.", 401);
    const activeSession = await tx.execute(
      sql`select id from munim_auth_session where id=${row.authSessionId} and "expiresAt">now()`,
    );
    if (!activeSession.rowCount)
      throw new ConversationError(
        "Sign in again to continue this conversation.",
        401,
      );
    if (row.expiresAt < new Date())
      throw new ConversationError(
        "This conversation expired. Start a new one.",
        410,
      );
    let state = conversationSchema.parse(row.state);
    const action = c.req.param("action");
    if (c.req.method === "GET" && !action) return c.json(state);
    if (c.req.method !== "POST")
      return c.json({ error: "Method not allowed." }, 405);
    const body: unknown = await c.req.json();
    let receipts = receiptsSchema.parse(row.receipts);
    const persist = async () => {
      await tx
        .update(conversations)
        .set({ state, receipts })
        .where(eq(conversations.id, id));
      return c.json(state);
    };
    const commit = async (
      revision: number,
      channel: "voice" | "text" | "form",
    ) => {
      if (state.phase === "saved" && state.revision === revision) return;
      if (
        !canConfirm(state, revision, channel === "voice" ? "voice" : "screen")
      )
        throw new ConversationError(
          "Review the latest draft before confirming.",
          409,
        );
      const input = validateDraft(state.draft);
      if (!input) throw new ConversationError("Complete the draft first.", 400);
      await insertTransaction(
        tx,
        input,
        row.businessId,
        channel === "voice" ? "voice" : "manual",
        id,
      );
      state = {
        ...state,
        phase: "saved",
        transactionId: id,
        reply: /[\u0900-\u097f]/.test(state.reply)
          ? "लेन-देन सेव हो गया।"
          : "Transaction saved to your ledger.",
      };
    };
    if (action === "voice-token") {
      const {
        LIVEKIT_URL: url,
        LIVEKIT_API_KEY: key,
        LIVEKIT_API_SECRET: secret,
      } = process.env;
      if (
        !url ||
        !key ||
        !secret ||
        !process.env.SARVAM_API_KEY ||
        !interpreterConfigured()
      )
        throw new ConversationError(
          "Voice is not configured yet. Add the LiveKit, Sarvam and Gemini credentials.",
          503,
        );
      state.voiceReviewedRevision = null;
      await tx
        .update(conversations)
        .set({ state })
        .where(eq(conversations.id, id));
      const room = `munim-${id}`;
      const client = new AgentDispatchClient(url, key, secret);
      const dispatches = await client.listDispatch(room).catch(() => []);
      if (!dispatches.some((d) => d.agentName === "munim"))
        await client.createDispatch(room, "munim", {
          metadata: JSON.stringify({ id, token: bearer }),
        });
      const token = new AccessToken(key, secret, {
        identity: `owner-${id}`,
        ttl: "10m",
      });
      token.addGrant({
        room,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });
      return c.json({ url, token: await token.toJwt() });
    }
    if (action === "reviewed") {
      const { revision, channel } = revisionSchema
        .extend({ channel: z.enum(["voice", "screen"]) })
        .parse(body);
      if (state.phase === "review" && state.revision === revision) {
        if (channel === "voice") state.voiceReviewedRevision = revision;
        else state.reviewedRevision = revision;
      }
      return persist();
    }
    if (action === "confirm") {
      const { revision } = revisionSchema.parse(body);
      await commit(revision, "form");
      return persist();
    }
    if (action === "turn") {
      const candidate = turnSchema.parse(body);
      if (receipts[candidate.requestId])
        return c.json(receipts[candidate.requestId]);
    }
    if (state.phase === "saved")
      throw new ConversationError(
        "Start a new entry; this transaction is already saved.",
        409,
      );
    if (action === "form") {
      const { revision, draft } = formDraftSchema.parse(body);
      if (revision !== state.revision)
        throw new ConversationError(
          "The draft changed. Reopen the form to edit the latest version.",
          409,
        );
      state = {
        ...state,
        draft,
        revision: revision + 1,
        reviewedRevision: null,
        voiceReviewedRevision: null,
        phase: validateDraft(draft) ? "review" : "collecting",
      };
      state.reply =
        state.phase === "review"
          ? reviewText(state)
          : "Complete the details before saving.";
      return persist();
    }
    if (action !== "turn")
      throw new ConversationError("Unknown conversation action.", 404);
    if (state.revision >= 100)
      throw new ConversationError("Start a new conversation to continue.", 409);
    const turn = turnSchema.parse(body);
    if (receipts[turn.requestId]) return c.json(receipts[turn.requestId]);
    if (turn.revision !== state.revision)
      throw new ConversationError(
        "The draft changed. Please try again with the latest version.",
        409,
      );
    if (
      isConfirmation(turn.text) &&
      canConfirm(
        state,
        turn.revision,
        turn.channel === "voice" ? "voice" : "screen",
      )
    ) {
      await commit(turn.revision, turn.channel);
    } else {
      const result = await interpret(state, turn.text, row.businessId);
      state = {
        ...state,
        draft: result.draft,
        revision: state.revision + 1,
        reviewedRevision: null,
        voiceReviewedRevision: null,
        phase:
          !result.question && validateDraft(result.draft)
            ? "review"
            : "collecting",
      };
      state.reply =
        state.phase === "review"
          ? reviewText(
              state,
              /[\u0900-\u097f]|\b(hai|haan|diye|udhaar|rupaye|ka|ko)\b/i.test(
                turn.text,
              ),
            )
          : result.question ||
            "What was the amount, and was it paid or still due?";
    }
    state.messages = (
      [
        ...state.messages,
        {
          role: "user",
          text: turn.text,
          channel: turn.channel,
          at: new Date().toISOString(),
        },
        {
          role: "assistant",
          text: state.reply,
          channel: turn.channel,
          at: new Date().toISOString(),
        },
      ] satisfies Conversation["messages"]
    ).slice(-60);
    receipts = Object.fromEntries([
      ...Object.entries(receipts).slice(-31),
      [turn.requestId, state],
    ]);
    return persist();
  });
});
