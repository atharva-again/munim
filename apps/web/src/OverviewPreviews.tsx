import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpenText, ChartNoAxesCombined } from "lucide-react";
import type { InsightQuery } from "@munim/contracts";
import { api, formatRupees } from "./api";
import { useI18n } from "./i18n";
import { panelClass } from "./ui";

const previewQuery = {
  period: "30",
  direction: "inflow",
  age: "all",
  page: 0,
} satisfies InsightQuery;

type InsightsState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "error" }
  | { kind: "ready"; data: Awaited<ReturnType<typeof api.insights>> };
type MemoryState =
  | { kind: "hidden" }
  | { kind: "loading" }
  | { kind: "error" }
  | {
      kind: "ready";
      fact: Awaited<ReturnType<typeof api.recentMemories>>["result"]["facts"][number];
    };

export function OverviewPreviews({
  memoryConfigured,
  ledgerChecked,
  ledgerConnected,
}: {
  memoryConfigured: boolean;
  ledgerChecked: boolean;
  ledgerConnected: boolean;
}) {
  const { t } = useI18n();
  const [insights, setInsights] = useState<InsightsState>({ kind: "loading" });
  const [memory, setMemory] = useState<MemoryState>({ kind: "hidden" });

  useEffect(() => {
    const controller = new AbortController();
    if (!ledgerChecked) {
      setInsights({ kind: "loading" });
    } else if (!ledgerConnected) {
      setInsights({ kind: "unavailable" });
    } else {
      setInsights({ kind: "loading" });
      void api
        .insights(previewQuery, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) setInsights({ kind: "ready", data });
        })
        .catch(() => {
          if (!controller.signal.aborted) setInsights({ kind: "error" });
        });
    }

    if (!memoryConfigured) {
      setMemory({ kind: "hidden" });
    } else {
      setMemory({ kind: "loading" });
      void api
        .recentMemories(controller.signal)
        .then(({ result }) => {
          if (controller.signal.aborted) return;
          const fact = result.status === "ready" ? result.facts[0] : undefined;
          setMemory(fact ? { kind: "ready", fact } : { kind: "hidden" });
        })
        .catch(() => {
          if (!controller.signal.aborted) setMemory({ kind: "error" });
        });
    }

    return () => controller.abort();
  }, [ledgerChecked, ledgerConnected, memoryConfigured]);

  const hasMemoryCard = memory.kind !== "hidden";
  const receivedDifference =
    insights.kind === "ready"
      ? insights.data.activity.current.receivedPaise -
        insights.data.activity.previous.receivedPaise
      : 0;

  return (
    <aside
      aria-label={t("Overview Details")}
      className="grid min-h-0 grid-cols-2 gap-3 lg:grid-cols-1"
    >
      <section
        aria-labelledby="overview-insights-title"
        className={`${panelClass} flex min-h-0 flex-col p-3 sm:p-4 ${hasMemoryCard ? "" : "col-span-2 lg:col-span-1"}`}
      >
        <header className="flex shrink-0 items-center justify-between gap-2">
          <h2
            id="overview-insights-title"
            className="flex min-w-0 items-center gap-1.5 text-xs"
          >
            <ChartNoAxesCombined size={14} className="shrink-0" />
            <span className="truncate">{t("Insights")}</span>
          </h2>
          <Link
            to="/insights"
            className="inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1 text-[10px] text-muted hover:text-fg"
          >
            {t("View All")}
            <ArrowUpRight size={12} />
          </Link>
        </header>
        {insights.kind === "loading" ? (
          <p role="status" className="mt-3 text-[11px] text-muted">
            {t("Loading…")}
          </p>
        ) : insights.kind === "unavailable" ? (
          <p className="mt-3 text-[11px] leading-5 text-muted">
            {t("Payment activity is unavailable right now.")}
          </p>
        ) : insights.kind === "error" ? (
          <p role="status" className="mt-3 text-[11px] leading-5 text-muted">
            {t("Insights could not load.")}
          </p>
        ) : insights.data.ledgerEntryCount === 0 ? (
          <p className="mt-3 text-[11px] leading-5 text-muted">
            {t("Record an entry to see payment activity.")}
          </p>
        ) : (
          <>
            <p className="mt-2 text-[10px] text-muted">
              {t("Last 30 Days")}
            </p>
            <div className="mt-2 grid min-w-0 grid-cols-2 gap-2">
              {[
                {
                  label: "Money Received",
                  value: insights.data.activity.current.receivedPaise,
                },
                {
                  label: "Money Paid",
                  value: insights.data.activity.current.paidPaise,
                },
              ].map((item) => (
                <div key={item.label} className="min-w-0">
                  <p className="truncate text-[10px] text-muted">
                    {t(item.label)}
                  </p>
                  <p className="mt-1 break-all text-xs tabular-nums">
                    {formatRupees(item.value)}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-muted">
              {insights.data.activity.current.paymentCount === 0
                ? t("No payments recorded in the last 30 days.")
                : receivedDifference === 0
                  ? t("Received the same as in the previous 30 days.")
                  : t(
                      receivedDifference > 0
                        ? "{amount} more received than in the previous 30 days."
                        : "{amount} less received than in the previous 30 days.",
                      { amount: formatRupees(Math.abs(receivedDifference)) },
                    )}
            </p>
          </>
        )}
      </section>

      {hasMemoryCard && (
        <section
          aria-labelledby="overview-memory-title"
          className={`${panelClass} flex min-h-0 flex-col p-3 sm:p-4`}
        >
          <header className="flex shrink-0 items-center justify-between gap-2">
            <h2
              id="overview-memory-title"
              className="flex min-w-0 items-center gap-1.5 text-xs"
            >
              <BookOpenText size={14} className="shrink-0" />
              <span className="truncate">{t("Business Memory")}</span>
            </h2>
            <Link
              to="/business-memory"
              className="inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1 text-[10px] text-muted hover:text-fg"
            >
              {t("View All")}
              <ArrowUpRight size={12} />
            </Link>
          </header>
          {memory.kind === "loading" ? (
            <p role="status" className="mt-3 text-[11px] text-muted">
              {t("Loading Memories…")}
            </p>
          ) : memory.kind === "error" ? (
            <p role="status" className="mt-3 text-[11px] leading-5 text-muted">
              {t("Memory could not load.")}
            </p>
          ) : memory.kind === "ready" ? (
            <>
              <p className="mt-2 text-[10px] text-muted">
                {t("Recent Memory")}
              </p>
              <p className="mt-1 line-clamp-2 break-words text-xs leading-5">
                {memory.fact.text}
              </p>
            </>
          ) : null}
        </section>
      )}
    </aside>
  );
}
