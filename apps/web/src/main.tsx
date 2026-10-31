import React from "react";
import ReactDOM from "react-dom/client";
import { LanguageProvider } from "./i18n";
import AuthGate from "./AuthGate";
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
      <AuthGate />
    </LanguageProvider>
  </React.StrictMode>,
);
