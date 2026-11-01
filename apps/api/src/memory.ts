import { Hono } from "hono";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import type { ApiEnv } from "./auth.js";
import { getDatabase } from "./db/index.js";
import { memoryCaptures, memoryScopes } from "./db/schema.js";
import {
  addShopMemory,
  changeShopMemory,
  getMemoryStatus,
  listShopMemory,
  searchShopMemory,
} from "./services/shop-memory.js";
import { MekoConfigurationError } from "./services/meko.js";

export const memoryRoutes = new Hono<ApiEnv>();
memoryRoutes.onError((error, c) => {
  console.warn("[memory-route]", { reason: error.name });
  return c.json(
    {
      error:
        error instanceof MekoConfigurationError
          ? error.message
          : "Business memory could not complete that request. Please try again.",
    },
    503,
  );
});
const textSchema = z.object({ text: z.string().trim().min(1).max(2000) });
const memoryIdSchema = z.string().trim().min(1).max(200);
memoryRoutes.get("/status", async (c) =>
  c.json(await getMemoryStatus(c.get("businessId"))),
);
memoryRoutes.get("/recent", async (c) =>
  c.json({ result: await listShopMemory(c.get("businessId")) }),
);
memoryRoutes.post("/search", async (c) => {
  const parsed = z
    .object({ query: z.string().trim().min(1).max(800) })
    .safeParse(await c.req.json());
  if (!parsed.success)
    return c.json({ error: "Add a valid search query." }, 400);
  return c.json({
    result: await searchShopMemory(c.get("businessId"), parsed.data.query),
  });
});
memoryRoutes.post("/add", async (c) => {
  const parsed = textSchema.safeParse(await c.req.json());
  if (!parsed.success)
    return c.json(
      { error: "Memory text must be between 1 and 2,000 characters." },
      400,
    );
  return c.json(
    { result: await addShopMemory(c.get("businessId"), parsed.data.text) },
    201,
  );
});
memoryRoutes.post("/:id/update", async (c) => {
  const id = memoryIdSchema.safeParse(c.req.param("id"));
  const parsed = textSchema.safeParse(await c.req.json());
  if (!id.success || !parsed.success)
    return c.json(
      { error: "Choose a valid memory and replacement text." },
      400,
    );
  return c.json({
    result: await changeShopMemory({
      businessId: c.get("businessId"),
      memoryId: id.data,
      text: parsed.data.text,
    }),
  });
});
memoryRoutes.post("/:id/forget", async (c) => {
  const id = memoryIdSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "Choose a valid memory." }, 400);
  return c.json({
    result: await changeShopMemory({
      businessId: c.get("businessId"),
      memoryId: id.data,
    }),
  });
});
memoryRoutes.post("/retry", async (c) => {
  const db = getDatabase();
  if (!db) throw new MekoConfigurationError();
  await db.transaction(async (tx) => {
    await tx
      .update(memoryScopes)
      .set({
        status: "pending",
        attempts: 0,
        retryAt: new Date(),
        leaseToken: null,
        leaseUntil: null,
      })
      .where(
        and(
          eq(memoryScopes.businessId, c.get("businessId")),
          eq(memoryScopes.status, "failed"),
        ),
      );
    await tx
      .update(memoryCaptures)
      .set({
        status: "pending",
        attempts: 0,
        retryAt: new Date(),
        leaseToken: null,
        leaseUntil: null,
      })
      .where(
        and(
          eq(memoryCaptures.businessId, c.get("businessId")),
          eq(memoryCaptures.status, "failed"),
        ),
      );
  });
  return c.json({ result: { queued: true } });
});
