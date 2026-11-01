import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Search, Plus, LoaderCircle } from "lucide-react";
import type { MemoryContext } from "@munim/contracts";
import { api } from "./api";
import { MemoryEvidence } from "./MemoryEvidence";
import { useI18n } from "./i18n";
import { localizedError } from "./translations";
import { buttonClass, inputClass, primaryClass, StatusDot } from "./ui";
export default function MemoryView({ configured }: { configured: boolean }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"search" | "add">("search");
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [result, setResult] = useState<MemoryContext | null>(null),
    [saved, setSaved] = useState(false);
  const [recent, setRecent] = useState<MemoryContext | null>(null);
  const [recentBusy, setRecentBusy] = useState(false);
  const [recentError, setRecentError] = useState("");
  const recentRequest = useRef(false);
  const previousPending = useRef(0);
  const previousReady = useRef(false);
  const loadRecent = useCallback(async () => {
    if (recentRequest.current) return;
    recentRequest.current = true;
    setRecentBusy(true);
    setRecentError("");
    try {
      setRecent((await api.recentMemories()).result);
    } catch (caught) {
      setRecentError(localizedError(caught instanceof Error ? caught.message : "Could not complete that request."));
    } finally {
      recentRequest.current = false;
      setRecentBusy(false);
    }
  }, []);
  useEffect(() => {
    if (configured) void loadRecent();
  }, [configured, loadRecent]);
  const [status, setStatus] = useState<Awaited<
    ReturnType<typeof api.memoryStatus>
  > | null>(null);
  useEffect(() => {
    if (status?.status === "ready" &&
      (!previousReady.current || previousPending.current > 0 && status.pendingCaptures === 0))
      void loadRecent();
    previousPending.current = status?.pendingCaptures ?? 0;
    previousReady.current = status?.status === "ready";
  }, [status, loadRecent]);
  const refresh = () =>
    api
      .memoryStatus()
      .then(setStatus)
      .catch(() => {});
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  const submit = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      if (mode === "search") {
        setResult((await api.searchMemory(text.trim())).result);
      } else {
        await api.addMemory(text.trim());
        setText("");
        setSaved(true);
        void loadRecent();
      }
      await refresh();
    } catch (caught) {
      setError(
        localizedError(
          caught instanceof Error
            ? caught.message
            : "Could not complete that request.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const connected = status?.status === "ready";
  const displayedMemory = (mode === "search" ? result : null) ?? recent;
  return (
    <section className="max-w-220 space-y-5">
      <h1 className="sr-only">{t("Business Memory")}</h1>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-lg text-xs leading-6 text-muted">
          {t(
            "Teach Munim your shop’s names, products, and conventions. It can recall them in later conversations.",
          )}
        </p>
        <p className="flex items-center gap-2 text-[11px] text-muted">
          <StatusDot tone={connected ? "success" : "warning"} />
          {t(
            connected ? "Ready" : configured ? "Connecting…" : "Not Connected",
          )}
        </p>
      </div>
      <div className="rounded-xl border border-line">
        <div
          className="flex gap-1 border-b border-line p-2"
          role="tablist"
          aria-label={t("Memory Actions")}
        >
          {(
            [
              { id: "search", label: "Search Memory", Icon: Search },
              { id: "add", label: "Add Convention", Icon: Plus },
            ] satisfies {
              id: "search" | "add";
              label: string;
              Icon: typeof Search;
            }[]
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              aria-controls="memory-panel"
              id={"memory-" + id}
              className={
                "flex min-h-10 items-center gap-2 rounded-md px-4 text-xs " +
                (mode === id ? "bg-soft" : "text-muted hover:text-fg")
              }
              disabled={busy}
              onClick={() => {
                setMode(id);
                setText("");
                setError("");
                setSaved(false);
              }}
            >
              <Icon size={15} />
              {t(label)}
            </button>
          ))}
        </div>
        <form
          id="memory-panel"
          role="tabpanel"
          aria-labelledby={"memory-" + mode}
          className="p-5 sm:p-7"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label htmlFor="shop-memory" className="mb-3 block text-xs">
            {t(
              mode === "search"
                ? "What Would You Like to Recall?"
                : "Business Convention",
            )}
          </label>
          <textarea
            id="shop-memory"
            className={inputClass + " min-h-24 resize-y"}
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={mode === "search" ? 800 : 2000}
            disabled={!configured || busy}
            placeholder={t(
              mode === "search"
                ? "What does ‘big crate’ mean in my shop?"
                : "In my shop, ‘big crate’ means 24 bottles.",
            )}
          />
          <button
            type="submit"
            className={primaryClass + " mt-4"}
            disabled={!configured || busy || !text.trim()}
          >
            {busy ? (
              <LoaderCircle size={14} className="motion-safe:animate-spin" />
            ) : mode === "search" ? (
              <Search size={14} />
            ) : (
              <Plus size={14} />
            )}{" "}
            {t(mode === "search" ? "Search Memory" : "Save Convention")}
          </button>
          {saved && (
            <p role="status" className="mt-3 flex items-center gap-2 text-xs">
              <Check size={14} className="text-status-green" />
              {t("Convention saved. It may take a moment to appear in recall.")}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-xs text-status-red">
              {error}
            </p>
          )}
        </form>
      </div>
      {mode === "search" && result && (
        <button type="button" className={buttonClass} onClick={() => {
          setResult(null);
          setText("");
          void loadRecent();
        }}>{t("Show Recent Memories")}</button>
      )}
      {recentBusy && !recent && (
        <p role="status" className="flex items-center gap-2 text-xs text-muted">
          <LoaderCircle size={14} className="motion-safe:animate-spin" />
          {t("Loading Memories…")}
        </p>
      )}
      {recentError && (
        <div className="space-y-3 text-xs">
          <p role="alert" className="text-status-red">{recentError}</p>
          <button type="button" className={buttonClass} disabled={recentBusy} onClick={() => void loadRecent()}>{t("Try Again")}</button>
        </div>
      )}
      {displayedMemory && (
        <MemoryEvidence
          key={mode === "search" && result ? JSON.stringify(result) : "recent"}
          memory={displayedMemory}
          listing={!(mode === "search" && result)}
          expanded
          onChanged={() => {
            if (mode === "search" && result) {
              void api.searchMemory(text.trim()).then((value) => setResult(value.result)).catch(() => setResult(null));
            }
            void loadRecent();
            void refresh();
          }}
        />
      )}
      {displayedMemory?.status === "unavailable" && (
        <button type="button" className={buttonClass} disabled={recentBusy || busy} onClick={() => {
          if (mode === "search" && result) void submit();
          else void loadRecent();
        }}>{t("Try Again")}</button>
      )}
      {status && status.pendingCaptures > 0 && (
        <p className="text-xs text-muted" role="status">
          {t(
            "Shop memory is updating. New conventions may take a moment to appear.",
          )}
        </p>
      )}
      {status && (status.failedCaptures > 0 || status.status === "failed") && (
        <div className="rounded-lg border border-line p-4">
          <p className="text-xs leading-6 text-muted">
            {t(
              "Some shop memory updates could not finish. Your financial records are safe.",
            )}
          </p>
          <button
            type="button"
            className={buttonClass + " mt-3"}
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void api
                .retryMemory()
                .then(refresh)
                .catch((caught) =>
                  setError(
                    localizedError(
                      caught instanceof Error
                        ? caught.message
                        : "Could not complete that request.",
                    ),
                  ),
                )
                .finally(() => setBusy(false));
            }}
          >
            {t("Try Again")}
          </button>
        </div>
      )}
    </section>
  );
}
