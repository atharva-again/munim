import { lazy, Suspense, useEffect, useState } from "react";
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
export default function Workspace() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [selected, setSelected] = useState<PreferredLanguage | null>(null);
  const [selectedApprovalMode, setSelectedApprovalMode] =
    useState<ApprovalMode | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
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
          <>
            <h1 className="text-2xl tracking-tight">Make Munim Yours</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Choose the language for your greeting and default replies. You can
              speak Hindi, English, or Hinglish at any time.
            </p>
            <h2 className="mt-7 text-sm">Conversation Language</h2>
            <div className="mt-3">
              <LanguagePicker
                value={language}
                onChange={setSelected}
                disabled={busy}
              />
            </div>
            <h2 className="mt-7 text-sm">How Should Entries Be Saved?</h2>
            <div className="mt-3">
              <ApprovalModePicker
                value={approvalMode}
                onChange={setSelectedApprovalMode}
                disabled={busy}
              />
            </div>
            <p className="mt-4 text-[11px] text-muted">
              You can change both preferences later in Settings. The form always
              saves only when you submit it.
            </p>
            <button
              type="button"
              className={`${primaryClass} mt-6`}
              disabled={!language || !approvalMode || busy}
              onClick={async () => {
                if (!language || !approvalMode) return;
                setBusy(true);
                setError("");
                try {
                  await savePreferences({ language, approvalMode });
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
              {busy ? "Saving…" : "Continue"}
            </button>
            {error && (
              <p className="mt-4 text-xs text-status-red" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
