import { lazy, Suspense, useEffect, useState } from "react";
import type { PreferredLanguage } from "@munim/contracts";
import { api } from "./api";
import { LanguagePicker } from "./LanguagePicker";
import { buttonClass, primaryClass } from "./ui";
const App = lazy(() => import("./App"));
type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; language: PreferredLanguage | null };
export default function Workspace() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [selected, setSelected] = useState<PreferredLanguage | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api
      .preferences(controller.signal)
      .then((preference) => {
        if (!controller.signal.aborted)
          setState({ kind: "ready", language: preference.language });
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
  const saveLanguage = async (language: PreferredLanguage) => {
    const preference = await api.saveLanguage(language);
    setState({ kind: "ready", language: preference.language });
  };
  if (state.kind === "ready" && state.language)
    return (
      <Suspense
        fallback={
          <p className="grid h-dvh place-items-center text-muted" role="status">
            Opening Munim…
          </p>
        }
      >
        <App language={state.language} onLanguageChange={saveLanguage} />
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
            <h1 className="text-2xl tracking-tight">How Should Munim Speak?</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Choose the language for your greeting and default replies. You can
              speak Hindi, English, or Hinglish at any time.
            </p>
            <div className="mt-7">
              <LanguagePicker
                value={selected}
                onChange={setSelected}
                disabled={busy}
              />
            </div>
            <p className="mt-4 text-[11px] text-muted">
              You can change this later in Settings.
            </p>
            <button
              type="button"
              className={`${primaryClass} mt-6`}
              disabled={!selected || busy}
              onClick={async () => {
                if (!selected) return;
                setBusy(true);
                setError("");
                try {
                  await saveLanguage(selected);
                } catch (caught) {
                  setError(
                    caught instanceof Error
                      ? caught.message
                      : "Could not save your language.",
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
