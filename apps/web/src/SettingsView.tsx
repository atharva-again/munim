import { useState } from "react";
import { Check, Moon } from "lucide-react";
import {
  greetingFor,
  languageLabels,
  type SavedPreferences,
} from "@munim/contracts";
import { ApprovalModePicker } from "./ApprovalModePicker";
import { LanguagePicker } from "./LanguagePicker";
import { panelClass, primaryClass } from "./ui";
export default function SettingsView({
  preferences,
  onSave,
  darkMode,
  onToggleTheme,
}: {
  preferences: SavedPreferences;
  onSave: (preferences: SavedPreferences) => Promise<void>;
  darkMode: boolean;
  onToggleTheme: () => void;
}) {
  const [selected, setSelected] = useState(preferences),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const dirty =
    selected.language !== preferences.language ||
    selected.approvalMode !== preferences.approvalMode;
  const change = (patch: Partial<SavedPreferences>) => {
    setSelected((value) => ({ ...value, ...patch }));
    setSaved(false);
    setError("");
  };
  return (
    <section className="grid w-full max-w-220 gap-5">
      <h1 className="sr-only">Settings</h1>
      <form
        className="grid gap-5"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!dirty || busy) return;
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
                : "Could not save your preferences.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <section className={`${panelClass} p-5 sm:p-7`}>
          <h2 className="text-base">Conversation Language</h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            Your greeting and default replies use this language. You can still
            speak Hindi, English, or Hinglish.
          </p>
          <div className="mt-6">
            <LanguagePicker
              value={selected.language}
              disabled={busy}
              onChange={(language) => change({ language })}
            />
          </div>
          <div className="mt-5 rounded-lg bg-soft p-4">
            <p className="text-[10px] text-muted">
              Opening Greeting · {languageLabels[selected.language]}
            </p>
            <p
              lang={selected.language === "en" ? "en" : "hi"}
              className="mt-2 text-sm leading-6"
            >
              {greetingFor(selected.language)}
            </p>
          </div>
          <p className="mt-3 text-[11px] text-muted">
            Reconnect voice to hear the new greeting.
          </p>
        </section>
        <section className={`${panelClass} p-5 sm:p-7`}>
          <h2 className="text-base">Saving Preference</h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            Choose how much Munim handles for you.
          </p>
          <div className="mt-5">
            <ApprovalModePicker
              value={selected.approvalMode}
              disabled={busy}
              onChange={(approvalMode) => change({ approvalMode })}
            />
          </div>
          <p className="mt-4 text-[11px] leading-5 text-muted">
            Applies to your next entry or submission. Changing this setting does
            not save an existing draft. The form always waits for you to submit.
          </p>
        </section>
        <div>
          <button
            type="submit"
            className={primaryClass}
            disabled={busy || !dirty}
          >
            {busy ? "Saving…" : "Save Changes"}
          </button>
          {saved && (
            <p className="mt-4 flex items-center gap-2 text-xs" role="status">
              <Check size={14} className="text-status-green" />
              Preferences saved.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 text-xs text-status-red">
              {error}
            </p>
          )}
        </div>
      </form>
      <section className={`${panelClass} p-5 md:hidden`}>
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
      </section>
    </section>
  );
}
