/**
 * SchedulingSection - Scheduling type, date, time fields, and duration
 */
import { useTranslation } from "react-i18next";
import {
  IconCalendar,
  IconLock,
  IconTargetArrow,
  IconPool,
  IconClock,
} from "@tabler/icons-react";
import { SchedulingType, DeadlineType } from "@/types/task";
import { TaskSchedulingTimeFields } from "./TaskSchedulingTimeFields";

interface SchedulingSectionProps {
  schedulingType: SchedulingType;
  scheduledDate: string;
  estimatedDuration: number | null;
  isInformational: boolean;
  timeFieldsData: {
    fixed_start: string;
    fixed_end: string;
    window_start: string;
    window_end: string;
    window_priority: number;
    deadline: string;
    deadline_time: string;
    deadline_type: DeadlineType;
    preferred_start: string;
    preferred_end: string;
    pool_max_times: number | null;
    pool_max_duration: number | null;
    pool_cooldown: number | null;
  };
  onSchedulingTypeChange: (type: SchedulingType) => void;
  onScheduledDateChange: (date: string) => void;
  onTimeFieldsChange: (updates: Partial<typeof timeFieldsData>) => void;
  onEstimatedDurationChange: (duration: number | null) => void;
}

export function SchedulingSection({
  schedulingType,
  scheduledDate,
  estimatedDuration,
  isInformational,
  timeFieldsData,
  onSchedulingTypeChange,
  onScheduledDateChange,
  onTimeFieldsChange,
  onEstimatedDurationChange,
}: SchedulingSectionProps) {
  const { t } = useTranslation(["tasks"]);

  const schedulingTypes = [
    {
      value: SchedulingType.FLEXIBLE,
      icon: IconTargetArrow,
      label: t("tasks:unified_model.flexible"),
    },
    {
      value: SchedulingType.FIXED_TIME,
      icon: IconLock,
      label: t("tasks:unified_model.fixed_time"),
    },
    {
      value: SchedulingType.TIME_WINDOW,
      icon: IconClock,
      label: t("tasks:unified_model.time_window"),
    },
    {
      value: SchedulingType.DEADLINE,
      icon: IconTargetArrow,
      label: t("tasks:unified_model.deadline"),
    },
    {
      value: SchedulingType.POOL,
      icon: IconPool,
      label: t("tasks:unified_model.pool"),
    },
  ];

  return (
    <div className="space-y-4 border-t pt-6">
      <h3 className="text-lg font-semibold text-gray-900">
        <IconCalendar className="mr-2 inline" size={20} />
        {t("tasks:unified_model.scheduling")}
      </h3>

      {/* Scheduling Type */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {t("tasks:unified_model.scheduling_type")}{" "}
          <span className="text-red-500">*</span>
        </label>
        {isInformational && (
          <p className="mb-2 text-xs text-blue-600">
            {t("tasks:informational_requires_fixed_time")}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {schedulingTypes.map(({ value, icon: Icon, label }) => {
            const isDisabled =
              isInformational && value !== SchedulingType.FIXED_TIME;
            return (
              <button
                key={value}
                type="button"
                onClick={() => !isDisabled && onSchedulingTypeChange(value)}
                disabled={isDisabled}
                className={`rounded-lg border-2 px-3 py-2 transition-all ${
                  schedulingType === value
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : isDisabled
                    ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <Icon size={20} className="mx-auto mb-1" />
                <div className="text-xs">{label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scheduled Date */}
      <div>
        <label
          htmlFor="scheduled_date"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          {t("tasks:scheduled_date")}
        </label>
        <input
          type="date"
          id="scheduled_date"
          value={scheduledDate}
          onChange={(e) => onScheduledDateChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>

      {/* Time Fields (dynamic based on scheduling type) */}
      <TaskSchedulingTimeFields
        schedulingType={schedulingType}
        formData={timeFieldsData}
        onFormChange={onTimeFieldsChange}
      />

      {/* Estimated Duration - hidden for informational tasks */}
      {!isInformational && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {t("tasks:unified_model.estimated_duration")}
          </label>
          <input
            type="number"
            min="1"
            value={estimatedDuration || ""}
            onChange={(e) =>
              onEstimatedDurationChange(
                e.target.value ? parseInt(e.target.value) : null
              )
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder={t("tasks:unified_model.minutes")}
          />
        </div>
      )}
    </div>
  );
}
