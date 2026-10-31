import { useI18n } from "./i18n";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Check,
  ChevronDown,
  Keyboard,
  LoaderCircle,
  Mic,
  Send,
} from "lucide-react";
import { type SavedPreferences, type Conversation } from "@munim/contracts";
import { conversations, type RecordingSession } from "./conversation-api";
import { EntrySummary } from "./EntrySummary";
import { MemoryEvidence } from "./MemoryEvidence";
import { localizedError } from "./translations";
import { buttonClass, inputClass, primaryClass } from "./ui";
const VoiceSession = lazy(() => import("./VoiceSession"));
type Mode = "voice" | "text";
const modes = [
  { id: "voice", label: "Voice", Icon: Mic },
  { id: "text", label: "Text", Icon: Keyboard },
] satisfies { id: Mode; label: string; Icon: typeof Mic }[];
export default function RecordView({
  visible,
  preferences,
  onSaved,
}: {
  visible: boolean;
  preferences: SavedPreferences;
  onSaved: () => Promise<void>;
}) {
  const { t } = useI18n();

  const [lastSaved, setLastSaved] = useState<Conversation | null>(null);
  const snapshotRef = useRef<Conversation | null>(null);
  const [session, setSession] = useState<RecordingSession | null>(null);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [mode, setMode] = useState<Mode>("voice");
  const [busy, setBusy] = useState(false),
    [active, setActive] = useState(false);
  const [text, setText] = useState(""),
    [error, setError] = useState("");
  const savedId = useRef<string | null>(null),
    pending = useRef(false);
  const currentRevision = useRef(-1);
  const currentSessionId = useRef<string | null>(null);
  const creation = useRef<Promise<RecordingSession> | null>(null);
  const retry = useRef<{ text: string; requestId: string } | null>(null);
  const update = useCallback((state: Conversation) => {
    if (
      state.id !== currentSessionId.current ||
      state.revision < currentRevision.current
    )
      return;
    if (
      snapshotRef.current?.id === state.id &&
      snapshotRef.current.revision === state.revision &&
      snapshotRef.current.phase === "saved" &&
      state.phase !== "saved"
    )
      return;
    snapshotRef.current = state;
    if (state.phase === "saved") setLastSaved(state);
    currentRevision.current = state.revision;
    setSession((previous) =>
      previous && state.revision >= previous.conversation.revision
        ? { ...previous, conversation: state }
        : previous,
    );
  }, []);
  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await conversations.create();
      currentRevision.current = 0;
      currentSessionId.current = result.conversation.id;
      setActive(false);
      setLastSaved(null);
      snapshotRef.current = result.conversation;
      setSession(result);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not start an entry.",
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!visible || session) return;
    let cancelled = false;
    const request = (creation.current ??= conversations.create());
    request
      .then((result) => {
        if (!cancelled) {
          currentRevision.current = 0;
          currentSessionId.current = result.conversation.id;
          setSession(result);
        }
      })
      .catch((caught) => {
        if (!cancelled)
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not start an entry.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [visible, session]);
  useEffect(() => {
    if (!visible || !session) return;
    let cancelled = false;
    conversations
      .get(session)
      .then((state) => {
        if (!cancelled) update(state);
      })
      .catch((caught) => {
        if (!cancelled)
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not refresh your draft.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [
    visible,
    session?.conversation.id,
    preferences.language,
    preferences.approvalMode,
    update,
  ]);
  useEffect(() => {
    if (
      !visible ||
      !session ||
      session.conversation.phase !== "review" ||
      session.conversation.reviewedRevision === session.conversation.revision
    )
      return;
    let cancelled = false;
    conversations
      .reviewed(session)
      .then((state) => {
        if (!cancelled) update(state);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, session, active, update]);
  useEffect(() => {
    const id = session?.conversation.transactionId;
    if (id && savedId.current !== id) {
      savedId.current = id;
      void onSaved();
    }
  }, [session?.conversation.transactionId, onSaved]);
  useEffect(() => {
    if (
      !visible ||
      !session ||
      (!active && session.conversation.phase !== "processing")
    )
      return;
    let cancelled = false;
    let refreshing = false;
    const timer = window.setInterval(() => {
      if (refreshing || document.visibilityState !== "visible") return;
      refreshing = true;
      void conversations
        .get(session)
        .then((state) => {
          if (!cancelled) update(state);
        })
        .catch(() => {})
        .finally(() => {
          refreshing = false;
        });
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    visible,
    active,
    session?.conversation.id,
    session?.conversation.phase,
    update,
  ]);
  const run = async (operation: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (caught) {
      const latest = session
        ? await conversations.get(session).catch(() => null)
        : null;
      if (
        latest &&
        (latest.revision > currentRevision.current || latest.phase === "saved")
      )
        update(latest);
      if (
        latest?.phase === "saved" &&
        latest.transactionId !== session?.conversation.transactionId
      ) {
        setText("");
        retry.current = null;
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not complete that request.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const changeMode = (next: Mode) => setMode(next);
  const state = session?.conversation;
  const autonomous = preferences.approvalMode === "autonomous";
  return (
    <section className="mx-auto flex w-full max-w-220 flex-col gap-5">
      <h1 className="sr-only">{t("Record Transaction")}</h1>
      <div className="rounded-xl border border-line bg-canvas">
        <div
          className="flex gap-1 border-b border-line px-5 pt-2 sm:px-7"
          role="tablist"
          aria-label={t("Entry Method")}
        >
          {modes.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              aria-controls="record-panel"
              id={`record-tab-${id}`}
              tabIndex={mode === id ? 0 : -1}
              disabled={busy}
              onClick={() => changeMode(id)}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault();
                  const next = mode === "voice" ? "text" : "voice";
                  changeMode(next);
                  document.getElementById(`record-tab-${next}`)?.focus();
                }
              }}
              className={`flex min-h-11 items-center gap-2 border-b-2 px-4 text-xs ${mode === id ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg"}`}
            >
              <Icon size={15} />
              {t(label)}
            </button>
          ))}
        </div>
        <div
          className="px-5 pb-6 sm:px-7"
          role="tabpanel"
          id="record-panel"
          aria-labelledby={`record-tab-${mode}`}
        >
          {!session && (
            <div className="py-8" role="status">
              {error ? (
                <button
                  className={buttonClass}
                  onClick={() => void start()}
                  type="button"
                  disabled={busy}
                >
                  {t("Try Again")}
                </button>
              ) : (
                t("Opening Your Draft…")
              )}
            </div>
          )}
          {session && visible && mode === "voice" && (
            <Suspense
              fallback={
                <p className="py-8 text-xs text-muted">{t("Opening Voice…")}</p>
              }
            >
              <VoiceSession
                key={session.conversation.id}
                session={session}
                onUpdate={update}
                onActiveChange={setActive}
                onChooseText={() => changeMode("text")}
                onProcessingChange={setVoiceProcessing}
              />
            </Suspense>
          )}
          {session && mode === "text" && (
            <form
              className="py-5"
              onSubmit={(event) => {
                event.preventDefault();
                if (!text.trim()) return;
                void run(async () => {
                  const attempt =
                    retry.current?.text === text
                      ? retry.current
                      : { text, requestId: crypto.randomUUID() };
                  retry.current = attempt;
                  update(
                    await conversations.turn(
                      session,
                      attempt.text,
                      attempt.requestId,
                    ),
                  );
                  retry.current = null;
                  setText("");
                });
              }}
            >
              <label className="grid gap-3 text-xs" htmlFor="record-message">
                {t("Tell Munim What Happened")}
                <textarea
                  id="record-message"
                  className={`${inputClass} min-h-24 resize-y`}
                  maxLength={2000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t(
                    state?.phase === "review"
                      ? "Tell me what to change, for example: make the amount ₹550."
                      : "Ramesh took ₹500 of goods, paid ₹200, and owes ₹300.",
                  )}
                  disabled={
                    busy ||
                    voiceProcessing ||
                    state?.phase === "processing" ||
                    !session.textConfigured
                  }
                />
              </label>
              <button
                className={`${primaryClass} mt-3`}
                type="submit"
                disabled={
                  busy ||
                  voiceProcessing ||
                  state?.phase === "processing" ||
                  !text.trim() ||
                  !session.textConfigured
                }
              >
                <Send size={14} />
                {busy ? t("Understanding…") : t("Send")}
              </button>
              {!session.textConfigured && (
                <p className="mt-3 text-xs text-muted">
                  {t(
                    "Text entry is unavailable right now. Please try again later.",
                  )}
                </p>
              )}
            </form>
          )}
          {state?.phase === "collecting" &&
            mode === "text" &&
            state.revision > 0 && (
              <div className="mb-5 rounded-lg bg-soft p-4" role="status">
                <p className="text-sm leading-7">{state.reply}</p>
              </div>
            )}
          {session && state?.phase === "review" && (
            <section
              className="mb-5 rounded-lg border border-line p-4 sm:p-5"
              aria-label={t("Review Entry")}
            >
              <h2 className="text-sm">{t("Check This Entry")}</h2>
              <EntrySummary draft={state.draft} />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={primaryClass}
                  disabled={
                    busy ||
                    voiceProcessing ||
                    (!autonomous && state.reviewedRevision !== state.revision)
                  }
                  onClick={() =>
                    void run(async () =>
                      update(await conversations.confirm(session)),
                    )
                  }
                >
                  <Check size={15} />
                  {t("Save It")}
                </button>
                <button
                  type="button"
                  className={buttonClass}
                  disabled={busy || voiceProcessing}
                  onClick={() => {
                    setText("");
                    changeMode("text");
                  }}
                >
                  {t("Edit Details")}
                </button>
              </div>
              {active && (
                <p className="mt-3 text-[11px] text-muted">
                  {t("Or say “yes” to save this entry.")}
                </p>
              )}
            </section>
          )}
          {lastSaved && state?.phase !== "review" && (
            <section
              className="mb-5 rounded-lg border border-line p-4 sm:p-5"
              aria-label={t("Last Saved")}
            >
              <h2 className="flex items-center gap-2 text-xs">
                <Check size={15} className="text-status-green" />
                {t(state?.phase === "saved" ? "Saved" : "Last Saved")}
              </h2>
              <EntrySummary draft={lastSaved.draft} />
            </section>
          )}
          {state && (
            <MemoryEvidence
              key={`${state.id}-${state.revision}`}
              memory={state.memory}
              onChanged={() => {
                if (session)
                  void conversations
                    .get(session)
                    .then(update)
                    .catch(() => {});
              }}
            />
          )}
          {state && state.messages.length > 0 && (
            <details className="group mb-4 border-t border-line pt-3">
              <summary className="flex list-none items-center justify-between gap-2 rounded-md py-2 text-xs text-muted hover:text-fg">
                {t("Conversation History")}
                <ChevronDown
                  size={14}
                  className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <div className="mt-3 max-h-60 space-y-4 overflow-y-auto">
                {state.messages.map((message, i) => (
                  <div
                    key={`${message.at}-${i}`}
                    className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 text-xs leading-6"
                  >
                    <span className="text-[11px] text-muted">
                      {t(message.role === "user" ? "You: " : "Munim: ")}
                    </span>
                    <p
                      className={
                        message.role === "user" ? "text-muted" : "text-fg"
                      }
                    >
                      {message.text}
                    </p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className={`${buttonClass} mt-4`}
                disabled={busy}
                onClick={() => void start()}
              >
                {t("New Conversation")}
              </button>
            </details>
          )}
          {(busy || (state?.phase === "processing" && mode !== "voice")) && (
            <p
              role="status"
              className="mt-4 flex items-center gap-2 text-xs text-muted"
            >
              <LoaderCircle size={14} className="motion-safe:animate-spin" />
              {t("Working…")}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 text-xs leading-5 text-status-red">
              {localizedError(error)}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
