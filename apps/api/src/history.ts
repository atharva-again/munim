import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { conversationMessageSchema } from "@munim/contracts";
import type { ApiEnv } from "./auth.js";
import { getDatabase } from "./db/index.js";
import { conversationHistory } from "./db/schema.js";

export const historyRoutes = new Hono<ApiEnv>();
historyRoutes.get("/", async (c) => {
  const db = getDatabase();
  if (!db) return c.json({error:"Conversation history is unavailable."},503);
  const page = z.coerce.number().int().min(0).max(10000).catch(0).parse(c.req.query("page"));
  const rows = await db.select().from(conversationHistory).where(eq(conversationHistory.businessId,c.get("businessId"))).orderBy(desc(conversationHistory.updatedAt),desc(conversationHistory.id)).limit(21).offset(page*20);
  return c.json({hasMore:rows.length>20,items:rows.slice(0,20).map((row)=>{
    const messages=z.array(conversationMessageSchema).parse(row.messages);
    return {id:row.id,updatedAt:row.updatedAt.toISOString(),preview:messages.find(m=>m.role==="user")?.text ?? "",channels:[...new Set(messages.map(m=>m.channel))]};
  })});
});
historyRoutes.get("/:id", async (c) => {
  const db=getDatabase();
  const id=z.string().uuid().safeParse(c.req.param("id"));
  if(!id.success) return c.json({error:"Conversation not found."},404);
  if(!db) return c.json({error:"Conversation history is unavailable."},503);
  const [row]=await db.select().from(conversationHistory).where(and(eq(conversationHistory.id,id.data),eq(conversationHistory.businessId,c.get("businessId"))));
  if(!row) return c.json({error:"Conversation not found."},404);
  return c.json({id:row.id,updatedAt:row.updatedAt.toISOString(),messages:z.array(conversationMessageSchema).parse(row.messages)});
});
