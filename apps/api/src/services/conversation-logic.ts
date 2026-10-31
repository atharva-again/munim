import {
  validateDraft,
  type Conversation,
  type CreateTransactionInput,
  type PreferredLanguage,
  type TransactionDraft,
  transactionKindLabels,
} from "@munim/contracts";

export function isConfirmation(text: string): boolean {
  return /^(yes|yes please|confirm|save|save it|save entry|haan|han|ha|ji haan|हाँ|हां|जी हाँ|सहेज दो|सेव कर दो)[.!।\s]*$/iu.test(
    text.trim(),
  );
}
const amountFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});
const dateFormatters = {
  en: new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }),
  hi: new Intl.DateTimeFormat("hi-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }),
};
function entrySummary(
  input: CreateTransactionInput,
  language: PreferredLanguage,
) {
  const amount = amountFormatter.format(input.amountPaise / 100);
  const paid = amountFormatter.format((input.settledAmountPaise ?? 0) / 100);
  const due = amountFormatter.format(
    (input.amountPaise - (input.settledAmountPaise ?? 0)) / 100,
  );
  const party = input.counterparty;
  if (language === "en") {
    const money = `₹${amount}`,
      who = party ? ` ${party}` : "";
    const purpose =
      input.kind === "other"
        ? "entry"
        : transactionKindLabels[input.kind].toLowerCase();
    if (input.direction === "transfer")
      return `A ${money} transfer between your accounts`;
    if (input.settlementStatus === "open")
      return input.direction === "inflow"
        ? `${party || "Your customer"} owes ${money} for this ${purpose}`
        : `${money} is still due${party ? ` to${who}` : ""} for this ${purpose}`;
    if (input.settlementStatus === "partial")
      return input.direction === "inflow"
        ? `₹${paid} received${party ? ` from${who}` : ""} on the ${money} ${purpose}, with ₹${due} still due`
        : `₹${paid} paid${party ? ` to${who}` : ""} on the ${money} ${purpose}, with ₹${due} still to pay`;
    return input.direction === "inflow"
      ? `${money} received${party ? ` from${who}` : ""} for this ${purpose}`
      : `${money} paid${party ? ` to${who}` : ""} for this ${purpose}`;
  }
  if (input.direction === "transfer")
    return `${amount} रुपये अपने खातों के बीच ट्रांसफ़र किए`;
  if (input.settlementStatus === "open")
    return input.direction === "inflow"
      ? `${party ? `${party} के नाम` : "ग्राहक के नाम"} ${amount} रुपये उधार हैं`
      : `${party ? `${party} को` : "अभी"} ${amount} रुपये देने बाकी हैं`;
  if (input.settlementStatus === "partial")
    return input.direction === "inflow"
      ? `${party ? `${party} से ` : ""}${amount} में से ${paid} रुपये मिले, ${due} रुपये बाकी हैं`
      : `${party ? `${party} को ` : ""}${amount} में से ${paid} रुपये दिए, ${due} रुपये बाकी हैं`;
  return input.direction === "inflow"
    ? `${party ? `${party} से ` : ""}${amount} रुपये मिल गए`
    : `${party ? `${party} को ` : ""}${amount} रुपये ${input.kind === "refund" ? "वापस दिए" : input.kind === "expense" ? "खर्च के चुकाए" : "दे दिए"}`;
}
function dateNote(input: CreateTransactionInput, language: PreferredLanguage) {
  if (!input.occurredAt) return "";
  const formatter = dateFormatters[language === "en" ? "en" : "hi"];
  const date = formatter.format(new Date(input.occurredAt));
  if (date === formatter.format(new Date())) return "";
  return language === "en" ? ` For ${date}.` : ` यह ${date} की बात है।`;
}
export function reviewText(
  state: Pick<Conversation, "draft" | "language">,
  language: PreferredLanguage = state.language,
) {
  const input = validateDraft(state.draft);
  if (!input) throw new Error("Complete the transaction before reviewing.");
  return language === "en"
    ? `${entrySummary(input, language)}.${dateNote(input, language)} Save it?`
    : `${entrySummary(input, language)}।${dateNote(input, language)} लिख दूँ?`;
}
export function savedText(
  state: Pick<Conversation, "draft" | "replyLanguage">,
) {
  const input = validateDraft(state.draft);
  if (!input) throw new Error("Complete the transaction before saving.");
  return state.replyLanguage === "en"
    ? `Saved. ${entrySummary(input, "en")}.${dateNote(input, "en")}`
    : `लिख लिया। ${entrySummary(input, state.replyLanguage)}।${dateNote(input, state.replyLanguage)}`;
}
export function clarificationText(
  draft: TransactionDraft,
  language: PreferredLanguage,
) {
  const english = language === "en";
  if (!draft.kind)
    return english
      ? "What happened? Tell me a little more."
      : "क्या हुआ था? थोड़ा और बताइए।";
  if (draft.amountPaise === undefined)
    return english ? "How much was it?" : "कितने रुपये का लेन-देन था?";
  if (!draft.description)
    return english ? "What was it for?" : "यह किस चीज़ के लिए था?";
  if (!draft.direction)
    return english ? "Did money come in or go out?" : "पैसे आए थे या गए थे?";
  if (!draft.settlementStatus)
    return english
      ? "Was it paid, partly paid, or still due?"
      : draft.direction === "outflow"
        ? "पैसे दे दिए, कुछ दिए या अभी देने बाकी हैं?"
        : "पैसे मिल गए, कुछ मिले या अभी उधार हैं?";
  if (draft.settlementStatus !== "settled" && !draft.counterparty)
    return english
      ? "Whose name should I put the balance under?"
      : "बाकी रकम किसके नाम लिखूँ?";
  if (draft.settlementStatus === "partial")
    return english
      ? "How much of the total has been paid?"
      : "कुल रकम में से कितने रुपये का भुगतान हो गया?";
  return english
    ? "Please clarify that entry before I record it."
    : "लिखने से पहले यह बात थोड़ा साफ़ बता दीजिए।";
}
export function canConfirm(
  state: Conversation,
  revision: number,
  channel: "screen" | "voice" = "screen",
) {
  return (
    state.phase === "review" &&
    state.revision === revision &&
    (state.approvalMode === "autonomous" ||
      (channel === "voice"
        ? state.voiceReviewedRevision
        : state.reviewedRevision) === revision) &&
    validateDraft(state.draft) !== null
  );
}
