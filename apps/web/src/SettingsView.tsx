import { localizedError } from "./translations";
import { useI18n } from "./i18n";
import { useState } from "react";
import { Check, Moon } from "lucide-react";
import {
  greetingFor,
  languageLabels,
  type SavedPreferences,
} from "@munim/contracts";
import { ApprovalModePicker } from "./ApprovalModePicker";
import { LanguagePicker } from "./LanguagePicker";
import { inputClass, panelClass, primaryClass } from "./ui";
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
  const { t } = useI18n();

  const [selected, setSelected] = useState(preferences),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const dirty =
    selected.shopName.trim() !== preferences.shopName ||
    selected.language !== preferences.language ||
    selected.approvalMode !== preferences.approvalMode;
  const change = (patch: Partial<SavedPreferences>) => {
    setSelected((value) => ({ ...value, ...patch }));
    setSaved(false);
    setError("");
  };
  return (
    <section className="grid w-full max-w-220 gap-5">
      <h1 className="sr-only">{t("Settings")}</h1>
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
                : t("Could not save your preferences."),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <section className={`${panelClass} p-5 sm:p-7`}>
          <label htmlFor="settings-shop-name" className="block text-base">{t("Shop Name")}</label>
          <p className="mt-2 text-xs leading-6 text-muted">{t("The name shown on your dashboard and in navigation.")}</p>
          <input id="settings-shop-name" className={`${inputClass} mt-5`} value={selected.shopName} maxLength={80} required disabled={busy} onChange={(event) => change({shopName:event.target.value})} />
        </section>
        <section className={`${panelClass} p-5 sm:p-7`}>
          <h2 className="text-base">{t("Language")}</h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            {t(
              "Use this language for the app and Munim’s replies. You can still speak Hindi, English, or both.",
            )}
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
              {t("Opening Greeting ·")}
              {t(languageLabels[selected.language])}
            </p>
            <p
              lang={selected.language === "en" ? "en" : "hi"}
              className="mt-2 text-sm leading-6"
            >
              {greetingFor(selected.language)}
            </p>
          </div>
          <p className="mt-3 text-[11px] text-muted">
            {t("Reconnect voice to hear the new greeting.")}
          </p>
        </section>
        <section className={`${panelClass} p-5 sm:p-7`}>
          <h2 className="text-base">{t("Saving Preference")}</h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            {t("Choose how much Munim handles for you.")}
          </p>
          <div className="mt-5">
            <ApprovalModePicker
              value={selected.approvalMode}
              disabled={busy}
              onChange={(approvalMode) => change({ approvalMode })}
            />
          </div>
          <p className="mt-4 text-[11px] leading-5 text-muted">
            {t(
              "Applies to your next entry. Changing this setting does not save an existing draft.",
            )}
          </p>
        </section>
        <div>
          <button
            type="submit"
            className={primaryClass}
            disabled={busy || !dirty || !selected.shopName.trim()}
          >
            {busy ? t("Saving…") : t("Save Changes")}
          </button>
          {saved && (
            <p className="mt-4 flex items-center gap-2 text-xs" role="status">
              <Check size={14} className="text-status-green" />
              {t("Preferences saved.")}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 text-xs text-status-red">
              {localizedError(error)}
            </p>
          )}
        </div>
      </form>
      <section className={`${panelClass} p-5 md:hidden`}>
        <h2 className="text-base">{t("Appearance")}</h2>
        <button
          type="button"
          role="switch"
          aria-checked={darkMode}
          aria-label={t("Dark Mode")}
          onClick={onToggleTheme}
          className="mt-4 flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-sm hover:bg-soft"
        >
          <Moon size={18} strokeWidth={1.6} />
          {t("Dark Mode")}
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
