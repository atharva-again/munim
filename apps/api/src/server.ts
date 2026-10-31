import { serve } from "@hono/node-server";
import { app } from "./index.js";
import { startMemoryWorker } from "./services/shop-memory.js";
import { getPool } from "./db/index.js";
import { timingSummary } from "./services/metrics.js";
import { z } from "zod";
import { getDatabase } from "./db/index.js";
import { conversations } from "./db/schema.js";
import { eq } from "drizzle-orm";
const port = Number(process.env.PORT ?? 3001);
const maxRequests = z.coerce
  .number()
  .int()
  .min(1)
  .max(1000)
  .default(64)
  .parse(process.env.MUNIM_API_MAX_REQUESTS);
let active = 0,
  draining = false;
app.get("/api/voice-metrics", async (c) => {
  const ids = await getDatabase()
    ?.select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.businessId, c.get("businessId")));
  return c.json({
    window: "last_hour_process_local",
    stages: timingSummary(ids?.map((row) => row.id) ?? []),
  });
});
const stopMemory = startMemoryWorker();
const server = serve(
  {
    fetch: async (request) => {
      if (draining || active >= maxRequests)
        return Response.json(
          { error: "Munim is busy. Please try again shortly." },
          { status: 503, headers: { "Retry-After": "2" } },
        );
      active++;
      try {
        return await app.fetch(request);
      } finally {
        active--;
      }
    },
    port,
  },
  (info) =>
    console.info(`Munim API listening on http://localhost:${info.port}`),
);
const shutdown = async () => {
  if (draining) return;
  draining = true;
  const force = setTimeout(() => {
    if ("closeAllConnections" in server) server.closeAllConnections();
  }, 15000);
  force.unref();
  try {
    await Promise.all([
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
      stopMemory(),
    ]);
    await getPool()?.end();
  } catch (error) {
    console.error("[shutdown]", {
      reason: error instanceof Error ? error.name : "UnknownError",
    });
    process.exitCode = 1;
  } finally {
    clearTimeout(force);
  }
};
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
