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

export interface TimeFieldsData {
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
  scheduled_time: string;
  scheduled_datetime: string;
  scheduled_timezone: string;
}

interface SchedulingSectionProps {
  schedulingType: SchedulingType;
  scheduledDate: string;
  estimatedDuration: number | null;
  isInformational: boolean;
  isFloatingTime: boolean;
  timeFieldsData: TimeFieldsData;
  onSchedulingTypeChange: (type: SchedulingType) => void;
  onScheduledDateChange: (date: string) => void;
  onTimeFieldsChange: (updates: Partial<TimeFieldsData>) => void;
  onEstimatedDurationChange: (duration: number | null) => void;
  onFloatingTimeChange: (isFloating: boolean) => void;
}

export function SchedulingSection({
  schedulingType,
  scheduledDate,
  estimatedDuration,
  isInformational,
  isFloatingTime,
  timeFieldsData,
  onSchedulingTypeChange,
  onScheduledDateChange,
  onTimeFieldsChange,
  onEstimatedDurationChange,
  onFloatingTimeChange,
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

      {/* Floating vs Fixed Time Toggle */}
      <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <label className="text-sm font-medium text-gray-900">
          {t("tasks:time_type")}
        </label>
        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              checked={isFloatingTime}
              onChange={() => onFloatingTimeChange(true)}
              className="h-4 w-4 text-blue-600"
            />
            <span className="text-sm">{t("tasks:floating_time")}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              checked={!isFloatingTime}
              onChange={() => onFloatingTimeChange(false)}
              className="h-4 w-4 text-blue-600"
            />
            <span className="text-sm">{t("tasks:fixed_time")}</span>
          </label>
        </div>
        <p className="text-xs text-gray-600">
          {isFloatingTime
            ? t("tasks:floating_time_desc")
            : t("tasks:fixed_time_desc")}
        </p>
      </div>

      {/* Floating Time: Scheduled Time Input */}
      {isFloatingTime && (
        <div>
          <label
            htmlFor="scheduled_time"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            {t("tasks:scheduled_time")} {t("common:optional")}
          </label>
          <input
            type="time"
            id="scheduled_time"
            value={timeFieldsData.scheduled_time}
            onChange={(e) => onTimeFieldsChange({ scheduled_time: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
      )}

      {/* Fixed Time: Datetime + Timezone */}
      {!isFloatingTime && (
        <>
          <div>
            <label
              htmlFor="scheduled_datetime"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              {t("tasks:scheduled_datetime")}
            </label>
            <input
              type="datetime-local"
              id="scheduled_datetime"
              value={timeFieldsData.scheduled_datetime}
              onChange={(e) => onTimeFieldsChange({ scheduled_datetime: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label
              htmlFor="scheduled_timezone"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              {t("tasks:timezone")}
            </label>
            <select
              id="scheduled_timezone"
              value={timeFieldsData.scheduled_timezone}
              onChange={(e) => onTimeFieldsChange({ scheduled_timezone: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="Pacific/Auckland">Pacific/Auckland (NZ)</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
              <option value="Australia/Sydney">Australia/Sydney (AEDT/AEST)</option>
            </select>
          </div>
        </>
      )}

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
