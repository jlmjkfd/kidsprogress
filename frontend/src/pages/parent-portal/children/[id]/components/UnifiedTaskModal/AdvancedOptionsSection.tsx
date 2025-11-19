/**
 * AdvancedOptionsSection - Recurrence, blocking, and interruption settings
 */
import { useTranslation } from "react-i18next";
import { IconChevronDown, IconChevronUp, IconRepeat, IconLock } from "@tabler/icons-react";
import { RecurrencePicker } from "@/components/RecurrencePicker";

interface AdvancedOptionsSectionProps {
  showAdvanced: boolean;
  isRecurring: boolean;
  recurrencePattern: string;
  blocksOtherTasks: boolean;
  canBeInterrupted: boolean;
  canBeSplit: boolean;
  minSessionDuration: number | null;
  isInformational: boolean;
  onToggleAdvanced: () => void;
  onIsRecurringChange: (value: boolean) => void;
  onRecurrencePatternChange: (pattern: string) => void;
  onBlocksOtherTasksChange: (value: boolean) => void;
  onCanBeInterruptedChange: (value: boolean) => void;
  onCanBeSplitChange: (value: boolean) => void;
  onMinSessionDurationChange: (duration: number | null) => void;
}

export function AdvancedOptionsSection({
  showAdvanced,
  isRecurring,
  recurrencePattern,
  blocksOtherTasks,
  canBeInterrupted,
  canBeSplit,
  minSessionDuration,
  isInformational,
  onToggleAdvanced,
  onIsRecurringChange,
  onRecurrencePatternChange,
  onBlocksOtherTasksChange,
  onCanBeInterruptedChange,
  onCanBeSplitChange,
  onMinSessionDurationChange,
}: AdvancedOptionsSectionProps) {
  const { t } = useTranslation(["tasks"]);

  return (
    <div className="border-t pt-6">
      <button
        type="button"
        onClick={onToggleAdvanced}
        className="flex items-center gap-2 font-medium text-blue-600 hover:text-blue-700"
      >
        {showAdvanced ? (
          <IconChevronUp size={20} />
        ) : (
          <IconChevronDown size={20} />
        )}
        {t("tasks:unified_model.advanced_options")}
      </button>

      {showAdvanced && (
        <div className="mt-4 space-y-4">
          {/* Recurrence */}
          <div className="space-y-3 rounded-lg bg-gray-50 p-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => onIsRecurringChange(e.target.checked)}
                className="h-4 w-4"
              />
              <IconRepeat size={18} />
              <span className="font-medium">
                {t("tasks:unified_model.recurring")}
              </span>
            </label>
            {isRecurring && (
              <RecurrencePicker
                value={recurrencePattern}
                onChange={onRecurrencePatternChange}
              />
            )}
          </div>

          {/* Blocking & Interruption */}
          <div className="space-y-3 rounded-lg bg-gray-50 p-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={blocksOtherTasks}
                onChange={(e) => onBlocksOtherTasksChange(e.target.checked)}
                disabled={isInformational}
                className="h-4 w-4 disabled:opacity-50"
              />
              <IconLock
                size={18}
                className={isInformational ? "text-gray-400" : ""}
              />
              <span
                className={`font-medium ${isInformational ? "text-gray-400" : ""}`}
              >
                {t("tasks:unified_model.blocks_other_tasks")}
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={canBeInterrupted}
                onChange={(e) => onCanBeInterruptedChange(e.target.checked)}
                disabled={isInformational}
                className="h-4 w-4 disabled:opacity-50"
              />
              <span
                className={`font-medium ${isInformational ? "text-gray-400" : ""}`}
              >
                {t("tasks:unified_model.can_be_interrupted")}
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={canBeSplit}
                onChange={(e) => onCanBeSplitChange(e.target.checked)}
                disabled={isInformational}
                className="h-4 w-4 disabled:opacity-50"
              />
              <span
                className={`font-medium ${isInformational ? "text-gray-400" : ""}`}
              >
                {t("tasks:unified_model.can_be_split")}
              </span>
            </label>

            {canBeSplit && !isInformational && (
              <div>
                <label className="mb-2 block text-sm text-gray-600">
                  {t("tasks:unified_model.min_session_duration")}
                </label>
                <input
                  type="number"
                  min="1"
                  value={minSessionDuration || ""}
                  onChange={(e) =>
                    onMinSessionDurationChange(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  placeholder={t("tasks:unified_model.minutes")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
