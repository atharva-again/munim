import { useEffect, useState } from "react";
import type { z } from "zod";
import type { peopleDuesSchema } from "@munim/contracts";
import { api, formatDate, formatRupees } from "./api";
import { useI18n } from "./i18n";
import { buttonClass, LoadingRows, panelClass, StatusDot } from "./ui";

export function PeopleDues({ version }: { version: number }) {
  const { t, language } = useI18n();
  const [direction, setDirection] = useState<"inflow" | "outflow">("inflow");
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<z.infer<typeof peopleDuesSchema> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError("");
    void api.peopleDues(direction, page, controller.signal).then(value => {
      if (!controller.signal.aborted) setResult(value);
    }).catch(caught => {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : t("Could not load insights."));
    });
    return () => controller.abort();
  }, [direction, page, version, retry, t]);
  return <section className={panelClass} aria-label={t("Dues by Person")}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
      <div><h2 className="text-sm">{t("Dues by Person")}</h2><p className="mt-2 text-xs text-muted">{t("Across all recorded history. Names are grouped as recorded.")}</p>{result && <p className="mt-2 text-lg tabular-nums">{formatRupees(result.totalRemainingPaise)}</p>}</div>
      <div className="flex gap-2" role="group" aria-label={t("Outstanding Money Direction")}>
        {(["inflow", "outflow"] as const).map(value => <button type="button" key={value} className={`${buttonClass} ${direction === value ? "border-fg bg-soft" : ""}`} aria-pressed={direction === value} onClick={() => { setDirection(value); setPage(0); }}>{t(value === "inflow" ? "To Collect" : "To Pay")}</button>)}
      </div>
    </div>
    {error ? <div className="space-y-3 p-5"><p role="alert" className="text-xs text-status-red">{error}</p><button type="button" className={buttonClass} onClick={() => setRetry(value => value + 1)}>{t("Try Again")}</button></div> : !result ? <LoadingRows /> : result.total === 0 ? <p className="p-5 text-xs text-muted">{t("No outstanding balances in this direction.")}</p> : <>
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-muted"><tr><th className="px-5 py-3 font-normal">{t("Name")}</th><th className="px-5 py-3 font-normal">{t("Entries")}</th><th className="px-5 py-3 font-normal">{t("Oldest Entry")}</th><th className="px-5 py-3 text-right font-normal">{t("Remaining")}</th></tr></thead><tbody>
        {result.items.map(person => <tr key={person.counterparty} className="border-t border-line"><td className="px-5 py-4">{person.displayText?.[language].counterparty || person.counterparty || t("Not specified")}</td><td className="px-5 py-4 tabular-nums">{person.entryCount}</td><td className="whitespace-nowrap px-5 py-4 text-muted">{formatDate(person.oldestAt)}</td><td className="px-5 py-4 text-right tabular-nums"><span className="inline-flex items-center gap-2"><StatusDot tone="warning" />{formatRupees(person.remainingPaise)}</span></td></tr>)}
      </tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3"><p className="text-[11px] text-muted">{t("Showing {from}–{to} of {total} people", { from: result.page * 20 + 1, to: result.page * 20 + result.items.length, total: result.total })}</p><div className="flex gap-2"><button type="button" className={buttonClass} disabled={result.page === 0} onClick={() => setPage(result.page - 1)}>{t("Previous")}</button><button type="button" className={buttonClass} disabled={(result.page + 1) * 20 >= result.total} onClick={() => setPage(result.page + 1)}>{t("Next")}</button></div></div>
    </>}
  </section>;
}
