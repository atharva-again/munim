import { useI18n } from "./i18n";
import type { ApprovalMode } from "@munim/contracts";
const choices = [
  {
    value: "approval",
    label: "Ask for Approval",
    description: "Check each entry and confirm before Munim saves it.",
  },
  {
    value: "autonomous",
    label: "Full Autonomy",
    description:
      "Save complete new voice and text entries immediately, without a review. Ask only when details are missing.",
  },
] satisfies { value: ApprovalMode; label: string; description: string }[];
export function ApprovalModePicker({
  value,
  onChange,
  disabled,
}: {
  value: ApprovalMode | null;
  onChange: (value: ApprovalMode) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();

  return (
    <fieldset
      disabled={disabled}
      className="grid gap-3 disabled:opacity-100 sm:grid-cols-2"
    >
      <legend className="sr-only">{t("Saving Preference")}</legend>
      {choices.map((choice) => (
        <label
          key={choice.value}
          className={`flex items-start gap-3 rounded-lg border p-4 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-soft"} ${value === choice.value ? "border-fg bg-soft" : "border-line"}`}
        >
          <input
            type="radio"
            name="approval-mode"
            value={choice.value}
            checked={value === choice.value}
            onChange={() => onChange(choice.value)}
            className="mt-0.5 size-4 shrink-0 accent-fg enabled:cursor-pointer"
          />
          <span>
            <span className="block text-sm">{t(choice.label)}</span>
            <span className="mt-2 block text-[11px] leading-5 text-muted">
              {t(choice.description)}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
