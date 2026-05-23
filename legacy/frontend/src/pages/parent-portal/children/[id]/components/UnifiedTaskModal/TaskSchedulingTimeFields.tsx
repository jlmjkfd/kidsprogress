/**
 * TaskSchedulingTimeFields - Dynamic time fields based on scheduling type
 */
import { useTranslation } from "react-i18next";
import { IconClock } from "@tabler/icons-react";
import { SchedulingType, DeadlineType } from "@/types/task";
import type { TimeFieldsData } from "./SchedulingSection";

interface TaskSchedulingTimeFieldsProps {
  schedulingType: SchedulingType;
  formData: TimeFieldsData;
  onFormChange: (updates: Partial<TimeFieldsData>) => void;
}

export function TaskSchedulingTimeFields({
  schedulingType,
  formData,
  onFormChange,
}: TaskSchedulingTimeFieldsProps) {
  const { t } = useTranslation(["tasks", "common"]);

  switch (schedulingType) {
    case SchedulingType.FIXED_TIME:
      return (
        <div className="grid grid-cols-1 gap-4 rounded-lg bg-blue-50 p-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              <IconClock className="mr-1 inline" size={16} />
              {t("tasks:unified_model.start_time")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.fixed_start}
              onChange={(e) => onFormChange({ fixed_start: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t("tasks:unified_model.end_time")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.fixed_end}
              onChange={(e) => onFormChange({ fixed_end: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </div>
        </div>
      );

    case SchedulingType.TIME_WINDOW:
      return (
        <div className="space-y-4 rounded-lg bg-purple-50 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("tasks:unified_model.window_start")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.window_start}
                onChange={(e) => onFormChange({ window_start: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("tasks:unified_model.window_end")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.window_end}
                onChange={(e) => onFormChange({ window_end: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t("tasks:unified_model.window_priority")} ({formData.window_priority})
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={formData.window_priority}
              onChange={(e) =>
                onFormChange({ window_priority: parseInt(e.target.value) })
              }
              className="w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>{t("common:flexible")}</span>
              <span>{t("common:important")}</span>
            </div>
          </div>
        </div>
      );

    case SchedulingType.DEADLINE:
      return (
        <div className="space-y-4 rounded-lg bg-red-50 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("tasks:unified_model.deadline_date")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => onFormChange({ deadline: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("tasks:unified_model.deadline_time")}
              </label>
              <input
                type="time"
                value={formData.deadline_time}
                onChange={(e) => onFormChange({ deadline_time: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t("tasks:unified_model.deadline_type")}
            </label>
            <select
              value={formData.deadline_type}
              onChange={(e) =>
                onFormChange({ deadline_type: e.target.value as DeadlineType })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value={DeadlineType.SOFT}>
                {t("tasks:unified_model.deadline_soft")}
              </option>
              <option value={DeadlineType.HARD}>
                {t("tasks:unified_model.deadline_hard")}
              </option>
            </select>
          </div>
        </div>
      );

    case SchedulingType.FLEXIBLE:
      return (
        <div className="rounded-lg bg-green-50 p-4">
          <p className="mb-4 text-sm text-gray-600">
            {t("tasks:unified_model.flexible_hint")}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("tasks:unified_model.preferred_start")}
              </label>
              <input
                type="time"
                value={formData.preferred_start}
                onChange={(e) => onFormChange({ preferred_start: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("tasks:unified_model.preferred_end")}
              </label>
              <input
                type="time"
                value={formData.preferred_end}
                onChange={(e) => onFormChange({ preferred_end: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
        </div>
      );

    case SchedulingType.POOL:
      return (
        <div className="space-y-4 rounded-lg bg-yellow-50 p-4">
          <p className="text-sm text-gray-600">{t("tasks:unified_model.pool_hint")}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("tasks:unified_model.pool_max_times")}
              </label>
              <input
                type="number"
                min="1"
                value={formData.pool_max_times || ""}
                onChange={(e) =>
                  onFormChange({
                    pool_max_times: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="No limit"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("tasks:unified_model.pool_max_duration")}
              </label>
              <input
                type="number"
                min="1"
                value={formData.pool_max_duration || ""}
                onChange={(e) =>
                  onFormChange({
                    pool_max_duration: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Minutes"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("tasks:unified_model.pool_cooldown")}
              </label>
              <input
                type="number"
                min="0"
                value={formData.pool_cooldown || ""}
                onChange={(e) =>
                  onFormChange({
                    pool_cooldown: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Minutes"
              />
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
