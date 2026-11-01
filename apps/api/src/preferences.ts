import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { eq } from "drizzle-orm";
import { preferencesSchema, savePreferencesSchema } from "@munim/contracts";
import type { ApiEnv } from "./auth.js";
import { getDatabase } from "./db/index.js";
import { userPreferences } from "./db/schema.js";

export const preferenceRoutes = new Hono<ApiEnv>();
preferenceRoutes.use("*", bodyLimit({ maxSize: 1024 }));
preferenceRoutes.onError((error, c) => {
  console.error("[preferences]", error);
  return c.json(
    { error: "Could not load or save your preferences. Please try again." },
    503,
  );
});
export async function readPreferences(
  db: NonNullable<ReturnType<typeof getDatabase>>,
  businessId: string,
  lock = false,
) {
  const query = db
    .select({
      shopName: userPreferences.shopName,
      language: userPreferences.language,
      approvalMode: userPreferences.approvalMode,
    })
    .from(userPreferences)
    .where(eq(userPreferences.businessId, businessId));
  const [row] = await (lock ? query.for("share") : query);
  return preferencesSchema.parse(
    row
      ? { ...row, language: row.language === "hinglish" ? "hi" : row.language }
      : { language: null, approvalMode: null },
  );
}
preferenceRoutes.get("/", async (c) => {
  const db = getDatabase();
  if (!db)
    return c.json({ error: "Connect your account database first." }, 503);
  return c.json(await readPreferences(db, c.get("businessId")));
});
preferenceRoutes.post("/", async (c) => {
  const db = getDatabase();
  if (!db)
    return c.json({ error: "Connect your account database first." }, 503);
  const parsed = savePreferencesSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success)
    return c.json(
      { error: "Enter your shop name, choose your language and how entries should be saved." },
      400,
    );
  await db
    .insert(userPreferences)
    .values({ businessId: c.get("businessId"), ...parsed.data })
    .onConflictDoUpdate({
      target: userPreferences.businessId,
      set: { ...parsed.data, updatedAt: new Date() },
    });
  return c.json(parsed.data);
});
