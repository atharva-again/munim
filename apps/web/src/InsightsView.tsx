import { PeopleDues } from "./PeopleDues";
import { localizedError } from "./translations";
import { useI18n } from "./i18n";
import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
} from "lucide-react";
import {
  transactionKindLabels,
  recordTextFor,
  type InsightQuery,
  type Insights,
} from "@munim/contracts";
import { api, formatDate, formatRupees } from "./api";
import {
  buttonClass,
  EmptyState,
  iconButtonClass,
  LoadingRows,
  panelClass,
  primaryClass,
  StatusDot,
} from "./ui";

const periods = [
  { value: "7", label: "7 Days" },
  { value: "30", label: "30 Days" },
  { value: "90", label: "90 Days" },
] satisfies { value: InsightQuery["period"]; label: string }[];
const ageLabels = {
  under7: "Under 7 Days",
  "7to29": "7–29 Days",
  "30plus": "30+ Days",
};
const asOfFormatters = {
  en: new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }),
  hi: new Intl.DateTimeFormat("hi-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }),
};
function changeText(
  t: ReturnType<typeof useI18n>["t"],
  current: number,
  previous: number,
  hasPrevious: boolean,
) {
  if (!hasPrevious) return t("No payments in the previous period.");
  const difference = current - previous;
  return difference === 0
    ? t("Unchanged from the previous period.")
    : t(
        difference > 0
          ? "{amount} more than the previous period."
          : "{amount} less than the previous period.",
        { amount: formatRupees(Math.abs(difference)) },
      );
}

export default function InsightsView({
  version,
  onRecord,
}: {
  version: number;
  onRecord: () => void;
}) {
  const { t, language } = useI18n();

  const [period, setPeriod] = useState<InsightQuery["period"]>("30");
  const [direction, setDirection] =
    useState<InsightQuery["direction"]>("inflow");
  const [age, setAge] = useState<InsightQuery["age"]>("all");
  const [page, setPage] = useState(0),
    [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; data: Insights } | null>(
    null,
  );
  const [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState(""),
    [manualNote, setManualNote] = useState("");
  const key = `${period}:${direction}:${age}:${page}`;
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    api
      .insights({ period, direction, age, page }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setResult({ key: `${period}:${direction}:${age}:${page}`, data });
      })
      .catch((caught) => {
        if (!controller.signal.aborted)
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load insights.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [period, direction, age, page, version, retry]);
  const data = result?.key === key ? result.data : null;
  const selectDirection = (next: InsightQuery["direction"]) => {
    setDirection(next);
    setPage(0);
    setExpanded(null);
    setCopyMessage("");
    setManualNote("");
  };
  const selectAge = (next: InsightQuery["age"]) => {
    setAge(next);
    setPage(0);
    setExpanded(null);
  };
  const copyEntry = async (entry: Insights["entries"]["items"][number]) => {
    const note =
      direction === "inflow"
        ? t(
            "Hello {name}, {amount} remains due for {description} ({date}). Please let me know when you can pay.",
            {
              name: entry.counterparty || "",
              amount: formatRupees(entry.remainingPaise),
              description: entry.description,
              date: formatDate(entry.occurredAt),
            },
          )
        : t("{name}: {amount} still to pay for {description} ({date}).", {
            name: entry.counterparty || t("Supplier"),
            amount: formatRupees(entry.remainingPaise),
            description: entry.description,
            date: formatDate(entry.occurredAt),
          });
    setCopyMessage("");
    setManualNote("");
    try {
      await navigator.clipboard.writeText(note);
      setCopyMessage(
        direction === "inflow"
          ? "Reminder copied. You can review and share it yourself."
          : "Payment details copied.",
      );
    } catch {
      setManualNote(note);
      setCopyMessage("Select and copy the text below.");
    }
  };
  return (
    <section className="flex min-h-0 flex-col gap-5 pb-3">
      <h1 className="sr-only">{t("Insights")}</h1>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {t(
            "Know what came in, what went out, and what still needs attention.",
          )}
        </p>
        <div
          role="group"
          aria-label={t("Money Movement Period")}
          className="flex gap-1 rounded-lg border border-line p-1"
        >
          {periods.map((item) => (
            <button
              type="button"
              key={item.value}
              aria-pressed={period === item.value}
              onClick={() => setPeriod(item.value)}
              className={`rounded-md px-3 py-2 text-xs ${period === item.value ? "bg-soft text-fg" : "text-muted hover:text-fg"}`}
            >
              {t(item.label)}
            </button>
          ))}
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-line p-4 text-xs"
        >
          <p className="flex items-center gap-2">
            <StatusDot tone="error" />
            {localizedError(error)}
            {data ? t(" Showing the last successful update.") : ""}
          </p>
          <button
            type="button"
            className={buttonClass}
            onClick={() => setRetry((v) => v + 1)}
          >
            {t("Try Again")}
          </button>
        </div>
      )}
      {!data ? (
        busy ? (
          <LoadingRows />
        ) : null
      ) : data.ledgerEntryCount === 0 ? (
        <div className={panelClass}>
          <EmptyState
            icon={<ChartNoAxesCombined size={26} strokeWidth={1.5} />}
            title={t("Record Your First Entry")}
            detail={t(
              "Money movement, outstanding balances, and payment priorities will appear here as you use your ledger.",
            )}
            action={
              <button type="button" className={primaryClass} onClick={onRecord}>
                <Plus size={15} />
                {t("Record Transaction")}
              </button>
            }
          />
        </div>
      ) : (
        <>
          <section className={panelClass} aria-label={t("Money Movement")}>
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
              <h2 className="text-sm">{t("Money Movement")}</h2>
              <span className="text-[11px] text-muted">
                {formatDate(data.period.from)} – {formatDate(data.period.to)}
              </span>
            </header>
            <div className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                {
                  label: t("Money Received"),
                  value: data.activity.current.receivedPaise,
                  previous: data.activity.previous.receivedPaise,
                  tone: "success",
                  Icon: ArrowDownLeft,
                },
                {
                  label: t("Money Paid"),
                  value: data.activity.current.paidPaise,
                  previous: data.activity.previous.paidPaise,
                  tone: "error",
                  Icon: ArrowUpRight,
                },
                {
                  label: t("Net Movement"),
                  value:
                    data.activity.current.receivedPaise -
                    data.activity.current.paidPaise,
                  previous:
                    data.activity.previous.receivedPaise -
                    data.activity.previous.paidPaise,
                  tone: "info",
                  Icon: ChartNoAxesCombined,
                },
              ].map((metric) => (
                <article key={t(metric.label)} className="min-w-0 px-5 py-5">
                  <p className="flex items-center gap-2 text-xs text-muted">
                    <metric.Icon
                      size={14}
                      className={
                        metric.tone === "success"
                          ? "text-status-green"
                          : metric.tone === "error"
                            ? "text-status-red"
                            : "text-muted"
                      }
                    />
                    {t(metric.label)}
                  </p>
                  <p className="mt-3 break-words text-[26px] tracking-tight tabular-nums">
                    {formatRupees(metric.value)}
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-muted">
                    {changeText(
                      t,
                      metric.value,
                      metric.previous,
                      data.activity.previous.paymentCount > 0,
                    )}
                  </p>
                </article>
              ))}
            </div>
            <p className="border-t border-line px-5 py-3 text-[11px] leading-5 text-muted">
              {t(
                "{count} recorded payments, including part payments. Transfers are excluded. Compared with the previous {days} days; today is still in progress.",
                {
                  count: data.activity.current.paymentCount,
                  days: data.period.days,
                },
              )}
            </p>
          </section>
          <PeopleDues version={version} />
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
            <section
              className={`${panelClass} min-w-0`}
              aria-label={t("Outstanding Entries")}
            >
              <header className="border-b border-line p-5">
                <h2 className="text-sm">{t("Outstanding Now")}</h2>
                <p className="mt-2 text-[11px] leading-5 text-muted">
                  {t(
                    "Across your full ledger. Highest remaining amounts first.",
                  )}
                </p>
                <div
                  className="mt-4 grid grid-cols-2 gap-3"
                  role="group"
                  aria-label={t("Outstanding Money Direction")}
                >
                  {(
                    [
                      {
                        value: "inflow",
                        label: t("To Collect"),
                        amount: data.outstanding.receivePaise,
                        count: data.outstanding.receiveCount,
                      },
                      {
                        value: "outflow",
                        label: t("To Pay"),
                        amount: data.outstanding.payPaise,
                        count: data.outstanding.payCount,
                      },
                    ] satisfies {
                      value: InsightQuery["direction"];
                      label: string;
                      amount: number;
                      count: number;
                    }[]
                  ).map((item) => (
                    <button
                      type="button"
                      key={item.value}
                      aria-pressed={direction === item.value}
                      onClick={() => selectDirection(item.value)}
                      className={`min-w-0 rounded-lg border px-3 py-3 text-left ${direction === item.value ? "border-fg bg-soft" : "border-line hover:bg-soft"}`}
                    >
                      <span className="flex items-center gap-2 text-xs text-muted">
                        <StatusDot
                          tone={item.value === "inflow" ? "warning" : "info"}
                        />
                        {t(item.label)}
                      </span>
                      <span className="mt-2 block break-words text-xl tracking-tight tabular-nums">
                        {formatRupees(item.amount)}
                      </span>
                      <span className="mt-1 block text-[10px] text-muted">
                        {item.count} {item.count === 1 ? "entry" : "entries"}
                      </span>
                    </button>
                  ))}
                </div>
                {age !== "all" && (
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span>{t(ageLabels[age])}</span>
                    <button
                      type="button"
                      className="text-muted hover:text-fg"
                      onClick={() => selectAge("all")}
                    >
                      {t("Show All Ages")}
                    </button>
                  </div>
                )}
              </header>
              {data.entries.items.length === 0 ? (
                <EmptyState
                  icon={
                    direction === "inflow" ? (
                      <ArrowDownLeft size={22} />
                    ) : (
                      <ArrowUpRight size={22} />
                    )
                  }
                  title={
                    age === "all"
                      ? direction === "inflow"
                        ? t("Nothing to Collect")
                        : t("Nothing to Pay")
                      : t("No Entries in This Age Range")
                  }
                  detail={
                    age === "all"
                      ? t(
                          "No outstanding entries are recorded in this direction.",
                        )
                      : t("Choose another age range to see more entries.")
                  }
                />
              ) : (
                <ul className="divide-y divide-line">
                  {data.entries.items.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        aria-expanded={expanded === entry.id}
                        aria-controls={`insight-entry-${entry.id}`}
                        onClick={() => {
                          setExpanded(expanded === entry.id ? null : entry.id);
                          setCopyMessage("");
                          setManualNote("");
                        }}
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-soft"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm">
                            {recordTextFor(entry,language).counterparty || t("Name Not Recorded")}
                          </span>
                          <span className="mt-1 block truncate text-xs text-muted">
                            {recordTextFor(entry,language).description}
                          </span>
                          <span className="mt-2 flex items-center gap-2 text-[10px] text-muted">
                            <StatusDot
                              tone={entry.ageDays >= 30 ? "warning" : "info"}
                            />
                            {entry.ageDays === 0
                              ? t("Recorded today")
                              : t("Recorded {days} days ago", {
                                  days: entry.ageDays,
                                })}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="text-sm tabular-nums">
                            {formatRupees(entry.remainingPaise)}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`text-muted transition-transform motion-reduce:transition-none ${expanded === entry.id ? "rotate-180" : ""}`}
                          />
                        </span>
                      </button>
                      {expanded === entry.id && (
                        <div
                          id={`insight-entry-${entry.id}`}
                          className="bg-soft px-5 pb-5 pt-2"
                        >
                          <p className="break-words text-xs leading-6">
                            {recordTextFor(entry,language).description}
                          </p>
                          <dl className="mt-4 grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <dt className="text-muted">
                                {t("Original Amount")}
                              </dt>
                              <dd className="mt-1 tabular-nums">
                                {formatRupees(entry.amountPaise)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted">
                                {t("Already Paid")}
                              </dt>
                              <dd className="mt-1 tabular-nums">
                                {formatRupees(entry.paidPaise)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted">{t("Recorded On")}</dt>
                              <dd className="mt-1">
                                {formatDate(entry.occurredAt)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted">{t("Type")}</dt>
                              <dd className="mt-1">
                                {t(transactionKindLabels[entry.kind])}
                              </dd>
                            </div>
                          </dl>
                          <button
                            type="button"
                            className={`${buttonClass} mt-4`}
                            onClick={() => void copyEntry(entry)}
                          >
                            <Copy size={14} />
                            {direction === "inflow"
                              ? t("Copy Reminder")
                              : t("Copy Details")}
                          </button>
                          {copyMessage && (
                            <p
                              className="mt-3 text-[11px] text-muted"
                              role="status"
                            >
                              {t(copyMessage)}
                            </p>
                          )}
                          {manualNote && (
                            <textarea
                              aria-label={t("Payment Note to Copy")}
                              readOnly
                              className="mt-3 min-h-24 w-full rounded-md border border-line bg-canvas p-3 text-xs leading-5"
                              value={manualNote}
                            />
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-[11px] text-muted">
                <span>
                  {data.entries.total
                    ? t("{from}–{to} of {total}", {
                        from: data.entries.page * 20 + 1,
                        to: Math.min(
                          (data.entries.page + 1) * 20,
                          data.entries.total,
                        ),
                        total: data.entries.total,
                      })
                    : t("0 entries")}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={iconButtonClass}
                    aria-label={t("Previous Entries")}
                    disabled={busy || data.entries.page === 0}
                    onClick={() => {
                      setPage(data.entries.page - 1);
                      setExpanded(null);
                    }}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    type="button"
                    className={iconButtonClass}
                    aria-label={t("Next Entries")}
                    disabled={
                      busy || (data.entries.page + 1) * 20 >= data.entries.total
                    }
                    onClick={() => {
                      setPage(data.entries.page + 1);
                      setExpanded(null);
                    }}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </footer>
            </section>
            <div className="grid gap-5">
              <section
                className={panelClass}
                aria-label={t("Outstanding by Age")}
              >
                <header className="px-5 pt-5">
                  <h2 className="text-sm">{t("Outstanding by Age")}</h2>
                  <p className="mt-2 text-[11px] leading-5 text-muted">
                    {t(
                      "Age starts at the entry date. Due dates are not recorded.",
                    )}
                  </p>
                </header>
                <div className="overflow-x-auto p-5">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[10px] text-muted">
                      <tr>
                        <th className="pb-3 font-normal">{t("Age")}</th>
                        <th className="pb-3 text-right font-normal">
                          {t("To Collect")}
                        </th>
                        <th className="pb-3 text-right font-normal">
                          {t("To Pay")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.outstanding.aging.map((bucket) => (
                        <tr
                          key={bucket.bucket}
                          className="border-t border-line"
                        >
                          <td className="py-2">
                            <button
                              type="button"
                              aria-pressed={age === bucket.bucket}
                              className={`rounded-md px-2 py-2 text-[11px] ${age === bucket.bucket ? "bg-soft text-fg" : "text-muted hover:text-fg"}`}
                              onClick={() =>
                                selectAge(
                                  age === bucket.bucket ? "all" : bucket.bucket,
                                )
                              }
                            >
                              {t(ageLabels[bucket.bucket])}
                            </button>
                          </td>
                          <td className="py-2 text-right text-[11px] tabular-nums">
                            {formatRupees(bucket.receivePaise)}
                          </td>
                          <td className="py-2 text-right text-[11px] tabular-nums">
                            {formatRupees(bucket.payPaise)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section
                className={panelClass}
                aria-label={t("Where Money Went")}
              >
                <header className="border-b border-line px-5 py-4">
                  <h2 className="text-sm">{t("Where Money Went")}</h2>
                  <p className="mt-2 text-[11px] text-muted">
                    {t("Actual payments in the selected period.")}
                  </p>
                </header>
                {data.outflows.length === 0 ? (
                  <p className="p-5 text-xs leading-6 text-muted">
                    {t("No outgoing payments recorded in this period.")}
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {data.outflows.map((item) => (
                      <li
                        key={item.kind}
                        className="flex items-start justify-between gap-3 px-5 py-4"
                      >
                        <div>
                          <p className="text-xs">
                            {t(transactionKindLabels[item.kind])}
                          </p>
                          <p className="mt-1 text-[10px] text-muted">
                            {t("{count} payments · {share}% of money paid", {
                              count: item.paymentCount,
                              share: Math.round(
                                (item.amountPaise /
                                  data.activity.current.paidPaise) *
                                  100,
                              ),
                            })}
                          </p>
                        </div>
                        <span className="text-xs tabular-nums">
                          {formatRupees(item.amountPaise)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
          <footer className="text-[10px] leading-5 text-muted">
            {t("Full-ledger calculations · Updated")}{" "}
            {asOfFormatters[language].format(new Date(data.asOf))}{" "}
            {t(
              "IST. Money movement reflects recorded payments, not profit or your account balance.",
            )}
          </footer>
        </>
      )}
    </section>
  );
}
