import { useI18n } from "./i18n";
import type { PreferredLanguage } from "@munim/contracts";
const choices = [
  { value: "hi", label: "हिन्दी" },
  { value: "en", label: "English" },
] satisfies { value: PreferredLanguage; label: string }[];
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
          className={`flex items-center gap-3 rounded-lg border p-4 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-soft"} ${value === choice.value ? "border-fg bg-soft" : "border-line"}`}
        >
          <input
            type="radio"
            name="preferred-language"
            value={choice.value}
            checked={value === choice.value}
            onChange={() => onChange(choice.value)}
            className="size-4 accent-fg enabled:cursor-pointer"
          />
          <span className="text-sm">{choice.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
