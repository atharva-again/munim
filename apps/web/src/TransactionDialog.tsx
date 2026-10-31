import { useEffect, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  transactionKindLabels,
  transactionKinds,
  type CreateTransactionInput,
  type TransactionDirection,
  type TransactionKind,
} from "@munim/contracts";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, Search, X } from "lucide-react";
import { api, formatRupees } from "./api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: CreateTransactionInput) => Promise<void>;
  saving: boolean;
  mekoConfigured: boolean;
};

const defaultKind: TransactionKind = "sale";

function directionFor(kind: TransactionKind, custom: TransactionDirection) {
  if (kind === "transfer") return "transfer";
  if (kind === "purchase" || kind === "expense" || kind === "supplier_payment" || kind === "refund") {
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
  const [kind, setKind] = useState<TransactionKind>(defaultKind);
  const [customDirection, setCustomDirection] =
    useState<TransactionDirection>("inflow");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "upi" | "bank" | "card" | "other"
  >("cash");
  const [settlementStatus, setSettlementStatus] = useState<"settled" | "open">(
    "settled",
  );
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

  const direction = directionFor(kind, customDirection);
  const amountPaise = Math.round(Number(amount) * 100);

  const handleSave = async () => {
    setError("");
    try {
      await onSave({
        kind,
        direction,
        amountPaise,
        description: description.trim(),
        counterparty: counterparty.trim(),
        paymentMethod,
        settlementStatus,
      });
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save this entry.",
      );
    }
  };

  const lookupBusinessContext = async () => {
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
      setMemoryMessage("Context retrieved from Meko. Use it to review the entry; it does not change the ledger automatically.");
    } catch (caught) {
      setMemoryMessage(
        caught instanceof Error ? caught.message : "Could not retrieve business context.",
      );
    } finally {
      setMemoryLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Popup className="dialog-popup">
          <div className="dialog-topline">
            <div className="dialog-kicker">
              <span className="eyebrow-dot" />
              NEW FINANCIAL EVENT
            </div>
            <Dialog.Close className="icon-button" aria-label="Close dialog">
              <X size={18} />
            </Dialog.Close>
          </div>

          <Dialog.Title className="dialog-title">
            {step === "details" ? "Record a transaction" : "Review before saving"}
          </Dialog.Title>
          <Dialog.Description className="dialog-description">
            {step === "details"
              ? "Capture the money movement. Nothing is added to the ledger until you confirm."
              : "Check the details carefully. This entry will be written to your business ledger."}
          </Dialog.Description>

          {step === "details" ? (
            <div className="dialog-form">
              <label className="field">
                <span>Transaction type</span>
                <select
                  value={kind}
                  onChange={(event) => setKind(event.target.value as TransactionKind)}
                >
                  {transactionKinds.map((value) => (
                    <option value={value} key={value}>
                      {transactionKindLabels[value]}
                    </option>
                  ))}
                </select>
              </label>

              {kind === "other" && (
                <label className="field">
                  <span>Money movement</span>
                  <select
                    value={customDirection}
                    onChange={(event) =>
                      setCustomDirection(event.target.value as TransactionDirection)
                    }
                  >
                    <option value="inflow">Money in</option>
                    <option value="outflow">Money out</option>
                    <option value="transfer">Transfer between accounts</option>
                  </select>
                </label>
              )}

              <div className="field-row">
                <label className="field field-amount">
                  <span>Amount</span>
                  <div className="amount-input-wrap">
                    <span className="currency-mark">₹</span>
                    <input
                      autoFocus
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
                <label className="field">
                  <span>Status</span>
                  <select
                    value={settlementStatus}
                    onChange={(event) =>
                      setSettlementStatus(event.target.value as "settled" | "open")
                    }
                  >
                    <option value="settled">Settled</option>
                    <option value="open">Still due</option>
                  </select>
                </label>
              </div>

              <label className="field">
                <span>What happened?</span>
                <input
                  maxLength={500}
                  placeholder="e.g. 4 cartons of cooking oil"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              <div className="field-row">
                <label className="field">
                  <span>Customer, supplier or account</span>
                  <input
                    maxLength={160}
                    placeholder="Optional"
                    value={counterparty}
                    onChange={(event) => setCounterparty(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Payment method</span>
                  <select
                    value={paymentMethod}
                    onChange={(event) =>
                      setPaymentMethod(
                        event.target.value as
                          | "cash"
                          | "upi"
                          | "bank"
                          | "card"
                          | "other",
                      )
                    }
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>

              <div className="dialog-footer">
                <button
                  className="button button-quiet"
                  type="button"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  disabled={
                    !description.trim() ||
                    !Number.isFinite(amountPaise) ||
                    amountPaise < 1
                  }
                  onClick={() => {
                    setError("");
                    setStep("review");
                  }}
                >
                  Review entry <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="review-card">
              <div className="review-amount">{formatRupees(amountPaise)}</div>
              <div className="review-main">{description}</div>
              <div className="review-grid">
                <div>
                  <span>Type</span>
                  <strong>{transactionKindLabels[kind]}</strong>
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
              <section className="context-review" aria-label="Business memory review">
                <div>
                  <strong>Business context</strong>
                  <p>
                    {mekoConfigured
                      ? "Check prior shop conventions before confirming. Only the transaction type, description and counterparty are searched."
                      : "Connect Meko to recall prior shop conventions while reviewing entries."}
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-quiet context-search"
                  disabled={!mekoConfigured || memoryLoading}
                  onClick={() => void lookupBusinessContext()}
                >
                  {memoryLoading ? (
                    <LoaderCircle className="spin" size={15} />
                  ) : (
                    <Search size={15} />
                  )}
                  {memoryLoading ? "Searching…" : "Search Meko"}
                </button>
                {memoryMessage && <p className="context-message">{memoryMessage}</p>}
                {memoryContext && <pre className="memory-output context-output">{memoryContext}</pre>}
              </section>
              {error && <p className="form-error">{error}</p>}
              <div className="dialog-footer">
                <button
                  className="button button-quiet"
                  type="button"
                  disabled={saving}
                  onClick={() => setStep("details")}
                >
                  <ArrowLeft size={16} /> Edit details
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? (
                    "Saving…"
                  ) : (
                    <>
                      <Check size={16} /> Confirm & save
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

