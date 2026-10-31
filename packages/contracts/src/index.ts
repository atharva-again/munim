import { z } from "zod";

export const preferredLanguageSchema = z.enum(["en", "hi"]);
export type PreferredLanguage = z.infer<typeof preferredLanguageSchema>;
export const approvalModeSchema = z.enum(["approval", "autonomous"]);
export type ApprovalMode = z.infer<typeof approvalModeSchema>;
export const preferencesSchema = z.object({
  language: preferredLanguageSchema.nullable(),
  approvalMode: approvalModeSchema.nullable(),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const savePreferencesSchema = z.object({
  language: preferredLanguageSchema,
  approvalMode: approvalModeSchema,
});
export type SavedPreferences = z.infer<typeof savePreferencesSchema>;
export const approvalModeLabels: Record<ApprovalMode, string> = {
  approval: "Ask for Approval",
  autonomous: "Full Autonomy",
};
export const languageLabels: Record<PreferredLanguage, string> = {
  en: "English",
  hi: "Hindi",
};
export function greetingFor(language: PreferredLanguage): string {
  return {
    en: "Hello, I'm Munim. Tell me what happened.",
    hi: "नमस्ते, मैं मुनीम हूँ। बताइए, क्या लेन-देन हुआ?",
  }[language];
}

export const transactionKinds = [
  "sale",
  "purchase",
  "expense",
  "customer_payment",
  "supplier_payment",
  "refund",
  "transfer",
  "other",
] as const;

export const transactionDirections = ["inflow", "outflow", "transfer"] as const;
export const settlementStatuses = ["open", "partial", "settled"] as const;
export const paymentMethods = ["cash", "upi", "bank", "card", "other"] as const;

export const transactionKindSchema = z.enum(transactionKinds);
export const transactionDirectionSchema = z.enum(transactionDirections);
export const settlementStatusSchema = z.enum(settlementStatuses);
export const paymentMethodSchema = z.enum(paymentMethods);

export const createTransactionSchema = z.object({
  kind: transactionKindSchema,
  direction: transactionDirectionSchema,
  amountPaise: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  description: z.string().trim().min(1).max(500),
  counterparty: z.string().trim().max(160).optional().default(""),
  paymentMethod: paymentMethodSchema.optional(),
  settlementStatus: settlementStatusSchema,
  occurredAt: z.string().datetime().optional(),
  settledAmountPaise: z
    .number()
    .int()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER)
    .optional(),
});

export const transactionSchema = createTransactionSchema.extend({
  id: z.string().uuid(),
  businessId: z.string(),
  source: z.enum(["manual", "voice", "razorpay"]),
  paymentMethod: paymentMethodSchema.nullable(),
  occurredAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  paymentLink: z
    .object({
      shortUrl: z.string().url(),
      status: z.string(),
    })
    .nullable(),
});

export const ledgerSummarySchema = z.object({
  settledInflowPaise: z.number(),
  settledOutflowPaise: z.number(),
  openInflowPaise: z.number(),
  openOutflowPaise: z.number(),
  transactionCount: z.number(),
});

export type TransactionKind = (typeof transactionKinds)[number];
export type TransactionDirection = (typeof transactionDirections)[number];
export type SettlementStatus = (typeof settlementStatuses)[number];
export type PaymentMethod = (typeof paymentMethods)[number];
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type LedgerSummary = z.infer<typeof ledgerSummarySchema>;

export const directionByKind = {
  sale: "inflow",
  purchase: "outflow",
  expense: "outflow",
  customer_payment: "inflow",
  supplier_payment: "outflow",
  refund: "outflow",
  transfer: "transfer",
  other: undefined,
} satisfies Record<TransactionKind, TransactionDirection | undefined>;

export const transactionKindLabels: Record<TransactionKind, string> = {
  sale: "Sale",
  purchase: "Purchase",
  expense: "Expense",
  customer_payment: "Customer Payment",
  supplier_payment: "Supplier Payment",
  refund: "Refund",
  transfer: "Transfer",
  other: "Other",
};

export const draftSchema = createTransactionSchema.partial().extend({
  settlementStatus: settlementStatusSchema.optional(),
  counterparty: z.string().trim().max(160).optional(),
});
export type TransactionDraft = z.infer<typeof draftSchema>;
export const conversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string(),
  channel: z.enum(["voice", "text", "form"]),
  at: z.string(),
});
const storedLanguageSchema = z.union([
  preferredLanguageSchema,
  z.literal("hinglish").transform((): PreferredLanguage => "hi"),
]);
export const voiceActivitySchema = z.object({
  id: z.string().uuid(),
  state: z.enum(["processing", "ready", "error", "audio-error"]),
});
export const voiceCaptionSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  text: z.string().max(4000),
});
export const conversationSchema = z
  .object({
    language: storedLanguageSchema.default("en"),
    replyLanguage: storedLanguageSchema.optional(),
    approvalMode: approvalModeSchema.default("approval"),
    id: z.string().uuid(),
    entryId: z.string().uuid().optional(),
    revision: z.number().int(),
    draft: draftSchema,
    phase: z.enum(["collecting", "processing", "review", "saved"]),
    messages: z.array(conversationMessageSchema),
    reply: z.string(),
    reviewedRevision: z.number().int().nullable(),
    voiceReviewedRevision: z.number().int().nullable().default(null),
    transactionId: z.string().uuid().nullable(),
  })
  .transform((state) => ({
    ...state,
    entryId: state.entryId ?? state.id,
    replyLanguage: state.replyLanguage ?? state.language,
  }));
export type Conversation = z.infer<typeof conversationSchema>;
export const turnSchema = z.object({
  requestId: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  text: z.string().trim().min(1).max(2000),
  channel: z.enum(["text", "voice"]),
});
export const formDraftSchema = z.object({
  revision: z.number().int(),
  draft: draftSchema,
  submit: z.boolean().default(false),
});
export const revisionSchema = z.object({
  revision: z.number().int().nonnegative(),
});
export const voiceTokenSchema = z.object({
  token: z.string(),
  url: z.string().url(),
});

export function validateDraft(draft: TransactionDraft) {
  const parsed = createTransactionSchema.safeParse(draft);
  if (!parsed.success) return null;
  const input = parsed.data;
  const direction = directionByKind[input.kind] ?? input.direction;
  if (direction !== input.direction) return null;
  if (input.settlementStatus !== "settled" && !input.counterparty) return null;
  if (
    input.settlementStatus === "partial" &&
    (input.settledAmountPaise === undefined ||
      input.settledAmountPaise <= 0 ||
      input.settledAmountPaise >= input.amountPaise)
  )
    return null;
  if (
    input.settlementStatus === "open" &&
    (input.settledAmountPaise ?? 0) !== 0
  )
    return null;
  if (
    input.settlementStatus === "settled" &&
    input.settledAmountPaise !== undefined &&
    input.settledAmountPaise !== input.amountPaise
  )
    return null;
  if (input.direction === "transfer" && input.settlementStatus !== "settled")
    return null;
  return input;
}

export const insightPeriodSchema = z.enum(["7", "30", "90"]);
export const insightAgeSchema = z.enum(["all", "under7", "7to29", "30plus"]);
export const insightQuerySchema = z.object({
  period: insightPeriodSchema.default("30"),
  direction: z.enum(["inflow", "outflow"]).default("inflow"),
  age: insightAgeSchema.default("all"),
  page: z.coerce.number().int().min(0).max(100000).default(0),
});
const insightMoneySchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const insightCountSchema = z.number().int().nonnegative();
const paymentTotalsSchema = z.object({
  receivedPaise: insightMoneySchema,
  paidPaise: insightMoneySchema,
  paymentCount: insightCountSchema,
});
export const insightsSchema = z.object({
  asOf: z.string().datetime(),
  ledgerEntryCount: insightCountSchema,
  period: z.object({
    days: z.number().int(),
    from: z.string().datetime(),
    to: z.string().datetime(),
    previousFrom: z.string().datetime(),
    previousTo: z.string().datetime(),
  }),
  activity: z.object({
    current: paymentTotalsSchema,
    previous: paymentTotalsSchema,
  }),
  outflows: z.array(
    z.object({
      kind: transactionKindSchema,
      amountPaise: insightMoneySchema,
      paymentCount: insightCountSchema,
    }),
  ),
  outstanding: z.object({
    receivePaise: insightMoneySchema,
    payPaise: insightMoneySchema,
    receiveCount: insightCountSchema,
    payCount: insightCountSchema,
    aging: z.array(
      z.object({
        bucket: z.enum(["under7", "7to29", "30plus"]),
        receivePaise: insightMoneySchema,
        payPaise: insightMoneySchema,
      }),
    ),
  }),
  entries: z.object({
    total: insightCountSchema,
    page: insightCountSchema,
    pageSize: z.literal(20),
    items: z.array(
      z.object({
        id: z.string().uuid(),
        kind: transactionKindSchema,
        direction: z.enum(["inflow", "outflow"]),
        description: z.string(),
        counterparty: z.string(),
        amountPaise: insightMoneySchema,
        paidPaise: insightMoneySchema,
        remainingPaise: insightMoneySchema,
        occurredAt: z.string().datetime({ offset: true }),
        ageDays: insightCountSchema,
      }),
    ),
  }),
});
export type InsightQuery = z.infer<typeof insightQuerySchema>;
export type Insights = z.infer<typeof insightsSchema>;
