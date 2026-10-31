import type { ApprovalMode, CreateTransactionInput } from "@munim/contracts";
import type { getDatabase } from "../db/index.js";
import { settlements, transactions } from "../db/schema.js";

type Database = NonNullable<ReturnType<typeof getDatabase>>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export async function insertTransaction(
  tx: Transaction,
  input: CreateTransactionInput,
  {
    businessId,
    source,
    id,
    approvalMode,
  }: {
    businessId: string;
    source: "manual" | "voice";
    id: string;
    approvalMode: ApprovalMode;
  },
) {
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
  const [entry] = await tx
    .insert(transactions)
    .values({ ...input, id, businessId, source, occurredAt, approvalMode })
    .returning();
  const paid =
    input.settlementStatus === "settled"
      ? input.amountPaise
      : (input.settledAmountPaise ?? 0);
  if (paid > 0 && input.direction !== "transfer") {
    await tx.insert(settlements).values({
      businessId,
      transactionId: entry.id,
      amountPaise: paid,
      direction: input.direction,
      method: input.paymentMethod,
      source: "manual",
      occurredAt,
    });
  }
  return entry;
}
