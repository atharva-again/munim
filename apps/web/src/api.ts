import { z } from "zod";
import {
  insightsSchema,
  preferencesSchema,
  preferredLanguageSchema,
  type PreferredLanguage,
  ledgerSummarySchema,
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
async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(payload);
    throw new Error(
      error.success ? error.data.error : `Request failed (${response.status})`,
    );
  }
  return schema.parse(payload);
}
const memoryResultSchema = z.object({ result: z.unknown() });
export const api = {
  preferences: (signal: AbortSignal) =>
    request("/api/preferences", preferencesSchema, { signal }),
  saveLanguage: (language: PreferredLanguage) =>
    request(
      "/api/preferences",
      z.object({ language: preferredLanguageSchema }),
      { method: "POST", body: JSON.stringify({ language }) },
    ),
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
  searchMemory: (query: string) =>
    request("/api/memory/search", memoryResultSchema, {
      method: "POST",
      body: JSON.stringify({ query }),
    }),
  addMemory: (text: string) =>
    request("/api/memory/add", memoryResultSchema, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
};
const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
export function formatRupees(amountPaise: number): string {
  return rupeeFormatter.format(amountPaise / 100);
}
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}
