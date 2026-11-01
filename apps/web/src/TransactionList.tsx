import { useI18n } from "./i18n";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ClipboardList,
} from "lucide-react";
import { recordTextFor, transactionKindLabels, type Transaction } from "@munim/contracts";
import { formatDate, formatRupees } from "./api";
import {
  EmptyState,
  LoadingRows,
  StatusDot,
  type StatusTone,
} from "./ui";

const statusPresentation = {
  settled: { label: "Settled", tone: "success" },
  partial: { label: "Partially Settled", tone: "warning" },
  open: { label: "Open", tone: "info" },
} satisfies Record<
  Transaction["settlementStatus"],
  { label: string; tone: StatusTone }
>;

export type TransactionListProps = {
  transactions: Transaction[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDetail?: string;
};
export function TransactionList({
  transactions,
  loading,
  emptyTitle = "No Transactions Yet",
  emptyDetail = "Record a sale, expense, payment, or transfer to get started.",
}: TransactionListProps) {
  const { t, language } = useI18n();

  if (loading) return <LoadingRows />;
  if (!transactions.length)
    return (
      <EmptyState
        icon={<ClipboardList size={24} />}
        title={emptyTitle}
        detail={emptyDetail}
      />
    );
  return (
    <div className="min-h-0 overflow-auto overscroll-contain">
      <table className="w-full border-collapse text-left text-xs">
        <caption className="sr-only">
          {t("Business transactions and settlement status")}
        </caption>
        <thead className="sticky top-0 z-1 bg-canvas text-[11px] text-muted">
          <tr className="border-y border-line">
            <th scope="col" className="bg-soft px-5 py-3 font-normal">
              {t("Transaction")}
            </th>
            <th
              scope="col"
              className="hidden bg-soft px-4 py-3 font-normal sm:table-cell"
            >
              {t("Type")}
            </th>
            <th
              scope="col"
              className="hidden bg-soft px-4 py-3 font-normal md:table-cell"
            >
              {t("Status")}
            </th>
            <th
              scope="col"
              className="bg-soft px-5 py-3 text-right font-normal"
            >
              {t("Amount")}
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const display = recordTextFor(transaction, language);
            const incoming = transaction.direction === "inflow";
            const transfer = transaction.direction === "transfer";
            const Icon = transfer
              ? ArrowLeftRight
              : incoming
                ? ArrowDownLeft
                : ArrowUpRight;
            const status = statusPresentation[transaction.settlementStatus];
            return (
              <tr
                key={transaction.id}
                className="border-b border-line last:border-0 hover:bg-soft"
              >
                <td className="max-w-0 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="hidden size-8 shrink-0 place-items-center rounded-lg border border-line text-muted min-[400px]:grid">
                      <Icon
                        size={15}
                        aria-hidden="true"
                        className={
                          transfer
                            ? "text-status-blue"
                            : incoming
                              ? "text-status-green"
                              : "text-status-red"
                        }
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px]">
                        {display.description}
                      </p>
                      <p className="mt-1.5 truncate text-[11px] text-muted">
                        {display.counterparty ||
                          t(transactionKindLabels[transaction.kind])}{" "}
                        · {formatDate(transaction.occurredAt)}
                      </p>
                      <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-muted md:hidden">
                        <StatusDot tone={status.tone} />
                        {t(status.label)}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="hidden whitespace-nowrap px-4 py-4 text-muted sm:table-cell">
                  {t(transactionKindLabels[transaction.kind])}
                </td>
                <td className="hidden whitespace-nowrap px-4 py-4 md:table-cell">
                  <span className="inline-flex items-center gap-1.5 rounded border border-line px-2 py-1 text-[10px]">
                    <StatusDot tone={status.tone} />
                    {t(status.label)}
                  </span>
                </td>
                <td className="px-5 py-4 text-right text-[13px] whitespace-nowrap tabular-nums">
                  {incoming ? "+" : transfer ? "" : "−"}
                  {formatRupees(transaction.amountPaise)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
