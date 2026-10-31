import type {
  CreateTransactionInput,
  LedgerSummary,
  Transaction,
} from "@munim/contracts";

export type ApiHealth = {
  service: string;
  database: "connected" | "not_configured" | "unreachable";
  meko: "configured" | "not_configured";
  speechToText: "provider_selected" | "adapter_pending" | "not_configured";
  razorpay: "test_keys_configured" | "live_keys_rejected" | "not_configured";
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }
  return payload;
}

export const api = {
  health: () => request<ApiHealth>("/api/health"),
  summary: () => request<LedgerSummary>("/api/ledger/summary"),
  transactions: () => request<Transaction[]>("/api/transactions?limit=100"),
  createTransaction: (input: CreateTransactionInput) =>
    request<Transaction>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createPaymentLink: (transactionId: string) =>
    request<{ shortUrl: string; status: string }>(
      `/api/payment-links/${transactionId}`,
      { method: "POST" },
    ),
  memoryStatus: () =>
    request<{ configured: boolean; datapackConfigured: boolean }>(
      "/api/memory/status",
    ),
  searchMemory: (query: string) =>
    request<{ result: unknown }>("/api/memory/search", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),
  addMemory: (text: string) =>
    request<{ result: unknown }>("/api/memory/add", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
};

export function formatRupees(amountPaise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amountPaise / 100);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

