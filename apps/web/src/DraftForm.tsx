import {
  paymentMethods,
  settlementStatuses,
  transactionDirections,
  transactionKinds,
  transactionKindLabels,
  type TransactionDraft,
} from "@munim/contracts";
import { fieldClass, inputClass } from "./ui";
export function DraftForm({
  draft,
  onChange,
  disabled,
}: {
  draft: TransactionDraft;
  onChange: (draft: TransactionDraft) => void;
  disabled: boolean;
}) {
  const set = (patch: TransactionDraft) => onChange({ ...draft, ...patch });
  return (
    <fieldset disabled={disabled} className="grid gap-4 disabled:opacity-100">
      <label className={fieldClass}>
        Transaction Type
        <select
          className={inputClass}
          value={draft.kind ?? ""}
          onChange={(e) => {
            const kind = transactionKinds.find((v) => v === e.target.value);
            const direction =
              kind === "transfer"
                ? "transfer"
                : kind &&
                    [
                      "purchase",
                      "expense",
                      "supplier_payment",
                      "refund",
                    ].includes(kind)
                  ? "outflow"
                  : kind === "other"
                    ? undefined
                    : kind
                      ? "inflow"
                      : undefined;
            set({ kind, direction });
          }}
        >
          <option value="">Select Transaction Type</option>
          {transactionKinds.map((v) => (
            <option key={v} value={v}>
              {transactionKindLabels[v]}
            </option>
          ))}
        </select>
      </label>
      {draft.kind === "other" && (
        <label className={fieldClass}>
          Money Movement
          <select
            className={inputClass}
            value={draft.direction ?? ""}
            onChange={(e) =>
              set({
                direction: transactionDirections.find(
                  (v) => v === e.target.value,
                ),
              })
            }
          >
            <option value="">Select Movement</option>
            <option value="inflow">Money In</option>
            <option value="outflow">Money Out</option>
            <option value="transfer">Transfer</option>
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className={fieldClass}>
          Amount (₹)
          <input
            className={inputClass}
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={
              draft.amountPaise === undefined ? "" : draft.amountPaise / 100
            }
            onChange={(e) =>
              set({
                amountPaise: e.target.value
                  ? Math.round(Number(e.target.value) * 100)
                  : undefined,
              })
            }
          />
        </label>
        <label className={fieldClass}>
          Payment Status
          <select
            className={inputClass}
            value={draft.settlementStatus ?? ""}
            onChange={(e) =>
              set({
                settlementStatus: settlementStatuses.find(
                  (v) => v === e.target.value,
                ),
                settledAmountPaise: undefined,
              })
            }
          >
            <option value="">Select Status</option>
            <option value="settled">Fully Paid</option>
            <option value="open">Still Due</option>
            <option value="partial">Partly Paid</option>
          </select>
        </label>
      </div>
      {draft.settlementStatus === "partial" && (
        <label className={fieldClass}>
          Amount Paid (₹)
          <input
            className={inputClass}
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={
              draft.settledAmountPaise === undefined
                ? ""
                : draft.settledAmountPaise / 100
            }
            onChange={(e) =>
              set({
                settledAmountPaise: e.target.value
                  ? Math.round(Number(e.target.value) * 100)
                  : undefined,
              })
            }
          />
        </label>
      )}
      <label className={fieldClass}>
        What Happened?
        <input
          className={inputClass}
          maxLength={500}
          value={draft.description ?? ""}
          onChange={(e) => set({ description: e.target.value })}
        />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={fieldClass}>
          {draft.settlementStatus && draft.settlementStatus !== "settled"
            ? "Customer or Supplier (Required)"
            : "Customer or Supplier"}
          <input
            className={inputClass}
            maxLength={160}
            value={draft.counterparty ?? ""}
            onChange={(e) => set({ counterparty: e.target.value })}
            placeholder="Name"
          />
        </label>
        <label className={fieldClass}>
          Payment Method
          <select
            className={inputClass}
            value={draft.paymentMethod ?? ""}
            onChange={(e) =>
              set({
                paymentMethod: paymentMethods.find((v) => v === e.target.value),
              })
            }
          >
            <option value="">Not Specified</option>
            {paymentMethods.map((v) => (
              <option key={v} value={v}>
                {v === "upi" ? "UPI" : v.charAt(0).toUpperCase() + v.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {draft.occurredAt && (
        <label className={fieldClass}>
          Date and Time
          <input
            className={inputClass}
            type="datetime-local"
            value={new Date(
              new Date(draft.occurredAt).getTime() -
                new Date(draft.occurredAt).getTimezoneOffset() * 60000,
            )
              .toISOString()
              .slice(0, 16)}
            onChange={(e) =>
              set({
                occurredAt: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : undefined,
              })
            }
          />
        </label>
      )}
    </fieldset>
  );
}
