import { localizedError } from "./translations";
import { useI18n } from "./i18n";
import { useRef, useState } from "react";
import {
  BookOpen,
  Check,
  CircleHelp,
  FileText,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { api } from "./api";
import {
  StatusDot,
  buttonClass,
  EmptyState,
  fieldClass,
  iconButtonClass,
  inputClass,
  panelClass,
  primaryClass,
} from "./ui";

type Mode = "search" | "add";
type Result =
  | { status: "idle" }
  | { status: "loading"; mode: Mode }
  | { status: "success"; mode: Mode; text: string; subject: string }
  | { status: "error"; message: string };
function readableResult(result: unknown): string {
  if (typeof result === "string") return result;
  if (
    result &&
    typeof result === "object" &&
    "content" in result &&
    Array.isArray(result.content)
  ) {
    const texts = result.content.flatMap((block: unknown) =>
      block &&
      typeof block === "object" &&
      "text" in block &&
      typeof block.text === "string"
        ? [block.text]
        : [],
    );
    if (texts.length) return texts.join("\n\n");
  }
  return JSON.stringify(result, null, 2) ?? "No context returned.";
}
export default function MemoryView({ configured }: { configured: boolean }) {
  const { t } = useI18n();

  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [convention, setConvention] = useState("");
  const [result, setResult] = useState<Result>({ status: "idle" });
  const pending = useRef(false);
  const busy = result.status === "loading";
  const submit = async () => {
    const text = (mode === "search" ? query : convention).trim();
    if (!configured || !text || pending.current) return;
    pending.current = true;
    setResult({ status: "loading", mode });
    try {
      const response = await (mode === "search"
        ? api.searchMemory(text)
        : api.addMemory(text));
      setResult({
        status: "success",
        mode,
        text: readableResult(response.result),
        subject: text,
      });
      if (mode === "add") setConvention("");
    } catch (error) {
      setResult({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Memory is unavailable. Please try again.",
      });
    } finally {
      pending.current = false;
    }
  };
  return (
    <section className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="sr-only">{t("Business Memory")}</h1>
          <p className="text-xs leading-relaxed text-muted">
            {t("Your business conventions, ready when you need them.")}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-[11px] text-muted">
          <StatusDot tone={configured ? "success" : "warning"} />
          {configured ? t("Connected") : t("Not Connected")}
        </span>
      </header>
      {!configured && (
        <div
          role="status"
          className="flex gap-3 rounded-lg border border-line bg-soft p-4"
        >
          <CircleHelp size={18} className="shrink-0 text-status-yellow" />
          <div>
            <h2 className="text-sm">{t("Memory Connection Needed")}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {t(
                "Connect your memory service to search and save business conventions.",
              )}
            </p>
          </div>
        </div>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className={`${panelClass} overflow-hidden`}>
          <div
            className="flex border-b border-line p-2"
            role="tablist"
            aria-label={t("Memory Actions")}
          >
            {(
              [
                { value: "search", label: t("Search Memory"), Icon: Search },
                { value: "add", label: t("Add Convention"), Icon: Plus },
              ] satisfies { value: Mode; label: string; Icon: typeof Search }[]
            ).map((item) => (
              <button
                key={item.value}
                id={`memory-tab-${item.value}`}
                role="tab"
                aria-selected={mode === item.value}
                aria-controls="memory-editor"
                tabIndex={mode === item.value ? 0 : -1}
                disabled={busy}
                type="button"
                onClick={() => setMode(item.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                    event.preventDefault();
                    const next = mode === "search" ? "add" : "search";
                    setMode(next);
                    document.getElementById(`memory-tab-${next}`)?.focus();
                  }
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs ${mode === item.value ? "bg-soft text-fg" : "text-muted hover:text-fg"}`}
              >
                <item.Icon size={15} />
                {t(item.label)}
              </button>
            ))}
          </div>
          <form
            id="memory-editor"
            role="tabpanel"
            aria-labelledby={`memory-tab-${mode}`}
            className="p-5 sm:p-7"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className="mb-6 grid size-10 place-items-center rounded-lg border border-line text-muted">
              {mode === "search" ? (
                <Search size={19} />
              ) : (
                <FileText size={19} />
              )}
            </div>
            <h2 className="text-lg tracking-tight">
              {mode === "search"
                ? t("Find Business Context")
                : t("Save a Convention")}
            </h2>
            <p className="mt-2 mb-7 text-xs leading-6 text-muted">
              {mode === "search"
                ? t(
                    "Look up the preferences, terminology, and decisions you have saved.",
                  )
                : t(
                    "Keep a preference or correction that Munim can recall in future entries.",
                  )}
            </p>
            <label className={fieldClass}>
              <span>
                {mode === "search"
                  ? t("What Would You Like to Recall?")
                  : t("Business Convention")}
              </span>
              {mode === "search" ? (
                <input
                  className={inputClass}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("How do we categorize delivery fuel?")}
                  disabled={!configured || busy}
                />
              ) : (
                <textarea
                  className={`${inputClass} min-h-36 resize-y leading-relaxed`}
                  value={convention}
                  maxLength={2000}
                  onChange={(event) => setConvention(event.target.value)}
                  placeholder={t(
                    "When I say ‘gaadi kharcha’, categorize it as delivery expense.",
                  )}
                  disabled={!configured || busy}
                />
              )}
            </label>
            {mode === "add" && (
              <p className="mt-2 text-right text-[10px] text-muted">
                {convention.length} / 2,000
              </p>
            )}
            <button
              type="submit"
              disabled={
                !configured ||
                busy ||
                !(mode === "search" ? query : convention).trim()
              }
              className={`${primaryClass} mt-5 w-full`}
            >
              {busy ? (
                <LoaderCircle size={15} className="motion-safe:animate-spin" />
              ) : mode === "search" ? (
                <Search size={15} />
              ) : (
                <Check size={15} />
              )}{" "}
              {busy
                ? mode === "search"
                  ? t("Searching…")
                  : t("Saving…")
                : mode === "search"
                  ? t("Search Memory")
                  : t("Save Convention")}
            </button>
          </form>
          <div className="flex gap-2.5 border-t border-line bg-soft px-5 py-4 text-[11px] leading-relaxed text-muted">
            <ShieldCheck size={16} className="shrink-0" />
            <p>
              {t(
                "Keep preferences here. Balances and transactions belong in your ledger.",
              )}
            </p>
          </div>
        </div>
        <section
          className={`${panelClass} min-h-96 overflow-hidden`}
          aria-label={t("Memory Results")}
          aria-busy={busy}
        >
          <header className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm">
              <BookOpen size={16} className="text-muted" />
              {t("Memory Results")}
            </h2>
            {result.status !== "idle" && !busy && (
              <button
                type="button"
                className={iconButtonClass}
                aria-label={t("Clear Memory Results")}
                onClick={() => setResult({ status: "idle" })}
              >
                <X size={15} />
              </button>
            )}
          </header>
          <div aria-live="polite">
            {result.status === "idle" ? (
              <EmptyState
                icon={<BookOpen size={25} />}
                title={t("Context Starts Here")}
                detail={t(
                  "Search your memory to see relevant context, or add a convention to use next time.",
                )}
              />
            ) : result.status === "loading" ? (
              <div className="flex min-h-64 items-center justify-center gap-3 text-xs text-muted">
                <LoaderCircle size={18} className="motion-safe:animate-spin" />
                {result.mode === "search"
                  ? t("Finding relevant context…")
                  : t("Saving your convention…")}
              </div>
            ) : result.status === "error" ? (
              <div role="alert" className="p-6">
                <h3 className="flex items-center gap-2 text-sm">
                  <CircleHelp size={17} className="text-status-red" />
                  {t("Unable to Complete Request")}
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  {localizedError(result.message)}
                </p>
                <button
                  className={`${buttonClass} mt-5`}
                  type="button"
                  onClick={() => void submit()}
                >
                  {t("Try Again")}
                </button>
              </div>
            ) : (
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2 text-xs">
                  <Check
                    size={15}
                    className={
                      result.mode === "search"
                        ? "text-status-blue"
                        : "text-status-green"
                    }
                  />
                  {result.mode === "search"
                    ? t("Context Retrieved")
                    : t("Convention Saved")}
                </div>
                <p className="mb-5 border-b border-line pb-5 text-xs leading-relaxed text-muted">
                  {result.subject}
                </p>
                <div className="max-h-[50dvh] overflow-auto text-sm leading-7 whitespace-pre-wrap break-words">
                  {result.text}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
