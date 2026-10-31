import { useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  transactionKindLabels,
  transactionKinds,
  transactionDirections,
  paymentMethods,
  type PaymentMethod,
  type CreateTransactionInput,
  type TransactionDirection,
  type TransactionKind,
} from "@munim/contracts";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
import { api, formatRupees } from "./api";
import {
  buttonClass,
  primaryClass,
  iconButtonClass,
  fieldClass,
  inputClass,
} from "./ui";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: CreateTransactionInput) => Promise<void>;
  saving: boolean;
  mekoConfigured: boolean;
};

function directionFor(
  kind: TransactionKind,
  custom: TransactionDirection | "",
) {
  if (kind === "transfer") return "transfer";
  if (
    kind === "purchase" ||
    kind === "expense" ||
    kind === "supplier_payment" ||
    kind === "refund"
  ) {
    return "outflow";
  }
  if (kind === "sale" || kind === "customer_payment") return "inflow";
  return custom;
}

export function TransactionDialog({
  open,
  onOpenChange,
  onSave,
  saving,
  mekoConfigured,
}: Props) {
  const [step, setStep] = useState<"details" | "review">("details");
  const [kind, setKind] = useState<TransactionKind | "">("");
  const [customDirection, setCustomDirection] = useState<
    TransactionDirection | ""
  >("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [settlementStatus, setSettlementStatus] = useState<
    "settled" | "open" | ""
  >("");
  const popupRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [memoryContext, setMemoryContext] = useState("");
  const [memoryMessage, setMemoryMessage] = useState("");
  const [memoryLoading, setMemoryLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("details");
      setError("");
      setMemoryContext("");
      setMemoryMessage("");
    }
  }, [open]);

  const direction = kind ? directionFor(kind, customDirection) : "";
  const amountPaise = Math.round(Number(amount) * 100);

  const input: CreateTransactionInput | null =
    kind &&
    direction &&
    paymentMethod &&
    settlementStatus &&
    description.trim() &&
    Number.isFinite(amountPaise) &&
    amountPaise > 0
      ? {
          kind,
          direction,
          amountPaise,
          description: description.trim(),
          counterparty: counterparty.trim(),
          paymentMethod,
          settlementStatus,
        }
      : null;

  const handleSave = async () => {
    if (!input) return;
    setError("");
    try {
      await onSave(input);
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save this entry.",
      );
    }
  };

  const lookupBusinessContext = async () => {
    if (!kind) return;
    setMemoryLoading(true);
    setMemoryMessage("");
    try {
      const query = [
        transactionKindLabels[kind],
        description.trim(),
        counterparty.trim(),
      ]
        .filter(Boolean)
        .join(" ");
      const response = await api.searchMemory(query);
      setMemoryContext(JSON.stringify(response.result, null, 2));
      setMemoryMessage(
        "Context retrieved from Meko. Use it to review the entry; it does not change the ledger automatically.",
      );
    } catch (caught) {
      setMemoryMessage(
        caught instanceof Error
          ? caught.message
          : "Could not retrieve business context.",
      );
    } finally {
      setMemoryLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-20 bg-black/65" />
        <Dialog.Popup
          ref={popupRef}
          initialFocus={popupRef}
          className="outline-none fixed top-1/2 left-1/2 z-21 max-h-[90dvh] w-[min(540px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-line bg-canvas p-5 text-fg sm:p-7"
        >
          <div className="flex items-center justify-between">
            <div className="text-[10px] tracking-wider text-muted">
              <span className="hidden" />
              New Transaction
            </div>
            <Dialog.Close className={iconButtonClass} aria-label="Close Dialog">
              <X size={18} />
            </Dialog.Close>
          </div>

          <Dialog.Title className="mt-3 block text-2xl tracking-tight">
            {step === "details"
              ? "Record a Transaction"
              : "Review Before Saving"}
          </Dialog.Title>
          <Dialog.Description className="mt-2 block text-xs leading-6 text-muted">
            {step === "details"
              ? "Capture the money movement. Nothing is added to the ledger until you confirm."
              : "Check the details carefully. This entry will be written to your business ledger."}
          </Dialog.Description>

          {step === "details" ? (
            <div className="mt-6 grid gap-4">
              <label className={fieldClass}>
                <span>Transaction Type</span>
                <select
                  className={inputClass}
                  value={kind}
                  onChange={(event) =>
                    setKind(
                      transactionKinds.find(
                        (value) => value === event.target.value,
                      ) ?? "",
                    )
                  }
                >
                  <option value="" disabled>
                    Select Transaction Type
                  </option>
                  {transactionKinds.map((value) => (
                    <option value={value} key={value}>
                      {transactionKindLabels[value]}
                    </option>
                  ))}
                </select>
              </label>

              {kind === "other" && (
                <label className={fieldClass}>
                  <span>Money Movement</span>
                  <select
                    className={inputClass}
                    value={customDirection}
                    onChange={(event) =>
                      setCustomDirection(
                        transactionDirections.find(
                          (value) => value === event.target.value,
                        ) ?? "",
                      )
                    }
                  >
                    <option value="" disabled>
                      Select Movement
                    </option>
                    <option value="inflow">Money in</option>
                    <option value="outflow">Money out</option>
                    <option value="transfer">Transfer between accounts</option>
                  </select>
                </label>
              )}

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <label className={fieldClass}>
                  <span>Amount</span>
                  <div className="flex items-center rounded-md border border-line focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-fg">
                    <span className="pl-3 text-muted">₹</span>
                    <input
                      className="min-h-10 w-full min-w-0 bg-transparent px-3 py-2 text-base outline-none"
                      inputMode="decimal"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </div>
                </label>
                <label className={fieldClass}>
                  <span>Status</span>
                  <select
                    className={inputClass}
                    value={settlementStatus}
                    onChange={(event) =>
                      setSettlementStatus(
                        event.target.value === "settled" ||
                          event.target.value === "open"
                          ? event.target.value
                          : "",
                      )
                    }
                  >
                    <option value="" disabled>
                      Select Status
                    </option>
                    <option value="settled">Settled</option>
                    <option value="open">Still due</option>
                  </select>
                </label>
              </div>

              <label className={fieldClass}>
                <span>What Happened?</span>
                <input
                  className={inputClass}
                  maxLength={500}
                  placeholder="e.g. 4 cartons of cooking oil"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <label className={fieldClass}>
                  <span>Customer, Supplier, or Account</span>
                  <input
                    className={inputClass}
                    maxLength={160}
                    placeholder="Optional"
                    value={counterparty}
                    onChange={(event) => setCounterparty(event.target.value)}
                  />
                </label>
                <label className={fieldClass}>
                  <span>Payment Method</span>
                  <select
                    className={inputClass}
                    value={paymentMethod}
                    onChange={(event) =>
                      setPaymentMethod(
                        paymentMethods.find(
                          (value) => value === event.target.value,
                        ) ?? "",
                      )
                    }
                  >
                    <option value="" disabled>
                      Select Method
                    </option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>

              <div className="mt-2 flex justify-between gap-3 border-t border-line pt-5">
                <button
                  className={buttonClass}
                  type="button"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </button>
                <button
                  className={primaryClass}
                  type="button"
                  disabled={!input}
                  onClick={() => {
                    setError("");
                    setStep("review");
                  }}
                >
                  Review Entry <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <div className="text-[32px] tracking-tight tabular-nums">
                {formatRupees(amountPaise)}
              </div>
              <div className="mt-2 text-sm">{description}</div>
              <div className="my-6 grid grid-cols-2 gap-5 [&>div]:grid [&>div]:gap-2 [&_span]:text-[11px] [&_span]:text-muted [&_strong]:text-xs">
                <div>
                  <span>Type</span>
                  <strong>{kind ? transactionKindLabels[kind] : ""}</strong>
                </div>
                <div>
                  <span>Direction</span>
                  <strong>
                    {direction === "inflow"
                      ? "Money in"
                      : direction === "outflow"
                        ? "Money out"
                        : "Transfer"}
                  </strong>
                </div>
                <div>
                  <span>Counterparty</span>
                  <strong>{counterparty || "Not specified"}</strong>
                </div>
                <div>
                  <span>Payment</span>
                  <strong>
                    {settlementStatus === "settled"
                      ? `Settled · ${paymentMethod.toUpperCase()}`
                      : "Still due"}
                  </strong>
                </div>
              </div>
              <section
                className="rounded-lg border border-line bg-soft p-4 text-xs [&_p]:my-3 [&_p]:text-[11px] [&_p]:leading-relaxed [&_p]:text-muted"
                aria-label="Business Memory Review"
              >
                <div>
                  <strong>Business Context</strong>
                  <p>
                    {mekoConfigured
                      ? "Check prior shop conventions before confirming. Only the transaction type, description and counterparty are searched."
                      : "Connect Meko to recall prior shop conventions while reviewing entries."}
                  </p>
                </div>
                <button
                  type="button"
                  className={buttonClass}
                  disabled={!mekoConfigured || memoryLoading}
                  onClick={() => void lookupBusinessContext()}
                >
                  {memoryLoading ? (
                    <LoaderCircle
                      className="motion-safe:animate-spin"
                      size={15}
                    />
                  ) : (
                    <Search size={15} />
                  )}
                  {memoryLoading ? "Searching…" : "Search Memory"}
                </button>
                {memoryMessage && (
                  <p className="text-xs text-muted">{memoryMessage}</p>
                )}
                {memoryContext && (
                  <pre className="max-h-36 overflow-auto rounded-md border border-line bg-canvas p-3 text-xs leading-relaxed whitespace-pre-wrap break-words">
                    {memoryContext}
                  </pre>
                )}
              </section>
              {error && (
                <p className="my-4 border-l-2 border-status-red pl-3 text-xs">
                  {error}
                </p>
              )}
              <div className="mt-2 flex justify-between gap-3 border-t border-line pt-5">
                <button
                  className={buttonClass}
                  type="button"
                  disabled={saving}
                  onClick={() => setStep("details")}
                >
                  <ArrowLeft size={16} /> Edit Details
                </button>
                <button
                  className={primaryClass}
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? (
                    "Saving…"
                  ) : (
                    <>
                      <Check size={16} /> Confirm & Save
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
