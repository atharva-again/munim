import { localizedError } from "./translations";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  type PreferredLanguage,
  type ApprovalMode,
  type SavedPreferences,
  type Preferences,
} from "@munim/contracts";
import { useI18n } from "./i18n";
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
  const { t, setLanguage } = useI18n();
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
        if (!controller.signal.aborted) {
          if (preference.language) setLanguage(preference.language);
          setState({ kind: "ready", preferences: preference });
        }
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
  }, [retry, setLanguage]);
  const savePreferences = async (preferences: SavedPreferences) => {
    const saved = await api.savePreferences(preferences);
    setLanguage(saved.language);
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
            {t("Opening Munim…")}
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
            {t("Loading Your Preferences…")}
          </p>
        ) : state.kind === "error" ? (
          <div>
            <p role="alert" className="text-sm text-status-red">
              {localizedError(state.message)}
            </p>
            <button
              type="button"
              className={`${buttonClass} mt-5`}
              onClick={() => {
                setState({ kind: "loading" });
                setRetry((v) => v + 1);
              }}
            >
              {t("Try Again")}
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
                    : t("Could not save your preferences."),
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="mb-3 text-[11px] text-muted">
              {t("Step {step} of 2", {
                step: step.kind === "language" ? 1 : 2,
              })}
            </p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl tracking-tight outline-none"
            >
              {step.kind === "language"
                ? t("Choose Your Language")
                : t("How Should Entries Be Saved?")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              {step.kind === "language"
                ? t(
                    "Choose the language for the app and Munim’s replies. You can speak Hindi, English, or both.",
                  )
                : t(
                    "Choose whether Munim asks for approval or saves complete entries for you.",
                  )}
            </p>
            <div className="mt-7">
              {step.kind === "language" ? (
                <LanguagePicker
                  value={language}
                  onChange={(value) => {
                    setSelected(value);
                    setLanguage(value);
                  }}
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
                ? t("You can change your language later in Settings.")
                : t(
                    "You can change this later in Settings.",
                  )}
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
                  {t("Back")}
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
                  ? t("Saving…")
                  : step.kind === "language"
                    ? t("Continue")
                    : t("Finish Setup")}
              </button>
            </div>
            {error && (
              <p className="mt-4 text-xs text-status-red" role="alert">
                {localizedError(error)}
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
