import { useI18n } from "./i18n";
import {
  paymentMethods,
  settlementStatuses,
  transactionDirections,
  transactionKinds,
  transactionKindLabels,
  directionByKind,
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
  const { t } = useI18n();

  const set = (patch: TransactionDraft) => onChange({ ...draft, ...patch });
  return (
    <fieldset disabled={disabled} className="grid gap-4 disabled:opacity-100">
      <label className={fieldClass}>
        {t("Transaction Type")}
        <select
          className={inputClass}
          value={draft.kind ?? ""}
          onChange={(e) => {
            const kind = transactionKinds.find((v) => v === e.target.value);
            const direction = kind ? directionByKind[kind] : undefined;
            set({ kind, direction });
          }}
        >
          <option value="">{t("Select Transaction Type")}</option>
          {transactionKinds.map((v) => (
            <option key={v} value={v}>
              {t(transactionKindLabels[v])}
            </option>
          ))}
        </select>
      </label>
      {draft.kind === "other" && (
        <label className={fieldClass}>
          {t("Money Movement")}
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
            <option value="">{t("Select Movement")}</option>
            <option value="inflow">{t("Money In")}</option>
            <option value="outflow">{t("Money Out")}</option>
            <option value="transfer">{t("Transfer")}</option>
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className={fieldClass}>
          {t("Amount (₹)")}
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
          {t("Payment Status")}
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
            <option value="">{t("Select Status")}</option>
            <option value="settled">{t("Fully Paid")}</option>
            <option value="open">{t("Still Due")}</option>
            <option value="partial">{t("Partly Paid")}</option>
          </select>
        </label>
      </div>
      {draft.settlementStatus === "partial" && (
        <label className={fieldClass}>
          {t("Amount Paid (₹)")}
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
        {t("What Happened?")}
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
            ? t("Customer or Supplier (Required)")
            : t("Customer or Supplier")}
          <input
            className={inputClass}
            maxLength={160}
            value={draft.counterparty ?? ""}
            onChange={(e) => set({ counterparty: e.target.value })}
            placeholder={t("Name")}
          />
        </label>
        <label className={fieldClass}>
          {t("Payment Method")}
          <select
            className={inputClass}
            value={draft.paymentMethod ?? ""}
            onChange={(e) =>
              set({
                paymentMethod: paymentMethods.find((v) => v === e.target.value),
              })
            }
          >
            <option value="">{t("Not Specified")}</option>
            {paymentMethods.map((v) => (
              <option key={v} value={v}>
                {t(
                  v === "upi" ? "UPI" : v.charAt(0).toUpperCase() + v.slice(1),
                )}
              </option>
            ))}
          </select>
        </label>
      </div>
      {draft.occurredAt && (
        <label className={fieldClass}>
          {t("Date and Time")}
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
