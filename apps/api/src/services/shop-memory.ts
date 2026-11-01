import { createHash, randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  conversationSchema,
  memoryFactSchema,
  type MemoryContext,
  type MemoryFact,
} from "@munim/contracts";
import { getDatabase, getPool } from "../db/index.js";
import {
  conversations,
  memoryCaptures,
  memoryItems,
  memoryScopes,
} from "../db/schema.js";
import {
  callMekoTool,
  closeMekoConnection,
  isMekoConfigured,
  memoryAgentId,
  MekoConfigurationError,
} from "./meko.js";

type Database = NonNullable<ReturnType<typeof getDatabase>>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
const objectSchema = z.record(z.string(), z.unknown());
const idSchema = z.string().min(1).max(200);
const MAX_ATTEMPTS = 5;
const recentCache = new Map<string, { expires: number; result: unknown }>();
let memoryGeneration = 0;
function invalidateRecall() { memoryGeneration++; recentCache.clear(); }

function object(value: unknown) {
  return objectSchema.parse(value);
}
function resourceId(value: unknown): string {
  const result = object(value);
  return idSchema.parse(
    result.id ??
      result.conversation_id ??
      result.datapack_id ??
      (result.data && object(result.data).id),
  );
}
function scopeName(businessId: string) {
  const deployment =
    process.env.MEKO_DEPLOYMENT_NAMESPACE ||
    process.env.BETTER_AUTH_URL ||
    "munim";
  return `munim-shop-${createHash("sha256").update(`${deployment}:${businessId}`).digest("hex").slice(0, 40)}`;
}
function empty(status: MemoryContext["status"]): MemoryContext {
  return { status, facts: [], usedIds: [] };
}
export async function ensureShopMemoryScope(businessId: string): Promise<void> {
  if (!isMekoConfigured() || process.env.MUNIM_MEMORY_ENABLED === "false")
    return;
  const db = getDatabase();
  if (!db) throw new MekoConfigurationError();
  await db
    .insert(memoryScopes)
    .values({ businessId, name: scopeName(businessId) })
    .onConflictDoNothing();
}
async function readyScope(businessId: string) {
  const db = getDatabase();
  if (
    !db ||
    !isMekoConfigured() ||
    process.env.MUNIM_MEMORY_ENABLED === "false"
  )
    throw new MekoConfigurationError();
  await ensureShopMemoryScope(businessId);
  const [scope] = await db
    .select()
    .from(memoryScopes)
    .where(eq(memoryScopes.businessId, businessId));
  if (
    !scope?.datapackId ||
    !scope.providerConversationId ||
    scope.status !== "ready"
  )
    throw new Error(
      "Business memory is getting ready. Please try again shortly.",
    );
  return {
    ...scope,
    datapackId: scope.datapackId,
    providerConversationId: scope.providerConversationId,
  };
}
async function providerConversation(
  datapackId: string,
  sessionId: string,
  signal: AbortSignal,
) {
  return resourceId(
    await callMekoTool(
      "conversation_create",
      {
        datapack_id: datapackId,
        agent_id: memoryAgentId,
        session_id: sessionId,
        title: "Shop Finance Context",
        metadata: JSON.stringify({ source: "munim-runtime" }),
      },
      signal,
    ),
  );
}
function records(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const parsed = objectSchema.safeParse(value);
  if (!parsed.success) return [];
  for (const key of [
    "results",
    "memories",
    "documents",
    "datapacks",
    "items",
    "data",
    "matches",
  ]) {
    if (parsed.data[key] !== undefined) return records(parsed.data[key]);
  }
  return [];
}
export function parseMemoryFacts(result: unknown, limit = 5): MemoryFact[] {
  const root = object(result);
  const data = objectSchema.safeParse(root.results).success
    ? object(root.results)
    : root;
  const facts: MemoryFact[] = [];
  for (const source of [
    "memory",
    "knowledge_base",
    "conversation",
  ] satisfies MemoryFact["source"][]) {
    const bucket =
      data[source] ?? (source === "memory" ? data.memories : undefined);
    if (bucket === undefined) continue;
    const sourceRecord = objectSchema.safeParse(bucket);
    if (
      sourceRecord.success &&
      (sourceRecord.data.error ||
        sourceRecord.data.status === "error" ||
        sourceRecord.data.status === "unavailable")
    )
      throw new Error("A memory source was unavailable.");
    for (const raw of records(bucket)) {
      const record = objectSchema.safeParse(raw);
      if (!record.success) continue;
      const row = record.data;
      const metadata = objectSchema.safeParse(row.metadata);
      const writer =
        row.agent_id ?? (metadata.success ? metadata.data.agent_id : undefined);
      const fact = memoryFactSchema.safeParse({
        id: row.id ?? row.memory_id ?? row.document_id ?? row.conversation_id,
        text: row.text ?? row.memory ?? row.data ?? row.content ?? row.snippet,
        source,
        editable:
          source === "memory" &&
          (writer === undefined || writer === memoryAgentId),
      });
      if (
        fact.success &&
        !facts.some((existing) => existing.id === fact.data.id)
      )
        facts.push(fact.data);
      if (facts.length === limit) return facts;
    }
  }
  return facts;
}
function recentFacts(result: unknown, query: string): MemoryFact[] {
  const rows = records(object(result).memories).slice(0, 20);
  const tokens = query.toLowerCase().match(/[\p{L}\p{M}\p{N}]{2,}/gu) ?? [];
  const ranked = rows
    .map((value, index) => {
      const row = objectSchema.safeParse(value);
      const text = row.success
        ? (row.data.data ?? row.data.text ?? row.data.memory)
        : "";
      const score =
        typeof text === "string"
          ? tokens.reduce(
              (sum, token) =>
                sum + (text.toLowerCase().includes(token) ? 1 : 0),
              0,
            )
          : 0;
      return { value, index, score };
    })
    .sort(
      (left, right) => right.score - left.score || left.index - right.index,
    );
  return parseMemoryFacts({
    // Keep a bounded recent fallback for code-switching and short follow-ups.
    memory: ranked.slice(0, 5).map((row) => row.value),
  });
}
async function rememberVisibleFacts(businessId: string, facts: MemoryFact[]) {
  const db = getDatabase();
  if (!db) return;
  for (const fact of facts)
    await db
      .insert(memoryItems)
      .values({
        businessId,
        memoryId: fact.id,
        text: fact.text,
        source: fact.source,
        editable: fact.editable ? "yes" : "no",
      })
      .onConflictDoUpdate({
        target: [memoryItems.businessId, memoryItems.memoryId],
        set: { text: fact.text, editable: fact.editable ? "yes" : "no" },
      });
}
export async function recallShopContext({
  businessId,
  query,
  conversationId,
  signal,
  timeoutMs,
  retrieval = "recent",
}: {
  businessId: string;
  query: string;
  conversationId: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  retrieval?: "recent" | "semantic";
}): Promise<MemoryContext> {
  if (!isMekoConfigured()) return empty("not_configured");
  if (process.env.MUNIM_MEMORY_ENABLED === "false") return empty("disabled");
  const deadline = AbortSignal.any([
    ...(signal ? [signal] : []),
    AbortSignal.timeout(
      timeoutMs ??
        z.coerce
          .number()
          .int()
          .min(500)
          .max(8000)
          .catch(3000)
          .parse(process.env.MUNIM_MEMORY_RECALL_TIMEOUT_MS),
    ),
  ]);
  const started = performance.now();
  try {
    const scope = await readyScope(businessId);
    const args = {
      conversation_id: scope.providerConversationId,
      datapack_id: scope.datapackId,
      agent_id: memoryAgentId,
    };
    const cacheKey = JSON.stringify([businessId, conversationId, scope.recallRevision]);
    const cached = recentCache.get(cacheKey);
    const generation = memoryGeneration;
    const result = retrieval === "recent" && cached && cached.expires > Date.now() ? cached.result : await callMekoTool(
      retrieval === "recent" ? "memory_get_all" : "context_search",
      retrieval === "recent"
        ? args
        : {
            ...args,
            query: query.slice(0, 800),
            limit: 3,
            force_source: "memory",
          },
      deadline,
    );
    if (retrieval === "recent" && generation === memoryGeneration) {
      if (recentCache.size >= 100) recentCache.delete(recentCache.keys().next().value ?? "");
      recentCache.set(cacheKey, { result, expires: cached && cached.expires > Date.now() ? cached.expires : Date.now() + 60_000 });
    }
    const facts =
      retrieval === "recent"
        ? recentFacts(result, query)
        : parseMemoryFacts(result);
    await rememberVisibleFacts(businessId, facts);
    return {
      status: "ready",
      facts,
      usedIds: [],
      retrieval,
      retrievedAt: new Date().toISOString(),
    };
  } catch {
    return empty("unavailable");
  } finally {
    console.info("[memory-recall]", {
      conversationId,
      durationMs: Math.round(performance.now() - started),
    });
  }
}
export async function enqueueFinanceCapture(
  tx: Transaction,
  {
    businessId,
    conversationId,
    revision,
    input,
    output,
    requestId,
    convention = false,
  }: {
    businessId: string;
    conversationId: string;
    revision: number;
    input: string;
    output: string;
    requestId: string;
    convention?: boolean;
  },
): Promise<void> {
  if (!isMekoConfigured() || process.env.MUNIM_MEMORY_ENABLED === "false")
    return;
  await tx
    .insert(memoryScopes)
    .values({ businessId, name: scopeName(businessId) })
    .onConflictDoNothing();
  await tx
    .insert(memoryCaptures)
    .values({ businessId, conversationId, revision, input, output, requestId, captureKind: convention ? "convention" : "conversation" })
    .onConflictDoNothing();
}
export async function getMemoryStatus(businessId: string) {
  const db = getDatabase();
  if (!isMekoConfigured() || !db)
    return {
      configured: false,
      status: "not_configured",
      pendingCaptures: 0,
      failedCaptures: 0,
      deliveredCaptures: 0,
    };
  if (process.env.MUNIM_MEMORY_ENABLED === "false")
    return {
      configured: false,
      status: "disabled",
      pendingCaptures: 0,
      failedCaptures: 0,
      deliveredCaptures: 0,
    };
  await ensureShopMemoryScope(businessId);
  const [scope] = await db
    .select()
    .from(memoryScopes)
    .where(eq(memoryScopes.businessId, businessId));
  const counts = await db
    .select({
      status: memoryCaptures.status,
      count: sql<number>`count(*)::int`,
    })
    .from(memoryCaptures)
    .where(and(eq(memoryCaptures.businessId, businessId), sql`${memoryCaptures.createdAt} >= now()-interval '7 days'`))
    .groupBy(memoryCaptures.status);
  return {
    configured: true,
    status: scope?.status ?? "pending",
    pendingCaptures: counts
      .filter((row) => row.status === "pending" || row.status === "processing")
      .reduce((sum, row) => sum + row.count, 0),
    deliveredCaptures: counts.find(row => row.status === "done")?.count ?? 0,
    failedCaptures: counts.find((row) => row.status === "failed")?.count ?? 0,
  };
}

async function provisionOne() {
  const pool = getPool();
  if (!pool) return false;
  const lease = randomUUID();
  const claimed = await pool.query(
    `UPDATE munim_memory_scopes SET lease_token=$1,lease_until=now()+interval '90 seconds',attempts=attempts+1 WHERE business_id=(SELECT business_id FROM munim_memory_scopes WHERE (status='pending' OR (status='ready' AND provider_conversation_id IS NULL)) AND attempts<$2 AND retry_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY retry_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING business_id,name,attempts`,
    [lease, MAX_ATTEMPTS],
  );
  const row = z
    .object({ business_id: z.string(), name: z.string(), attempts: z.number() })
    .optional()
    .parse(claimed.rows[0]);
  if (!row) return false;
  try {
    const signal = AbortSignal.timeout(50_000);
    const bootstrap =
      process.env.MEKO_PROVISIONING_DATAPACK_ID || process.env.MEKO_DATAPACK_ID;
    if (!bootstrap) throw new MekoConfigurationError();
    const trace = await providerConversation(
      bootstrap,
      `admin-${row.name}`,
      signal,
    );
    const search = await callMekoTool(
      "datapack_search",
      {
        name: row.name,
        grant: "owner",
        limit: 100,
        conversation_id: trace,
        datapack_id: bootstrap,
      },
      signal,
    );
    const matches = records(search)
      .map((value) => objectSchema.parse(value))
      .filter((value) => (value.name ?? value.datapack_name) === row.name);
    if (matches.length > 1) throw new Error("Ambiguous business memory scope.");
    const datapackId = matches[0]
      ? resourceId(matches[0])
      : resourceId(
          await callMekoTool(
            "datapack_create",
            { name: row.name, conversation_id: trace, datapack_id: bootstrap },
            signal,
          ),
        );
    const providerId = await providerConversation(
      datapackId,
      `context-${row.name}`,
      signal,
    );
    await pool.query(
      `UPDATE munim_memory_scopes SET datapack_id=$1,provider_conversation_id=$4,status='ready',lease_token=NULL,lease_until=NULL WHERE business_id=$2 AND lease_token=$3`,
      [datapackId, row.business_id, lease, providerId],
    );
  } catch {
    await pool.query(
      `UPDATE munim_memory_scopes SET status=$1,lease_token=NULL,lease_until=NULL,retry_at=now()+interval '30 seconds' WHERE business_id=$2 AND lease_token=$3`,
      [
        row.attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        row.business_id,
        lease,
      ],
    );
    console.warn("[memory-provision]", {
      attempt: row.attempts,
      failed: row.attempts >= MAX_ATTEMPTS,
    });
  }
  return true;
}
async function captureOne() {
  const pool = getPool();
  if (!pool) return;
  const lease = randomUUID();
  const claimed = await pool.query(
    `UPDATE munim_memory_captures SET status='processing',lease_token=$1,lease_until=now()+interval '60 seconds',attempts=attempts+1 WHERE request_id=(SELECT c.request_id FROM munim_memory_captures c JOIN munim_memory_scopes s ON s.business_id=c.business_id AND s.status='ready' WHERE c.status IN ('pending','processing') AND c.attempts<$2 AND c.retry_at<=now() AND (c.lease_until IS NULL OR c.lease_until<now()) AND NOT (c.capture_kind='convention' AND c.status='processing') ORDER BY c.retry_at LIMIT 1 FOR UPDATE OF c SKIP LOCKED) RETURNING request_id,business_id,conversation_id,input,output,attempts,capture_kind`,
    [lease, MAX_ATTEMPTS],
  );
  const row = z
    .object({
      capture_kind: z.enum(["conversation", "convention"]),
      request_id: z.string(),
      business_id: z.string(),
      conversation_id: z.string(),
      input: z.string(),
      output: z.string(),
      attempts: z.number(),
    })
    .optional()
    .parse(claimed.rows[0]);
  if (!row) return;
  try {
    const scope = await readyScope(row.business_id),
      signal = AbortSignal.timeout(35_000);
    const trace = await providerConversation(
      scope.datapackId,
      `finance-${row.conversation_id}`,
      signal,
    );
    await callMekoTool(
      row.capture_kind === "convention" ? "memory_add" : "conversation_add_message",
      {
        conversation_id: trace,
        datapack_id: scope.datapackId,
        agent_id: memoryAgentId,
        ...(row.capture_kind === "convention" ? { text: row.input, run_id: row.request_id } : { input: row.input, output: row.output, seed: row.request_id }),
        metadata: JSON.stringify({
          source: "munim-finance",
          request_id: row.request_id,
        }),
      },
      signal,
    );
    invalidateRecall();
    await pool.query("UPDATE munim_memory_scopes SET recall_revision=recall_revision+1 WHERE business_id=$1", [row.business_id]);
    await pool.query(
      `UPDATE munim_memory_captures SET status='done',input='',output='',lease_token=NULL,lease_until=NULL WHERE request_id=$1 AND lease_token=$2`,
      [row.request_id, lease],
    );
  } catch {
    await pool.query(
      `UPDATE munim_memory_captures SET status=$1,lease_token=NULL,lease_until=NULL,retry_at=now()+interval '30 seconds' WHERE request_id=$2 AND lease_token=$3`,
      [
        row.capture_kind === "convention" || row.attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        row.request_id,
        lease,
      ],
    );
    console.warn("[memory-capture]", {
      attempt: row.attempts,
      failed: row.attempts >= MAX_ATTEMPTS,
    });
  }
}
export function startMemoryWorker(): () => Promise<void> {
  let stopped = false,
    active: Promise<void> | null = null;
  const tick = () => {
    if (
      stopped ||
      active ||
      !isMekoConfigured() ||
      process.env.MUNIM_MEMORY_ENABLED === "false"
    )
      return;
    active = (async () => {
      const pool = getPool();
      await pool?.query(
        `DELETE FROM munim_memory_captures WHERE created_at<now()-interval '7 days' AND (lease_until IS NULL OR lease_until<now())`,
      );
      await pool?.query(
        `UPDATE munim_memory_captures SET status='failed',lease_token=NULL,lease_until=NULL WHERE status='processing' AND (attempts>=5 OR capture_kind='convention') AND lease_until<now()`,
      );
      await pool?.query(
        `UPDATE munim_memory_scopes SET status='failed',lease_token=NULL,lease_until=NULL WHERE status='pending' AND attempts>=5 AND lease_until<now()`,
      );
      await provisionOne();
      await captureOne();
    })()
      .catch(() => console.warn("[memory-worker]", { failed: true }))
      .finally(() => {
        active = null;
      });
  };
  const timer = setInterval(tick, 1000);
  timer.unref();
  tick();
  return async () => {
    stopped = true;
    clearInterval(timer);
    await active;
    await closeMekoConnection();
  };
}

export async function searchShopMemory(
  businessId: string,
  query: string,
): Promise<MemoryContext> {
  return recallShopContext({
    businessId,
    query,
    conversationId: `memory-ui-${createHash("sha256").update(businessId).digest("hex").slice(0, 16)}`,
    timeoutMs: 15000,
    retrieval: "semantic",
  });
}
export async function listShopMemory(businessId: string): Promise<MemoryContext> {
  if (!isMekoConfigured()) return empty("not_configured");
  if (process.env.MUNIM_MEMORY_ENABLED === "false") return empty("disabled");
  try {
    const scope = await readyScope(businessId);
    const result = await callMekoTool("memory_get_all", {
      conversation_id: scope.providerConversationId,
      datapack_id: scope.datapackId,
      agent_id: memoryAgentId,
    }, AbortSignal.timeout(15000));
    const facts = parseMemoryFacts({ memory: records(object(result).memories).slice(0, 20) }, 20);
    await rememberVisibleFacts(businessId, facts);
    return { status: "ready", facts, usedIds: [], retrieval: "recent", retrievedAt: new Date().toISOString() };
  } catch {
    return empty("unavailable");
  }
}
export async function addShopMemory(businessId: string, text: string) {
  const scope = await readyScope(businessId),
    signal = AbortSignal.timeout(15_000);
  await callMekoTool(
    "memory_add",
    {
      conversation_id: scope.providerConversationId,
      datapack_id: scope.datapackId,
      agent_id: memoryAgentId,
      text,
      metadata: JSON.stringify({ source: "munim-convention" }),
    },
    signal,
  );
  invalidateRecall();
  await getDatabase()?.update(memoryScopes).set({ recallRevision: sql`${memoryScopes.recallRevision}+1` }).where(eq(memoryScopes.businessId, businessId));
  return { saved: true };
}
export async function changeShopMemory({
  businessId,
  memoryId,
  text,
}: {
  businessId: string;
  memoryId: string;
  text?: string;
}) {
  const db = getDatabase();
  if (!db) throw new MekoConfigurationError();
  const [item] = await db
    .select()
    .from(memoryItems)
    .where(
      and(
        eq(memoryItems.businessId, businessId),
        eq(memoryItems.memoryId, memoryId),
      ),
    );
  if (!item || item.source !== "memory" || item.editable !== "yes")
    throw new Error("Search for this editable memory before changing it.");
  const scope = await readyScope(businessId),
    signal = AbortSignal.timeout(15_000);
  const args = {
    memory_id: memoryId,
    conversation_id: scope.providerConversationId,
    datapack_id: scope.datapackId,
    agent_id: memoryAgentId,
  };
  const current = await callMekoTool("memory_get_by_id", args, signal);
  const verified = object(current);
  const nestedMemory = objectSchema.safeParse(verified.memory);
  const nestedData = objectSchema.safeParse(verified.data);
  const contained = objectSchema.safeParse(
    nestedMemory.success
      ? nestedMemory.data
      : nestedData.success
        ? nestedData.data
        : verified,
  );
  const metadata = contained.success
    ? objectSchema.safeParse(contained.data.metadata)
    : null;
  if (
    !contained.success ||
    idSchema.parse(contained.data.id ?? contained.data.memory_id) !==
      memoryId ||
    contained.data.agent_id !== memoryAgentId ||
    !metadata?.success ||
    metadata.data.meko_datapack_id !== scope.datapackId
  )
    throw new Error("Memory could not be verified.");
  await callMekoTool(
    text === undefined ? "memory_delete_by_id" : "memory_update",
    text === undefined ? args : { ...args, text },
    signal,
  );
  invalidateRecall();
  await db.transaction(async (tx) => {
    await tx.update(memoryScopes).set({ recallRevision: sql`${memoryScopes.recallRevision}+1` }).where(eq(memoryScopes.businessId, businessId));
    const rows = await tx
      .select()
      .from(conversations)
      .where(eq(conversations.businessId, businessId))
      .for("update");
    for (const row of rows) {
      const state = conversationSchema.parse(row.state);
      if (state.phase === "saved" || !state.memory.usedIds.includes(memoryId))
        continue;
      const reply =
        state.language === "hi"
          ? "दुकान की याददाश्त बदल गई है। लेन-देन फिर से बता दें।"
          : "Shop context changed. Please describe the entry again.";
      await tx
        .update(conversations)
        .set({
          state: {
            ...state,
            revision: state.revision + 1,
            draft: {},
            messages: [],
            phase: "collecting",
            reviewedRevision: null,
            voiceReviewedRevision: null,
            replyIsReview: false,
            reply,
            memory: empty("unavailable"),
          },
        })
        .where(eq(conversations.id, row.id));
    }
  });
  if (text === undefined)
    await db
      .delete(memoryItems)
      .where(
        and(
          eq(memoryItems.businessId, businessId),
          eq(memoryItems.memoryId, memoryId),
        ),
      );
  else
    await db
      .update(memoryItems)
      .set({ text })
      .where(
        and(
          eq(memoryItems.businessId, businessId),
          eq(memoryItems.memoryId, memoryId),
        ),
      );
  return { saved: true };
}
