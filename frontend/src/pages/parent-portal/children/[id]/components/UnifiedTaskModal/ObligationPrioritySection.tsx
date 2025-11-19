/**
 * ObligationPrioritySection - Obligation level and priority boost settings
 */
import { useTranslation } from "react-i18next";
import { ObligationLevel } from "@/types/task";

interface ObligationPrioritySectionProps {
  obligationLevel: ObligationLevel;
  priorityBoost: number;
  isInformational: boolean;
  onObligationLevelChange: (level: ObligationLevel) => void;
  onPriorityBoostChange: (boost: number) => void;
}

export function ObligationPrioritySection({
  obligationLevel,
  priorityBoost,
  isInformational,
  onObligationLevelChange,
  onPriorityBoostChange,
}: ObligationPrioritySectionProps) {
  const { t } = useTranslation(["tasks", "common"]);

  // Hide entire section for informational tasks
  if (isInformational) {
    return null;
  }

  return (
    <div className="space-y-4 border-t pt-6">
      <h3 className="text-lg font-semibold text-gray-900">
        {t("tasks:unified_model.importance")}
      </h3>

      {/* Obligation Level */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {t("tasks:unified_model.obligation_level")}
        </label>
        <select
          value={obligationLevel}
          onChange={(e) => onObligationLevelChange(e.target.value as ObligationLevel)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        >
          <option value={ObligationLevel.MUST_DO}>
            {t("tasks:unified_model.must_do")}
          </option>
          <option value={ObligationLevel.SHOULD_DO}>
            {t("tasks:unified_model.should_do")}
          </option>
          <option value={ObligationLevel.OPTIONAL}>
            {t("tasks:unified_model.optional")}
          </option>
        </select>
      </div>

      {/* Priority Boost */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {t("tasks:unified_model.priority_boost")} (
          {priorityBoost > 0 ? "+" : ""}
          {priorityBoost})
        </label>
        <input
          type="range"
          min="-5"
          max="5"
          value={priorityBoost}
          onChange={(e) => onPriorityBoostChange(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>{t("common:low")}</span>
          <span>{t("common:normal")}</span>
          <span>{t("common:high")}</span>
        </div>
      </div>
    </div>
  );
}
