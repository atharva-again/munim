import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { preferredLanguageSchema, preferencesSchema } from "@munim/contracts";
import type { ApiEnv } from "./auth.js";
import { getDatabase } from "./db/index.js";
import { userPreferences } from "./db/schema.js";
export const preferenceRoutes = new Hono<ApiEnv>();
preferenceRoutes.use("*", bodyLimit({ maxSize: 1024 }));
preferenceRoutes.onError((error, c) => {
  console.error("[preferences]", error);
  return c.json(
    {
      error:
        "Could not load or save your language preference. Please try again.",
    },
    503,
  );
});
export async function readLanguage(
  db: NonNullable<ReturnType<typeof getDatabase>>,
  businessId: string,
) {
  const [row] = await db
    .select({ language: userPreferences.language })
    .from(userPreferences)
    .where(eq(userPreferences.businessId, businessId));
  return row ? preferredLanguageSchema.parse(row.language) : null;
}
preferenceRoutes.get("/", async (c) => {
  const db = getDatabase();
  if (!db)
    return c.json({ error: "Connect your account database first." }, 503);
  return c.json(
    preferencesSchema.parse({
      language: await readLanguage(db, c.get("businessId")),
    }),
  );
});
preferenceRoutes.post("/", async (c) => {
  const db = getDatabase();
  if (!db)
    return c.json({ error: "Connect your account database first." }, 503);
  const parsed = z
    .object({ language: preferredLanguageSchema })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success)
    return c.json({ error: "Choose Hindi, English, or Hinglish." }, 400);
  await db
    .insert(userPreferences)
    .values({ businessId: c.get("businessId"), language: parsed.data.language })
    .onConflictDoUpdate({
      target: userPreferences.businessId,
      set: { language: parsed.data.language, updatedAt: new Date() },
    });
  return c.json({ language: parsed.data.language });
});
