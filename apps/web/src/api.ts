import { requestJson as request } from "./http";
import { currentLanguage } from "./translations";
import { z } from "zod";
import {
  insightsSchema,
  conversationHistorySchema,
  conversationMessageSchema,
  preferencesSchema,
  savePreferencesSchema,
  type SavedPreferences,
  ledgerSummarySchema,
  memoryContextSchema,
  memoryFactSchema,
  transactionSchema,
  type InsightQuery,
} from "@munim/contracts";
const healthSchema = z.object({
  service: z.string(),
  database: z.enum(["connected", "not_configured", "unreachable"]),
  meko: z.enum(["configured", "not_configured"]),
  speechToText: z.enum(["provider_selected", "not_configured"]),
  razorpay: z.enum([
    "test_keys_configured",
    "live_keys_rejected",
    "not_configured",
  ]),
});
export type ApiHealth = z.infer<typeof healthSchema>;
const memorySearchSchema = z.object({ result: memoryContextSchema });
const memoryReceiptSchema = z.object({
  result: z.object({ saved: z.literal(true) }),
});
export const api = {
  conversationHistory: (page:number,signal?:AbortSignal) => request(`/api/conversation-history?page=${page}`,z.object({hasMore:z.boolean(),items:z.array(z.object({id:z.string().uuid(),updatedAt:z.string().datetime(),preview:z.string(),channels:z.array(conversationMessageSchema.shape.channel)}))}),{signal}),
  pastConversation: (id:string,signal?:AbortSignal) => request(`/api/conversation-history/${encodeURIComponent(id)}`,conversationHistorySchema,{signal}),
  preferences: (signal: AbortSignal) =>
    request("/api/preferences", preferencesSchema, { signal }),
  savePreferences: (preferences: SavedPreferences) =>
    request("/api/preferences", savePreferencesSchema, {
      method: "POST",
      body: JSON.stringify(preferences),
    }),
  insights: (query: InsightQuery, signal: AbortSignal) =>
    request(
      `/api/insights?${new URLSearchParams({ period: query.period, direction: query.direction, age: query.age, page: String(query.page) })}`,
      insightsSchema,
      { signal },
    ),
  health: () => request("/api/health", healthSchema),
  summary: () => request("/api/ledger/summary", ledgerSummarySchema),
  transactions: () =>
    request("/api/transactions?limit=100", z.array(transactionSchema)),
  createPaymentLink: (transactionId: string) =>
    request(
      `/api/payment-links/${transactionId}`,
      z.object({ shortUrl: z.string().url(), status: z.string() }),
      { method: "POST" },
    ),
  recentMemories: (signal?: AbortSignal) => request("/api/memory/recent", z.object({
    result: memoryContextSchema.extend({ facts: z.array(memoryFactSchema).max(20) }),
  }), { signal }),
  searchMemory: (query: string) =>
    request("/api/memory/search", memorySearchSchema, {
      method: "POST",
      body: JSON.stringify({ query }),
    }),
  addMemory: (text: string) =>
    request("/api/memory/add", memoryReceiptSchema, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  memoryStatus: () =>
    request(
      "/api/memory/status",
      z.object({
        configured: z.boolean(),
        status: z.string(),
        pendingCaptures: z.number(),
        failedCaptures: z.number(),
      }),
    ),
  retryMemory: () =>
    request("/api/memory/retry", z.object({ ok: z.boolean() }), {
      method: "POST",
      body: "{}",
    }),
  changeMemory: (id: string, text?: string) =>
    request(
      `/api/memory/${encodeURIComponent(id)}/${text === undefined ? "forget" : "update"}`,
      memoryReceiptSchema,
      {
        method: "POST",
        body: JSON.stringify(text === undefined ? {} : { text }),
      },
    ),
};
const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
export function formatRupees(amountPaise: number): string {
  return rupeeFormatter.format(amountPaise / 100);
}
const dateFormatters = {
  en: new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }),
  hi: new Intl.DateTimeFormat("hi-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }),
};
export function formatDate(value: string): string {
  return dateFormatters[currentLanguage()].format(new Date(value));
}
