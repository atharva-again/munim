import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import { authClient } from "./auth-client";
import { useI18n } from "./i18n";

const LandingPage = lazy(() => import("./LandingPage"));

export default function HomeRoute() {
  const { t } = useI18n();
  const { data: session, isPending } = authClient.useSession();

  if (isPending)
    return (
      <main className="grid min-h-dvh place-items-center bg-canvas text-muted">
        <p role="status">{t("Opening Munim…")}</p>
      </main>
    );

  if (session) return <Navigate to="/overview" replace />;

  return (
    <Suspense fallback={<div className="min-h-dvh bg-canvas" />}>
      <LandingPage />
    </Suspense>
  );
}
