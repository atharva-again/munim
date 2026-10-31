import { validateDraft, type Conversation } from "@munim/contracts";

export function isConfirmation(text: string): boolean {
  return /^(yes|yes please|confirm|save|save it|save entry|haan|han|ha|ji haan|हाँ|हां|जी हाँ|सहेज दो|सेव कर दो)[.!।\s]*$/iu.test(
    text.trim(),
  );
}
export function reviewText(state: Pick<Conversation, "draft">, hindi = false) {
  const input = validateDraft(state.draft);
  if (!input) throw new Error("Complete the transaction before reviewing.");
  const amount = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(input.amountPaise / 100);
  const paid =
    input.settlementStatus === "settled"
      ? input.amountPaise
      : (input.settledAmountPaise ?? 0);
  const due = new Intl.NumberFormat("en-IN").format(
    (input.amountPaise - paid) / 100,
  );
  const movement =
    input.direction === "inflow"
      ? "incoming"
      : input.direction === "outflow"
        ? "outgoing"
        : "transfer";
  const status =
    input.settlementStatus === "settled"
      ? "fully paid"
      : `${paid / 100} rupees paid, ${due} rupees due`;
  return hindi
    ? `${input.description}। ${input.kind}, ${movement}, ${amount} रुपये। ${input.counterparty || ""}। ${status}। भुगतान का तरीका: ${input.paymentMethod || "नहीं बताया"}। तारीख: ${input.occurredAt || "आज"}। सेव कर दूँ?`
    : `${input.description}. ${input.kind.replaceAll("_", " ")}, ${movement}, ${amount} rupees${input.counterparty ? `, ${input.counterparty}` : ""}. ${status}. Method: ${input.paymentMethod || "not specified"}. Date: ${input.occurredAt || "today"}. Shall I save it?`;
}
export function canConfirm(
  state: Conversation,
  revision: number,
  channel: "screen" | "voice" = "screen",
) {
  return (
    state.phase === "review" &&
    state.revision === revision &&
    (channel === "voice"
      ? state.voiceReviewedRevision
      : state.reviewedRevision) === revision &&
    validateDraft(state.draft) !== null
  );
}
