import { useDeferredValue, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { TransactionList, type TransactionListProps } from "./TransactionList";
import { formatRupees } from "./api";
import { buttonClass, iconButtonClass, inputClass, panelClass } from "./ui";

type Filter = "all" | "settled" | "outstanding";
const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All Entries" },
  { value: "settled", label: "Settled" },
  { value: "outstanding", label: "Outstanding" },
];
const pageSize = 20;
export default function TransactionsView(props: TransactionListProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const matches = props.transactions.filter(
    (t) =>
      (filter === "all" ||
        (filter === "settled"
          ? t.settlementStatus === "settled"
          : t.settlementStatus !== "settled")) &&
      `${t.description} ${t.counterparty} ${t.kind} ${t.paymentMethod}`
        .toLowerCase()
        .includes(deferredQuery),
  );
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = matches.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const incoming = matches.reduce(
    (sum, t) => sum + (t.direction === "inflow" ? t.amountPaise : 0),
    0,
  );
  const outgoing = matches.reduce(
    (sum, t) => sum + (t.direction === "outflow" ? t.amountPaise : 0),
    0,
  );
  return (
    <section className="flex min-h-[560px] flex-1 flex-col gap-6 md:min-h-0">
      <header>
        <h1 className="sr-only">Transactions</h1>
        <p className="text-xs leading-relaxed text-muted">
          Review your ledger and follow up on open payments.
        </p>
      </header>
      <div className="grid grid-cols-3 gap-3">
        <div className={`${panelClass} px-3 py-4 sm:px-5`}>
          <p className="min-h-8 text-[10px] text-muted sm:min-h-0 sm:text-xs">
            Matching Entries
          </p>
          <p className="mt-3 text-xl tracking-tight tabular-nums sm:text-2xl">
            {props.loading ? "—" : matches.length}
          </p>
        </div>
        <div className={`${panelClass} px-3 py-4 sm:px-5`}>
          <p className="flex min-h-8 items-start gap-1.5 text-[10px] text-muted sm:min-h-0 sm:items-center sm:text-xs">
            <ArrowDownLeft size={14} className="text-status-green" />
            Incoming
          </p>
          <p className="mt-3 text-xl tracking-tight tabular-nums sm:text-2xl">
            {props.loading ? "—" : formatRupees(incoming)}
          </p>
        </div>
        <div className={`${panelClass} px-3 py-4 sm:px-5`}>
          <p className="flex min-h-8 items-start gap-1.5 text-[10px] text-muted sm:min-h-0 sm:items-center sm:text-xs">
            <ArrowUpRight size={14} className="text-status-red" />
            Outgoing
          </p>
          <p className="mt-3 text-xl tracking-tight tabular-nums sm:text-2xl">
            {props.loading ? "—" : formatRupees(outgoing)}
          </p>
        </div>
      </div>
      <div
        className={`${panelClass} flex min-h-0 flex-1 flex-col overflow-hidden`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-4">
          <div
            className="flex gap-1"
            role="group"
            aria-label="Filter by Settlement Status"
          >
            {filters.map((item) => (
              <button
                type="button"
                key={item.value}
                aria-pressed={filter === item.value}
                onClick={() => {
                  setFilter(item.value);
                  setPage(0);
                }}
                className={`rounded-md px-3 py-2 text-xs ${filter === item.value ? "bg-soft text-fg" : "text-muted hover:text-fg"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute top-3 left-3 text-muted"
            />
            <input
              aria-label="Search Transactions"
              className={`${inputClass} pr-9 pl-9 text-xs`}
              placeholder="Search transactions…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
            {query && (
              <button
                type="button"
                aria-label="Clear Search"
                className={`${iconButtonClass} absolute top-1 right-1`}
                onClick={() => {
                  setQuery("");
                  setPage(0);
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div
          className="min-h-0 flex-1 overflow-auto"
          aria-busy={deferredQuery !== query.trim().toLowerCase()}
        >
          <TransactionList
            {...props}
            transactions={visible}
            emptyTitle={
              query || filter !== "all"
                ? "No Matching Transactions"
                : props.emptyTitle
            }
            emptyDetail={
              query || filter !== "all"
                ? "Try another search or settlement status."
                : props.emptyDetail
            }
          />
        </div>
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-5 py-3 text-[11px] text-muted">
          <span aria-live="polite">
            {matches.length
              ? `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, matches.length)} of ${matches.length}`
              : "0 entries"}
            <span className="hidden sm:inline">
              {" "}
              · Latest {props.transactions.length} loaded
            </span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={buttonClass}
              aria-label="Previous Page"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              {currentPage + 1} / {pageCount}
            </span>
            <button
              type="button"
              className={buttonClass}
              aria-label="Next Page"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
}
