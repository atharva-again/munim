import { useI18n } from "./i18n";
import { Link } from "react-router-dom";
import { ChatBubble } from "./ChatBubble";
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
  const [chat, setChat] = useState<{ id: string; role: "user" | "assistant"; text: string; at: number }[]>([]);
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mode === "text") chatEnd.current?.scrollIntoView({ block: "nearest" });
  }, [chat.length, busy, mode, session?.conversation.messages.length]);
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
      setChat([]);
      setText("");
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
  const displayedChat = [
    ...(state?.messages.filter((message) => message.channel === "voice").map((message) => ({
      id: `${message.at}-${message.role}`, role: message.role, text: message.text, at: Date.parse(message.at),
    })) ?? []),
    ...chat,
  ].sort((left, right) => left.at - right.at);
  const autonomous = preferences.approvalMode === "autonomous";
  return (
    <section className="mx-auto grid w-full max-w-300 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_17rem]">
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
          <Link to="/conversations" className="ml-auto flex items-center px-2 pb-2 text-[11px] text-muted hover:text-fg">{t("Past Conversations")}</Link>
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
            <div className="flex flex-col pt-5">
              <div role="log" aria-label={t("Conversation")} aria-live="polite" className="max-h-[45dvh] min-h-48 space-y-3 overflow-y-auto overscroll-contain px-1 pb-5">
                {displayedChat.length === 0 && (
                  <ChatBubble role="assistant" text={t("What would you like to record?")} />
                )}
                {displayedChat.map((message) => (
                  <ChatBubble key={message.id} role={message.role} text={message.text} at={message.at} />
                ))}
                {busy && <p role="status" className="text-xs text-muted">{t("Understanding…")}</p>}
                <div ref={chatEnd} />
              </div>
            <form
              className="mb-5 rounded-xl border border-line bg-canvas p-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!text.trim() || busy || voiceProcessing || state?.phase === "processing" || !session.textConfigured) return;
                void run(async () => {
                  const attempt =
                    retry.current?.text === text
                      ? retry.current
                      : { text, requestId: crypto.randomUUID() };
                  retry.current = attempt;
                  setChat((previous) => previous.some((message) => message.id === attempt.requestId)
                    ? previous : [...previous, {id: attempt.requestId, role: "user", text: attempt.text, at: Date.now()}]);
                  const reply = await conversations.turn(
                      session,
                      attempt.text,
                      attempt.requestId,
                    );
                  update(reply);
                  setChat((previous) => [...previous, {id: `${attempt.requestId}-reply`, role: "assistant", text: reply.reply, at: Date.now()}]);
                  retry.current = null;
                  setText("");
                });
              }}
            >
              <label className="grid gap-2 text-xs" htmlFor="record-message">
                <span className="sr-only">{t("Message Munim")}</span>
                <textarea
                  id="record-message"
                  className={`${inputClass} min-h-20 resize-y border-0`}
                  maxLength={2000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(event)=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();event.currentTarget.form?.requestSubmit();}}}
                  placeholder={t(
                    state?.phase === "review"
                      ? "Tell me what to change, for example: make the amount ₹550."
                      : displayedChat.length ? "Type your reply…" : "Tell Munim what happened…",
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
          {mode === "voice" && state && state.messages.length > 0 && (
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
      {state && (
        <aside className="order-first min-w-0 xl:order-last xl:sticky xl:top-0" aria-label={t("Shop Context")}>
          <MemoryEvidence
            key={state.id}
            memory={state.memory}
            onChanged={() => {
              if (session) void conversations.get(session).then(update).catch(() => {});
            }}
          />
        </aside>
      )}
    </section>
  );
}
