/**
 * CompleteTaskModal - Modal for parent to complete a task with time input
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconX, IconCheck } from "@tabler/icons-react";
import { Task, SchedulingType } from "@/types/task";

interface CompleteTaskModalProps {
  task: Task;
  onClose: () => void;
  onConfirm: (startTime: string, endTime: string) => void;
}

export function CompleteTaskModal({
  task,
  onClose,
  onConfirm,
}: CompleteTaskModalProps) {
  const { t } = useTranslation(["tasks", "common"]);

  // Calculate default times based on scheduling type
  const getDefaultTimes = (): { start: string; end: string } => {
    const now = new Date();
    const estimatedDuration = task.estimated_duration_minutes || 60; // Default 1 hour

    switch (task.scheduling_type) {
      case SchedulingType.FIXED_TIME:
        if (task.fixed_time_slot) {
          return {
            start: task.fixed_time_slot.start,
            end: task.fixed_time_slot.end,
          };
        }
        break;

      case SchedulingType.TIME_WINDOW:
        if (task.preferred_time_window) {
          const startTime = task.preferred_time_window.start;
          const [hours, minutes] = startTime.split(":").map(Number);
          const endDate = new Date();
          endDate.setHours(hours, minutes + estimatedDuration, 0, 0);
          const endTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
          return { start: startTime, end: endTime };
        }
        break;

      case SchedulingType.FLEXIBLE:
      case SchedulingType.DEADLINE:
      case SchedulingType.POOL: {
        // Use current time - estimated duration as start
        const startDate = new Date(now.getTime() - estimatedDuration * 60000);
        const start = `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`;
        const end = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        return { start, end };
      }
    }

    // Fallback: use preferred_time_slot or current time
    if (task.preferred_time_slot) {
      return {
        start: task.preferred_time_slot.start,
        end: task.preferred_time_slot.end,
      };
    }

    // Final fallback: current time - 1 hour to current time
    const startDate = new Date(now.getTime() - estimatedDuration * 60000);
    const start = `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`;
    const end = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return { start, end };
  };

  const defaultTimes = getDefaultTimes();
  const [startTime, setStartTime] = useState(defaultTimes.start);
  const [endTime, setEndTime] = useState(defaultTimes.end);
  const [error, setError] = useState("");

  const handleConfirm = () => {
    // Validate times
    if (!startTime || !endTime) {
      setError(t("tasks:complete_modal.time_required"));
      return;
    }

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (endMinutes <= startMinutes) {
      setError(t("tasks:complete_modal.end_after_start"));
      return;
    }

    onConfirm(startTime, endTime);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {t("tasks:complete_modal.title")}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-gray-100"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-4">
          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            <p className="font-medium">{task.title}</p>
            <p className="mt-1 text-xs text-blue-600">
              {t("tasks:complete_modal.set_actual_time")}
            </p>
          </div>

          {/* Start Time */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t("tasks:complete_modal.start_time")}
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                setError("");
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t("tasks:complete_modal.end_time")}
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value);
                setError("");
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Duration Info */}
          {startTime && endTime && !error && (() => {
            const [startH, startM] = startTime.split(":").map(Number);
            const [endH, endM] = endTime.split(":").map(Number);
            const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
            if (durationMinutes > 0) {
              return (
                <div className="text-sm text-gray-600">
                  {t("tasks:complete_modal.duration")}: {durationMinutes} {t("common:minutes")}
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t p-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {t("common:cancel")}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
          >
            <div className="flex items-center justify-center gap-2">
              <IconCheck size={18} />
              <span>{t("tasks:complete")}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
