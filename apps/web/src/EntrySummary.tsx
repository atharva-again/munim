import { ChevronDown } from "lucide-react";
import { transactionKindLabels, type TransactionDraft } from "@munim/contracts";
import { formatDate, formatRupees } from "./api";
import { useI18n } from "./i18n";
import { StatusDot } from "./ui";
export function EntrySummary({ draft }: { draft: TransactionDraft }) {
  const { t } = useI18n();
  const paid =
    draft.settlementStatus === "settled"
      ? (draft.amountPaise ?? 0)
      : (draft.settledAmountPaise ?? 0);
  const due = (draft.amountPaise ?? 0) - paid;
  const status =
    draft.settlementStatus === "settled"
      ? t("Fully Paid")
      : draft.settlementStatus === "partial"
        ? t("{amount} paid · {due} due", {
            amount: formatRupees(paid),
            due: formatRupees(due),
          })
        : t("Still Due");
  return (
    <>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-2xl tracking-tight tabular-nums">
            {draft.amountPaise === undefined
              ? "—"
              : formatRupees(draft.amountPaise)}
          </p>
          {draft.counterparty && (
            <p className="mt-1 text-sm">{draft.counterparty}</p>
          )}
        </div>
        <p className="flex items-center gap-2 pt-1 text-xs text-muted">
          <StatusDot
            tone={draft.settlementStatus === "settled" ? "success" : "warning"}
          />
          {status}
        </p>
      </div>
      <p className="mt-2 break-words text-xs leading-6 text-muted">
        {draft.description}
      </p>
      <details className="group mt-3">
        <summary className="flex w-fit list-none items-center gap-2 rounded-md py-1 text-[11px] text-muted hover:text-fg">
          {t("Details")}
          <ChevronDown
            size={12}
            className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-[11px] text-muted">
          <div>
            <dt>{t("Type")}</dt>
            <dd className="mt-1 text-fg">
              {draft.kind ? t(transactionKindLabels[draft.kind]) : "—"}
            </dd>
          </div>
          <div>
            <dt>{t("Date")}</dt>
            <dd className="mt-1 text-fg">
              {draft.occurredAt ? formatDate(draft.occurredAt) : t("Today")}
            </dd>
          </div>
          {draft.paymentMethod && (
            <div>
              <dt>{t("Payment Method")}</dt>
              <dd className="mt-1 text-fg">
                {t(
                  draft.paymentMethod === "upi"
                    ? "UPI"
                    : draft.paymentMethod.charAt(0).toUpperCase() +
                        draft.paymentMethod.slice(1),
                )}
              </dd>
            </div>
          )}
        </dl>
      </details>
    </>
  );
}
