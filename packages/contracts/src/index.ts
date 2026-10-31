import { z } from "zod";

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
export const conversationSchema = z.object({
  id: z.string().uuid(),
  revision: z.number().int(),
  draft: draftSchema,
  phase: z.enum(["collecting", "review", "saved"]),
  messages: z.array(conversationMessageSchema),
  reply: z.string(),
  reviewedRevision: z.number().int().nullable(),
  voiceReviewedRevision: z.number().int().nullable().default(null),
  transactionId: z.string().uuid().nullable(),
});
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
  const direction =
    input.kind === "transfer"
      ? "transfer"
      : ["purchase", "expense", "supplier_payment", "refund"].includes(
            input.kind,
          )
        ? "outflow"
        : ["sale", "customer_payment"].includes(input.kind)
          ? "inflow"
          : input.direction;
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
