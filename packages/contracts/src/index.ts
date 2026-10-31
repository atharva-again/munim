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
  settlementStatus: settlementStatusSchema.default("settled"),
  occurredAt: z.string().datetime().optional(),
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
  customer_payment: "Customer payment",
  supplier_payment: "Supplier payment",
  refund: "Refund",
  transfer: "Transfer",
  other: "Other",
};

