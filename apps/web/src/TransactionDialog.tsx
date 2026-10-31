import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  Check,
  FileText,
  Keyboard,
  LoaderCircle,
  Mic,
  Send,
  X,
} from "lucide-react";
import {
  validateDraft,
  type Conversation,
  type TransactionDraft,
} from "@munim/contracts";
import { conversations, type RecordingSession } from "./conversation-api";
import { DraftForm } from "./DraftForm";
import { formatRupees } from "./api";
import {
  buttonClass,
  iconButtonClass,
  inputClass,
  primaryClass,
  StatusDot,
} from "./ui";
const VoiceSession = lazy(() => import("./VoiceSession"));
type Mode = "voice" | "text" | "form";
const modes = [
  { id: "voice", label: "Voice", Icon: Mic },
  { id: "text", label: "Text", Icon: Keyboard },
  { id: "form", label: "Form", Icon: FileText },
] satisfies { id: Mode; label: string; Icon: typeof Mic }[];
export function TransactionDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [session, setSession] = useState<RecordingSession | null>(null);
  const [mode, setMode] = useState<Mode>("voice");
  const [draft, setDraft] = useState<TransactionDraft>({});
  const [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [active, setActive] = useState(false);
  const [text, setText] = useState(""),
    [error, setError] = useState("");
  const popup = useRef<HTMLDivElement>(null),
    savedId = useRef<string | null>(null),
    pending = useRef(false);
  const currentRevision = useRef(-1);
  const creation = useRef<Promise<RecordingSession> | null>(null);
  const retry = useRef<{ text: string; requestId: string } | null>(null);
  const update = useCallback((state: Conversation) => {
    if (state.revision < currentRevision.current) return;
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
    if (!open) return;
    let cancelled = false;
    const request = (creation.current ??= conversations.create());
    request
      .then((result) => {
        if (!cancelled) {
          currentRevision.current = 0;
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
  }, [open]);
  useEffect(() => {
    if (
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
  }, [session, active, dirty]);
  useEffect(() => {
    const id = session?.conversation.transactionId;
    if (id && savedId.current !== id) {
      savedId.current = id;
      void onSaved();
    }
  }, [session?.conversation.transactionId, onSaved]);
  useEffect(() => {
    if (!active || !session) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void conversations
        .get(session)
        .then((state) => {
          if (!cancelled) update(state);
        })
        .catch(() => {});
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active, session?.conversation.id, update]);
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
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-20 bg-black/65" />
        <Dialog.Popup
          ref={popup}
          initialFocus={popup}
          className="fixed top-1/2 left-1/2 z-21 flex max-h-[92dvh] w-[min(620px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-line bg-canvas text-fg outline-none"
        >
          <header className="flex shrink-0 items-start justify-between gap-4 px-5 pt-5 sm:px-7">
            <div>
              <Dialog.Title className="text-xl tracking-tight">
                Record Transaction
              </Dialog.Title>
              <Dialog.Description className="mt-2 block text-xs text-muted">
                Your words. One draft. Review before saving.
              </Dialog.Description>
            </div>
            <Dialog.Close
              disabled={busy}
              className={iconButtonClass}
              aria-label="Close Dialog"
            >
              <X size={18} />
            </Dialog.Close>
          </header>
          <div
            className="mt-5 flex shrink-0 gap-1 border-b border-line px-5 sm:px-7"
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
          <div className="min-h-0 overflow-y-auto px-5 pb-6 sm:px-7">
            {!session && (
              <div className="py-8" role="status">
                {error ? (
                  <button
                    className={buttonClass}
                    onClick={() => void start()}
                    type="button"
                  >
                    Try Again
                  </button>
                ) : (
                  "Opening Your Draft…"
                )}
              </div>
            )}
            {session && mode === "voice" && (
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
                        Text understanding is awaiting Gemini setup. The form is
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
                <p className="mt-3 text-xs leading-6 text-muted">
                  {state.reply}
                </p>
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
              state.reply !==
                "Tell me what happened. बोलिए, क्या लेन-देन हुआ?" && (
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
              <p
                role="alert"
                className="mt-4 text-xs leading-5 text-status-red"
              >
                {error}
              </p>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
