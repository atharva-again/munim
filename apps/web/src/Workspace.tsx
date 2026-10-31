import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  type PreferredLanguage,
  type ApprovalMode,
  type SavedPreferences,
  type Preferences,
} from "@munim/contracts";
import { api } from "./api";
import { ApprovalModePicker } from "./ApprovalModePicker";
import { LanguagePicker } from "./LanguagePicker";
import { buttonClass, primaryClass } from "./ui";
const App = lazy(() => import("./App"));
type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; preferences: Preferences };
type Step =
  | { kind: "language" }
  | { kind: "approval"; language: PreferredLanguage };
export default function Workspace() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [step, setStep] = useState<Step>({ kind: "language" });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [selected, setSelected] = useState<PreferredLanguage | null>(null);
  const [selectedApprovalMode, setSelectedApprovalMode] =
    useState<ApprovalMode | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (state.kind === "ready") headingRef.current?.focus();
  }, [step, state.kind]);
  useEffect(() => {
    const controller = new AbortController();
    api
      .preferences(controller.signal)
      .then((preference) => {
        if (!controller.signal.aborted)
          setState({ kind: "ready", preferences: preference });
      })
      .catch((caught) => {
        if (!controller.signal.aborted)
          setState({
            kind: "error",
            message:
              caught instanceof Error
                ? caught.message
                : "Could not load your preferences.",
          });
      });
    return () => controller.abort();
  }, [retry]);
  const savePreferences = async (preferences: SavedPreferences) => {
    const saved = await api.savePreferences(preferences);
    setState({ kind: "ready", preferences: saved });
  };
  const language =
    selected ?? (state.kind === "ready" ? state.preferences.language : null);
  const approvalMode =
    selectedApprovalMode ??
    (state.kind === "ready" ? state.preferences.approvalMode : null);
  if (
    state.kind === "ready" &&
    state.preferences.language &&
    state.preferences.approvalMode
  )
    return (
      <Suspense
        fallback={
          <p className="grid h-dvh place-items-center text-muted" role="status">
            Opening Munim…
          </p>
        }
      >
        <App
          preferences={{
            language: state.preferences.language,
            approvalMode: state.preferences.approvalMode,
          }}
          onPreferencesChange={savePreferences}
        />
      </Suspense>
    );
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-10">
      <div className="w-full max-w-xl">
        <img
          src="/munim-logo.png"
          alt=""
          width={44}
          height={44}
          className="mb-7 rounded-lg"
        />
        {state.kind === "loading" ? (
          <p role="status" className="text-sm text-muted">
            Loading Your Preferences…
          </p>
        ) : state.kind === "error" ? (
          <div>
            <p role="alert" className="text-sm text-status-red">
              {state.message}
            </p>
            <button
              type="button"
              className={`${buttonClass} mt-5`}
              onClick={() => {
                setState({ kind: "loading" });
                setRetry((v) => v + 1);
              }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;
              if (step.kind === "language") {
                if (language) {
                  setError("");
                  setStep({ kind: "approval", language });
                }
                return;
              }
              if (!approvalMode) return;
              setBusy(true);
              setError("");
              try {
                await savePreferences({
                  language: step.language,
                  approvalMode,
                });
              } catch (caught) {
                setError(
                  caught instanceof Error
                    ? caught.message
                    : "Could not save your preferences.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="mb-3 text-[11px] text-muted">
              Step {step.kind === "language" ? "1" : "2"} of 2
            </p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl tracking-tight outline-none"
            >
              {step.kind === "language"
                ? "How Should Munim Speak?"
                : "How Should Entries Be Saved?"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              {step.kind === "language"
                ? "Choose the language for your greeting and default replies. You can still speak Hindi, English, or Hinglish at any time."
                : "Choose whether Munim asks for approval or saves complete entries for you."}
            </p>
            <div className="mt-7">
              {step.kind === "language" ? (
                <LanguagePicker
                  value={language}
                  onChange={setSelected}
                  disabled={busy}
                />
              ) : (
                <ApprovalModePicker
                  value={approvalMode}
                  onChange={(value) => {
                    setSelectedApprovalMode(value);
                    setError("");
                  }}
                  disabled={busy}
                />
              )}
            </div>
            <p className="mt-4 text-[11px] text-muted">
              {step.kind === "language"
                ? "You can change your language later in Settings."
                : "You can change this later in Settings. The form always waits for you to submit."}
            </p>
            <div className="mt-6 flex items-center justify-between gap-3">
              {step.kind === "approval" && (
                <button
                  type="button"
                  className={buttonClass}
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    setStep({ kind: "language" });
                  }}
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                className={`${primaryClass} ml-auto`}
                disabled={
                  busy || (step.kind === "language" ? !language : !approvalMode)
                }
              >
                {busy
                  ? "Saving…"
                  : step.kind === "language"
                    ? "Continue"
                    : "Finish Setup"}
              </button>
            </div>
            {error && (
              <p className="mt-4 text-xs text-status-red" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
