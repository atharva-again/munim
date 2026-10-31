import { lazy, Suspense, useEffect, useState } from "react";
import { authClient } from "./auth-client";
import { primaryClass } from "./ui";
const App = lazy(() => import("./App"));
export default function AuthGate() {
  const {
    data: session,
    isPending,
    error: sessionError,
  } = authClient.useSession();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth-status", { signal: controller.signal })
      .then((r) => r.json())
      .then((value: unknown) => {
        setConfigured(
          typeof value === "object" &&
            value !== null &&
            "configured" in value &&
            value.configured === true,
        );
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Could not reach Munim. Please try again.");
      });
    return () => controller.abort();
  }, []);
  if (session)
    return (
      <Suspense
        fallback={
          <div
            className="grid h-dvh place-items-center text-muted"
            role="status"
          >
            Opening Munim…
          </div>
        }
      >
        <App />
      </Suspense>
    );
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-6 text-fg">
      <div className="w-full max-w-xs">
        <img
          src="/munim-logo.png"
          width={52}
          height={52}
          alt="Munim"
          className="mb-8 rounded-xl"
        />
        <h1 className="text-3xl tracking-tight">Your Books, in Your Words</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          Speak, type, or fill in a form. Keep your business ledger in one
          place.
        </p>
        <button
          type="button"
          className={`${primaryClass} mt-8 w-full`}
          disabled={isPending || configured !== true || busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const result = await authClient.signIn.social({
                provider: "google",
                callbackURL: window.location.origin,
              });
              if (result.error)
                throw new Error(result.error.message || "Sign-in failed.");
            } catch (caught) {
              setError(
                caught instanceof Error ? caught.message : "Sign-in failed.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Connecting…" : "Continue with Google"}
        </button>
        {configured === false && (
          <p className="mt-4 text-xs leading-5 text-muted" role="status">
            Google sign-in is awaiting setup. Add the Google credentials and
            Better Auth configuration to enable access.
          </p>
        )}
        {(error || (configured && sessionError?.message)) && (
          <p role="alert" className="mt-4 text-xs text-status-red">
            {error || sessionError?.message}
          </p>
        )}
      </div>
    </main>
  );
}
