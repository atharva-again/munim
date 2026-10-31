import {
  validateDraft,
  type Conversation,
  type PreferredLanguage,
  type TransactionKind,
} from "@munim/contracts";

export function isConfirmation(text: string): boolean {
  return /^(yes|yes please|confirm|save|save it|save entry|haan|han|ha|ji haan|हाँ|हां|जी हाँ|सहेज दो|सेव कर दो)[.!।\s]*$/iu.test(
    text.trim(),
  );
}
const amountFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});
const hindiKinds: Record<TransactionKind, string> = {
  sale: "बिक्री",
  purchase: "खरीद",
  expense: "खर्च",
  customer_payment: "ग्राहक से भुगतान",
  supplier_payment: "सप्लायर को भुगतान",
  refund: "रकम वापसी",
  transfer: "खातों के बीच ट्रांसफ़र",
  other: "लेन-देन",
};
export function reviewText(
  state: Pick<Conversation, "draft" | "language">,
  language: PreferredLanguage = state.language,
) {
  const input = validateDraft(state.draft);
  if (!input) throw new Error("Complete the transaction before reviewing.");
  const amount = amountFormatter.format(input.amountPaise / 100);
  const paid =
    input.settlementStatus === "settled"
      ? input.amountPaise
      : (input.settledAmountPaise ?? 0);
  const paidText = amountFormatter.format(paid / 100),
    due = amountFormatter.format((input.amountPaise - paid) / 100);
  const date = input.occurredAt
    ? new Intl.DateTimeFormat(language === "en" ? "en-IN" : "hi-IN", {
        dateStyle: "medium",
        timeZone: "Asia/Kolkata",
      }).format(new Date(input.occurredAt))
    : language === "en"
      ? "today"
      : "आज";
  if (language !== "en") {
    const status =
      input.settlementStatus === "settled"
        ? "पूरा भुगतान हो गया है"
        : `${paidText} रुपये ${input.direction === "inflow" ? "मिले" : "दिए"} हैं, ${due} रुपये बाकी हैं`;
    const method = input.paymentMethod
      ? ` भुगतान का तरीका: ${{ cash: "नकद", upi: "यू पी आई", bank: "बैंक", card: "कार्ड", other: "अन्य" }[input.paymentMethod]}।`
      : "";
    const movement =
      input.direction === "inflow"
        ? "आने वाली रकम"
        : input.direction === "outflow"
          ? "जाने वाली रकम"
          : "खातों के बीच रकम";
    return `${input.description}। ${hindiKinds[input.kind]}, ${movement}, ${amount} रुपये${input.counterparty ? `, ${input.counterparty}` : ""}। ${status}।${method} तारीख: ${date}। ${language === "hinglish" ? "Entry save कर दूँ?" : "सेव कर दूँ?"}`;
  }
  const movement =
    input.direction === "inflow"
      ? "incoming"
      : input.direction === "outflow"
        ? "outgoing"
        : "transfer";
  const status =
    input.settlementStatus === "settled"
      ? "fully paid"
      : `${paidText} rupees paid, ${due} rupees due`;
  return `${input.description}. ${input.kind.replaceAll("_", " ")}, ${movement}, ${amount} rupees${input.counterparty ? `, ${input.counterparty}` : ""}. ${status}.${input.paymentMethod ? ` Method: ${input.paymentMethod}.` : ""} Date: ${date}. Shall I save it?`;
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
