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
  FileText,
  Keyboard,
  LoaderCircle,
  Mic,
  Send,
} from "lucide-react";
import {
  validateDraft,
  type Conversation,
  type TransactionDraft,
} from "@munim/contracts";
import { conversations, type RecordingSession } from "./conversation-api";
import { DraftForm } from "./DraftForm";
import { formatRupees } from "./api";
import { buttonClass, inputClass, primaryClass, StatusDot } from "./ui";
const VoiceSession = lazy(() => import("./VoiceSession"));
type Mode = "voice" | "text" | "form";
const modes = [
  { id: "voice", label: "Voice", Icon: Mic },
  { id: "text", label: "Text", Icon: Keyboard },
  { id: "form", label: "Form", Icon: FileText },
] satisfies { id: Mode; label: string; Icon: typeof Mic }[];
export default function RecordView({
  visible,
  onSaved,
}: {
  visible: boolean;
  onSaved: () => Promise<void>;
}) {
  const [session, setSession] = useState<RecordingSession | null>(null);
  const [mode, setMode] = useState<Mode>("voice");
  const [draft, setDraft] = useState<TransactionDraft>({});
  const [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [active, setActive] = useState(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
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
    currentRevision.current = state.revision;
    setSession((previous) =>
      previous && state.revision >= previous.conversation.revision
        ? { ...previous, conversation: state }
        : previous,
    );
    setDraft(state.draft);
    setDirty(false);
  }, []);
  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await conversations.create();
      currentRevision.current = 0;
      currentSessionId.current = result.conversation.id;
      setActive(false);
      setSession(result);
      setDraft(result.conversation.draft);
      setDirty(false);
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
          setDraft(result.conversation.draft);
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
    if (!visible || !session || dirtyRef.current) return;
    let cancelled = false;
    conversations
      .get(session)
      .then((state) => {
        if (!cancelled && !dirtyRef.current) update(state);
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
  }, [visible, session?.conversation.id, update]);
  useEffect(() => {
    if (
      !visible ||
      !session ||
      active ||
      dirty ||
      session.conversation.phase !== "review" ||
      session.conversation.reviewedRevision === session.conversation.revision
    )
      return;
    let cancelled = false;
    conversations
      .reviewed(session)
      .then((state) => {
        if (!cancelled)
          setSession((previous) =>
            previous?.conversation.revision === state.revision
              ? { ...previous, conversation: state }
              : previous,
          );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, session, active, dirty]);
  useEffect(() => {
    const id = session?.conversation.transactionId;
    if (id && savedId.current !== id) {
      savedId.current = id;
      void onSaved();
    }
  }, [session?.conversation.transactionId, onSaved]);
  useEffect(() => {
    if (!visible || !active || !session) return;
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
  }, [visible, active, session?.conversation.id, update]);
  const run = async (operation: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (caught) {
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
  const changeMode = (next: Mode) =>
    void run(async () => {
      if (session && dirty) update(await conversations.form(session, draft));
      setMode(next);
    });
  const state = session?.conversation;
  return (
    <section className="mx-auto flex w-full max-w-220 flex-col gap-5">
      <header>
        <h1 className="sr-only">Record Transaction</h1>
        <p className="text-xs leading-6 text-muted">
          Speak, type, or use the form. Review the details before saving.
        </p>
      </header>
      <div className="rounded-xl border border-line bg-canvas">
        <div
          className="flex gap-1 border-b border-line px-5 pt-2 sm:px-7"
          role="tablist"
          aria-label="Entry Method"
        >
          {modes.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              aria-controls="record-panel"
              id={`record-tab-${id}`}
              disabled={busy || state?.phase === "saved"}
              onClick={() => changeMode(id)}
              className={`flex min-h-11 items-center gap-2 border-b-2 px-4 text-xs ${mode === id ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg"}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        <div className="px-5 pb-6 sm:px-7">
          {!session && (
            <div className="py-8" role="status">
              {error ? (
                <button
                  className={buttonClass}
                  onClick={() => void start()}
                  type="button"
                  disabled={busy}
                >
                  Try Again
                </button>
              ) : (
                "Opening Your Draft…"
              )}
            </div>
          )}
          {session && visible && mode === "voice" && (
            <Suspense
              fallback={
                <p className="py-8 text-xs text-muted">Opening Voice…</p>
              }
            >
              <VoiceSession
                key={session.conversation.id}
                session={session}
                onUpdate={update}
                onActiveChange={setActive}
              />
            </Suspense>
          )}
          {session && state?.phase !== "saved" && (
            <div
              role="tabpanel"
              id="record-panel"
              aria-labelledby={`record-tab-${mode}`}
            >
              {mode === "voice" ? null : mode === "text" ? (
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
                      try {
                        update(
                          await conversations.turn(
                            session,
                            attempt.text,
                            attempt.requestId,
                          ),
                        );
                      } catch (error) {
                        await conversations
                          .get(session)
                          .then(update)
                          .catch(() => {});
                        throw error;
                      }
                      retry.current = null;
                      setText("");
                    });
                  }}
                >
                  <label
                    className="grid gap-3 text-xs"
                    htmlFor="record-message"
                  >
                    Tell Munim What Happened
                    <textarea
                      id="record-message"
                      className={`${inputClass} min-h-24 resize-y`}
                      maxLength={2000}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Ramesh took ₹500 of goods, paid ₹200, and owes ₹300."
                      disabled={busy || !session.textConfigured}
                    />
                  </label>
                  <button
                    className={`${primaryClass} mt-3`}
                    type="submit"
                    disabled={busy || !text.trim() || !session.textConfigured}
                  >
                    <Send size={14} />
                    {busy ? "Understanding…" : "Send"}
                  </button>
                  {!session.textConfigured && (
                    <p className="mt-3 text-xs text-muted">
                      Text understanding is awaiting Groq setup. The form is
                      available now.
                    </p>
                  )}
                </form>
              ) : (
                <div className="py-5">
                  <DraftForm
                    draft={draft}
                    disabled={busy}
                    onChange={(value) => {
                      setDraft(value);
                      setDirty(true);
                    }}
                  />
                  <button
                    type="button"
                    className={`${primaryClass} mt-5`}
                    disabled={busy || !validateDraft(draft)}
                    onClick={() =>
                      void run(async () =>
                        update(await conversations.form(session, draft)),
                      )
                    }
                  >
                    Review Entry
                  </button>
                  <p className="mt-3 text-[11px] text-muted">
                    For credit or part payments, include the customer or
                    supplier.
                  </p>
                </div>
              )}
            </div>
          )}
          {state && state.messages.length > 0 && mode !== "form" && (
            <div
              className="mb-4 max-h-44 space-y-3 overflow-y-auto border-t border-line pt-4"
              aria-label="Conversation History"
            >
              {state.messages.slice(-6).map((message, i) => (
                <p
                  key={`${message.at}-${i}`}
                  className={`text-xs leading-5 ${message.role === "user" ? "text-muted" : "text-fg"}`}
                >
                  <span className="mr-2 text-[10px] text-muted">
                    {message.role === "user" ? "You" : "Munim"}
                  </span>
                  {message.text}
                </p>
              ))}
            </div>
          )}
          {session && state?.phase === "review" && !dirty && (
            <section
              className="rounded-lg border border-line p-4"
              aria-label="Review Entry"
            >
              <p className="flex items-center gap-2 text-xs">
                <StatusDot tone="warning" />
                Ready for Review
              </p>
              <p className="mt-3 text-2xl tracking-tight tabular-nums">
                {state.draft.amountPaise === undefined
                  ? ""
                  : formatRupees(state.draft.amountPaise)}
              </p>
              <p className="mt-3 text-xs leading-6 text-muted">{state.reply}</p>
              <button
                type="button"
                className={`${primaryClass} mt-4`}
                disabled={
                  busy || active || state.reviewedRevision !== state.revision
                }
                onClick={() =>
                  void run(async () =>
                    update(await conversations.confirm(session)),
                  )
                }
              >
                <Check size={15} />
                Confirm &amp; Save
              </button>
              {active && (
                <p className="mt-3 text-[11px] text-muted">
                  Say “yes” after the readback, or end voice mode to confirm
                  here.
                </p>
              )}
            </section>
          )}
          {state?.phase === "collecting" &&
            mode === "form" &&
            state.messages.length > 0 && (
              <p className="mt-3 text-xs text-muted">{state.reply}</p>
            )}
          {state?.phase === "saved" && (
            <section className="py-8">
              <p className="flex items-center gap-2 text-sm">
                <StatusDot tone="success" />
                Transaction Saved
              </p>
              <p className="mt-3 text-xs text-muted">
                {state.draft.description}
              </p>
              <button
                type="button"
                className={`${primaryClass} mt-5`}
                disabled={busy}
                onClick={() => void start()}
              >
                New Entry
              </button>
            </section>
          )}
          {busy && (
            <p
              role="status"
              className="mt-4 flex items-center gap-2 text-xs text-muted"
            >
              <LoaderCircle size={14} className="motion-safe:animate-spin" />
              Working…
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 text-xs leading-5 text-status-red">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
