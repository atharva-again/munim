import { useState } from "react";
import { ChevronDown, LoaderCircle } from "lucide-react";
import type { MemoryContext } from "@munim/contracts";
import { api } from "./api";
import { useI18n } from "./i18n";
import { localizedError } from "./translations";
import { buttonClass, inputClass } from "./ui";

export function MemoryEvidence({
  memory,
  onChanged,
}: {
  memory: MemoryContext;
  onChanged?: () => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<string | null>(null),
    [text, setText] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [removed, setRemoved] = useState<string[]>([]);
  const change = async (id: string, value?: string) => {
    setBusy(true);
    setError("");
    try {
      await api.changeMemory(id, value);
      setRemoved((previous) => [...previous, id]);
      setEditing(null);
      onChanged?.();
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
  if (memory.status === "disabled" || memory.status === "not_configured")
    return null;
  return (
    <details className="group my-4 rounded-lg border border-line p-4 text-xs">
      <summary className="flex list-none items-center justify-between gap-3 text-muted">
        {t("Shop Context")}
        <ChevronDown size={14} className="group-open:rotate-180" />
      </summary>
      {memory.retrieval && memory.retrieval !== "semantic" && (
        <p className="mt-3 text-[11px] leading-5 text-muted">
          {t(
            memory.retrieval === "cached"
              ? "Showing recently recalled shop context. This is not a complete memory search."
              : "Showing recent shop memories. Older memories may not appear here.",
          )}
        </p>
      )}
      {memory.status === "unavailable" ? (
        <p className="mt-3 leading-6 text-muted">
          {t(
            "Shop memory is still connecting or unavailable. I’ll ask for details when needed.",
          )}
        </p>
      ) : memory.facts.length === 0 ? (
        <p className="mt-3 text-muted">
          {t("No matching shop context found.")}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {memory.facts
            .filter((fact) => !removed.includes(fact.id))
            .map((fact) => (
              <li key={fact.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-[10px] text-muted">
                  {t(
                    memory.usedIds.includes(fact.id)
                      ? "Used in This Reply"
                      : "Recalled Context",
                  )}
                </p>
                {editing === fact.id ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void change(fact.id, text.trim());
                    }}
                  >
                    <label className="sr-only" htmlFor="memory-correction">
                      {t("Correct Shop Context")}
                    </label>
                    <textarea
                      id="memory-correction"
                      className={`${inputClass} mt-2`}
                      value={text}
                      maxLength={2000}
                      onChange={(event) => setText(event.target.value)}
                      disabled={busy}
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        className={buttonClass}
                        disabled={busy || !text.trim()}
                      >
                        {t("Save Changes")}
                      </button>
                      <button
                        type="button"
                        className={buttonClass}
                        disabled={busy}
                        onClick={() => setEditing(null)}
                      >
                        {t("Cancel")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="mt-1 whitespace-pre-wrap break-words leading-6">
                    {fact.text}
                  </p>
                )}
                {fact.editable && editing !== fact.id && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className={buttonClass}
                      disabled={busy}
                      onClick={() => {
                        setText(fact.text);
                        setEditing(fact.id);
                      }}
                    >
                      {t("Correct")}
                    </button>
                    <button
                      type="button"
                      className={buttonClass}
                      disabled={busy}
                      onClick={() => void change(fact.id)}
                    >
                      {t("Forget")}
                    </button>
                  </div>
                )}
              </li>
            ))}
        </ul>
      )}
      {busy && (
        <LoaderCircle size={14} className="mt-3 motion-safe:animate-spin" />
      )}
      {removed.length > 0 && (
        <p role="status" className="mt-3 text-muted">
          {t("Context updated. Describe any affected unsaved entry again.")}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-status-red">
          {error}
        </p>
      )}
    </details>
  );
}
