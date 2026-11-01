import React from "react";
import ReactDOM from "react-dom/client";
import { LanguageProvider } from "./i18n";
import { BrowserRouter, Route, Routes } from "react-router-dom";
const AuthGate = React.lazy(() => import("./AuthGate"));
const HomeRoute = React.lazy(() => import("./HomeRoute"));
import "./tailwind.css";

try {
  document.documentElement.lang =
    localStorage.getItem("munim-language") === "hi" ? "hi" : "en";
} catch {
  document.documentElement.lang = "en";
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <React.Suspense fallback={<div className="min-h-dvh bg-canvas" />}>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/*" element={<AuthGate />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </LanguageProvider>
  </React.StrictMode>,
);
