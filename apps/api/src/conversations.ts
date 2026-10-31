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
  greetingFor,
  formDraftSchema,
  revisionSchema,
  turnSchema,
  validateDraft,
  type Conversation,
} from "@munim/contracts";
import { readPreferences } from "./preferences.js";
import type { ApiEnv } from "./auth.js";
import { getDatabase } from "./db/index.js";
import { conversations } from "./db/schema.js";
import { insertTransaction } from "./services/ledger.js";
import {
  interpret,
  interpreterConfigured,
  InterpreterError,
} from "./services/interpreter.js";
import {
  canConfirm,
  isConfirmation,
  reviewText,
  savedText,
  clarificationText,
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
async function saveDraft(
  tx: Parameters<typeof insertTransaction>[0],
  state: Conversation,
  businessId: string,
  channel: "voice" | "text" | "form",
): Promise<Conversation> {
  const input = validateDraft(state.draft);
  if (!input) throw new ConversationError("Complete the draft first.", 400);
  await insertTransaction(tx, input, {
    businessId,
    source: channel === "voice" ? "voice" : "manual",
    id: state.entryId,
    approvalMode: state.approvalMode,
  });
  return {
    ...state,
    phase: "saved",
    transactionId: state.entryId,
    reply: savedText(state),
  };
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
  if (error instanceof InterpreterError)
    return c.json({ error: error.message }, 503);
  console.error("[conversation]", error);
  return c.json(
    {
      error:
        "Conversation unavailable. Check the latest entry before retrying.",
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
  const preferences = await readPreferences(db, c.get("businessId"));
  if (!preferences.language || !preferences.approvalMode)
    return c.json(
      { error: "Choose your language and saving preference before recording." },
      409,
    );
  const { language, approvalMode } = preferences;
  const id = randomUUID(),
    token = randomBytes(32).toString("base64url");
  const state: Conversation = {
    id,
    entryId: id,
    language,
    replyLanguage: language,
    approvalMode,
    revision: 0,
    draft: {},
    phase: "collecting",
    messages: [],
    reply: greetingFor(language),
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
  const operation = await db.transaction(async (tx) => {
    const query = tx
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    const [row] = await (c.req.method === "GET" ? query : query.for("update"));
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
    const preferences = await readPreferences(
      tx,
      row.businessId,
      c.req.method === "POST",
    );
    const language = preferences.language ?? state.language;
    const approvalMode = preferences.approvalMode ?? "approval";
    if (language !== state.language || approvalMode !== state.approvalMode) {
      state = {
        ...state,
        language,
        approvalMode,
        replyLanguage: language,
        reviewedRevision: null,
        voiceReviewedRevision: null,
        reply:
          state.phase === "review"
            ? reviewText(state, language)
            : state.phase === "saved"
              ? savedText({ ...state, replyLanguage: language })
              : greetingFor(language),
      };
    }
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
      state = await saveDraft(tx, state, row.businessId, channel);
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
          "Voice is not configured yet. Add the LiveKit, Sarvam and Groq credentials.",
          503,
        );
      state.voiceReviewedRevision = null;
      if (state.phase === "review") {
        state.replyLanguage = state.language;
        state.reply = reviewText(state);
      }
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
    if (state.phase === "saved") {
      if (action !== "turn" || state.approvalMode !== "autonomous")
        throw new ConversationError(
          "Start a new entry; this transaction is already saved.",
          409,
        );
      const candidate = turnSchema.parse(body);
      if (candidate.revision !== state.revision)
        throw new ConversationError(
          "The entry changed. Refresh it before continuing.",
          409,
        );
      state = {
        ...state,
        entryId: randomUUID(),
        draft: {},
        phase: "collecting",
        transactionId: null,
        reviewedRevision: null,
        voiceReviewedRevision: null,
      };
    }
    if (action === "form") {
      const { revision, draft, submit } = formDraftSchema.parse(body);
      if (revision !== state.revision)
        throw new ConversationError(
          "The draft changed. Reopen the form to edit the latest version.",
          409,
        );
      state = {
        ...state,
        draft,
        replyLanguage: state.language,
        revision: revision + 1,
        reviewedRevision: null,
        voiceReviewedRevision: null,
        phase:
          validateDraft(draft) && (submit || state.approvalMode === "approval")
            ? "review"
            : "collecting",
      };
      state.reply =
        state.phase === "review"
          ? reviewText(state)
          : "Complete the details before saving.";
      if (
        submit &&
        state.phase === "review" &&
        state.approvalMode === "autonomous"
      )
        state = await saveDraft(tx, state, row.businessId, "form");
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
      state = {
        ...state,
        revision: state.revision + 1,
        phase: "collecting",
        reviewedRevision: null,
        voiceReviewedRevision: null,
        reply: "Understanding your entry…",
        messages: (
          [
            ...state.messages,
            {
              role: "user",
              text: turn.text,
              channel: turn.channel,
              at: new Date().toISOString(),
            },
          ] satisfies Conversation["messages"]
        ).slice(-60),
      };
      await persist();
      return {
        kind: "interpret" as const,
        state,
        turn,
        businessId: row.businessId,
      };
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
  if (operation instanceof Response) return operation;
  const { state: reserved, turn } = operation;
  try {
    const result = await interpret(reserved, turn.text, operation.businessId);
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(conversations)
        .where(eq(conversations.id, id))
        .for("update");
      if (!row)
        throw new ConversationError(
          "Conversation expired. Start a new one.",
          410,
        );
      const latest = conversationSchema.parse(row.state);
      if (
        latest.revision !== reserved.revision ||
        latest.phase !== "collecting"
      )
        throw new ConversationError(
          "The draft changed while understanding your entry. Review the latest version.",
          409,
        );
      const activeSession = await tx.execute(
        sql`select id from munim_auth_session where id=${row.authSessionId} and "expiresAt">now()`,
      );
      if (!activeSession.rowCount || row.expiresAt < new Date())
        throw new ConversationError(
          "Sign in again to continue this conversation.",
          401,
        );
      const currentPreferences = await readPreferences(
        tx,
        row.businessId,
        true,
      );
      let state: Conversation = {
        ...latest,
        language: currentPreferences.language ?? latest.language,
        approvalMode: currentPreferences.approvalMode ?? "approval",
        replyLanguage: result.language,
        draft: result.kind === "proposal" ? result.draft : latest.draft,
        revision: latest.revision + 1,
        phase:
          result.kind === "proposal" &&
          !result.question &&
          validateDraft(result.draft)
            ? "review"
            : "collecting",
      };
      state.reply =
        result.kind === "reply"
          ? result.message
          : state.phase === "review"
            ? reviewText(state, result.language)
            : result.question ||
              clarificationText(state.draft, result.language);
      if (
        state.phase === "review" &&
        state.approvalMode === "autonomous" &&
        reserved.approvalMode === "autonomous"
      )
        state = await saveDraft(tx, state, row.businessId, turn.channel);
      state.messages = (
        [
          ...state.messages,
          {
            role: "assistant",
            text: state.reply,
            channel: turn.channel,
            at: new Date().toISOString(),
          },
        ] satisfies Conversation["messages"]
      ).slice(-60);
      const receipts = Object.fromEntries([
        ...Object.entries(receiptsSchema.parse(row.receipts)).slice(-31),
        [turn.requestId, state],
      ]);
      await tx
        .update(conversations)
        .set({ state, receipts })
        .where(eq(conversations.id, id));
      return c.json(state);
    });
  } catch (error) {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(conversations)
        .where(eq(conversations.id, id))
        .for("update");
      if (!row) return;
      const latest = conversationSchema.parse(row.state);
      if (latest.revision !== reserved.revision) return;
      await tx
        .update(conversations)
        .set({
          state: {
            ...latest,
            reply:
              "I could not finish understanding that entry. Your draft is unchanged; please try again or use the form.",
          },
        })
        .where(eq(conversations.id, id));
    });
    throw error;
  }
});
