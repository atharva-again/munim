import { useState } from "react";
import { Check, Moon } from "lucide-react";
import {
  greetingFor,
  languageLabels,
  type PreferredLanguage,
} from "@munim/contracts";
import { LanguagePicker } from "./LanguagePicker";
import { panelClass, primaryClass } from "./ui";
export default function SettingsView({
  language,
  onSave,
  darkMode,
  onToggleTheme,
}: {
  language: PreferredLanguage;
  onSave: (language: PreferredLanguage) => Promise<void>;
  darkMode: boolean;
  onToggleTheme: () => void;
}) {
  const [selected, setSelected] = useState(language),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  return (
    <section className="grid w-full max-w-220 gap-5">
      <h1 className="sr-only">Settings</h1>
      <div className={`${panelClass} p-5 sm:p-7`}>
        <h2 className="text-base">Conversation Language</h2>
        <p className="mt-2 text-xs leading-6 text-muted">
          Your greeting and default replies use this language. Speech
          recognition still accepts Hindi, English, and Hinglish.
        </p>
        <div className="mt-6">
          <LanguagePicker
            value={selected}
            disabled={busy}
            onChange={(value) => {
              setSelected(value);
              setSaved(false);
              setError("");
            }}
          />
        </div>
        <div className="mt-5 rounded-lg bg-soft p-4">
          <p className="text-[10px] text-muted">
            Opening Greeting · {languageLabels[selected]}
          </p>
          <p
            lang={selected === "en" ? "en" : "hi"}
            className="mt-2 text-sm leading-6"
          >
            {greetingFor(selected)}
          </p>
        </div>
        <p className="mt-3 text-[11px] text-muted">
          Changes apply when you reconnect your voice conversation.
        </p>
        <button
          type="button"
          className={`${primaryClass} mt-6`}
          disabled={busy || selected === language}
          onClick={async () => {
            setBusy(true);
            setError("");
            setSaved(false);
            try {
              await onSave(selected);
              setSaved(true);
            } catch (caught) {
              setError(
                caught instanceof Error
                  ? caught.message
                  : "Could not save your preference.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : "Save Changes"}
        </button>
        {saved && (
          <p className="mt-4 flex items-center gap-2 text-xs" role="status">
            <Check size={14} className="text-status-green" />
            Language preference saved.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-xs text-status-red">
            {error}
          </p>
        )}
      </div>
      <div className={`${panelClass} p-5 md:hidden`}>
        <h2 className="text-base">Appearance</h2>
        <button
          type="button"
          role="switch"
          aria-checked={darkMode}
          aria-label="Dark Mode"
          onClick={onToggleTheme}
          className="mt-4 flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-sm hover:bg-soft"
        >
          <Moon size={18} strokeWidth={1.6} />
          Dark Mode
          <span
            aria-hidden="true"
            className={`ml-auto flex h-5 w-9 items-center rounded-full border p-0.5 ${darkMode ? "border-fg bg-fg" : "border-line bg-canvas"}`}
          >
            <span
              className={`size-3.5 rounded-full ${darkMode ? "translate-x-3.5 bg-canvas" : "bg-fg"}`}
            />
          </span>
        </button>
      </div>
    </section>
  );
}
