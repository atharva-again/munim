import { useI18n } from "./i18n";
import type { PreferredLanguage } from "@munim/contracts";
const choices = [
  { value: "hi", label: "हिन्दी", description: "Hindi" },
  { value: "en", label: "English", description: "English" },
] satisfies { value: PreferredLanguage; label: string; description: string }[];
export function LanguagePicker({
  value,
  onChange,
  disabled,
}: {
  value: PreferredLanguage | null;
  onChange: (language: PreferredLanguage) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();

  return (
    <fieldset
      disabled={disabled}
      className="grid gap-3 disabled:opacity-100 sm:grid-cols-2"
    >
      <legend className="sr-only">{t("Preferred Language")}</legend>
      {choices.map((choice) => (
        <label
          key={choice.value}
          className={`flex items-start gap-3 rounded-lg border p-4 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-soft"} ${value === choice.value ? "border-fg bg-soft" : "border-line"}`}
        >
          <input
            type="radio"
            name="preferred-language"
            value={choice.value}
            checked={value === choice.value}
            onChange={() => onChange(choice.value)}
            className="mt-0.5 size-4 accent-fg enabled:cursor-pointer"
          />
          <span>
            <span className="block text-sm">{choice.label}</span>
            {t(choice.description) !== choice.label && (
              <span className="mt-2 block text-[11px] text-muted">
                {t(choice.description)}
              </span>
            )}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
