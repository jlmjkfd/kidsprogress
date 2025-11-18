/**
 * DayDetailModal - Shows detailed task list for a specific day
 * Supports filtering by task type and hiding breaks
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  IconX,
  IconCircle,
  IconCheck,
  IconPlayerPlay,
  IconPlayerPause,
  IconClock,
  IconAlertCircle,
  IconFilter,
} from "@tabler/icons-react";
import { Task, TaskStatus, ObligationLevel, SchedulingType } from "@/types/task";
import { DayType } from "@/types/schoolCalendar";

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string; // YYYY-MM-DD
  tasks: Task[];
  dayType?: DayType;
  onTaskClick?: (task: Task) => void;
  editable?: boolean;
}

type FilterType = "all" | "actionable" | "informational" | "completed";

export function DayDetailModal({
  isOpen,
  onClose,
  date,
  tasks,
  dayType,
  onTaskClick,
  editable = true,
}: DayDetailModalProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [hideBreaks, setHideBreaks] = useState(false);

  if (!isOpen) return null;

  // Check if task is informational (blocking, no actions)
  const isInformationalTask = (task: Task): boolean => {
    return task.blocks_other_tasks && task.scheduling_type === SchedulingType.FIXED_TIME;
  };

  // Check if task is a break
  const isBreakTask = (task: Task): boolean => {
    return task.title.toLowerCase().includes("break") ||
           task.title.toLowerCase().includes("rest") ||
           task.title.toLowerCase().includes("休息");
  };

  const dateObj = new Date(date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = dateObj.getTime() === today.getTime();
  const isPast = dateObj < today;

  const formattedDate = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getStatusBadgeColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return "bg-green-500";
      case TaskStatus.IN_PROGRESS:
        return "bg-blue-500";
      case TaskStatus.PAUSED:
        return "bg-yellow-500";
      case TaskStatus.CANCELLED:
        return "bg-gray-400";
      default:
        return "bg-gray-300";
    }
  };

  const getObligationBadge = (level: ObligationLevel) => {
    switch (level) {
      case ObligationLevel.MUST_DO:
        return (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            {t("tasks:unified_model.must_do")}
          </span>
        );
      case ObligationLevel.SHOULD_DO:
        return (
          <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
            {t("tasks:unified_model.should_do")}
          </span>
        );
      default:
        return (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {t("tasks:unified_model.optional")}
          </span>
        );
    }
  };

  const getDayTypeBadge = (type: DayType) => {
    switch (type) {
      case "school_day":
        return (
          <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
            {t("tasks:school_calendar.school_day")}
          </span>
        );
      case "holiday":
        return (
          <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
            {t("tasks:school_calendar.holiday")}
          </span>
        );
      case "special_school_day":
        return (
          <span className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
            {t("tasks:school_calendar.special_school_day")}
          </span>
        );
      default:
        return (
          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
            {t("tasks:school_calendar.weekend")}
          </span>
        );
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return <IconCheck size={16} className="text-green-600" />;
      case TaskStatus.IN_PROGRESS:
        return <IconPlayerPlay size={16} className="text-blue-600" />;
      case TaskStatus.PAUSED:
        return <IconPlayerPause size={16} className="text-yellow-600" />;
      default:
        return <IconCircle size={12} className={getStatusBadgeColor(status)} />;
    }
  };

  // Apply filters
  let filteredTasks = tasks;

  // Filter by type
  if (filter !== "all") {
    filteredTasks = filteredTasks.filter((task) => {
      if (filter === "actionable") {
        return !isInformationalTask(task) && task.status !== TaskStatus.COMPLETED;
      } else if (filter === "informational") {
        return isInformationalTask(task);
      } else if (filter === "completed") {
        return task.status === TaskStatus.COMPLETED;
      }
      return true;
    });
  }

  // Hide breaks if enabled
  if (hideBreaks) {
    filteredTasks = filteredTasks.filter(task => !isBreakTask(task));
  }

  // Separate overdue tasks (past tasks not completed)
  const overdueTasks = isPast
    ? filteredTasks.filter((t) => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED)
    : [];
  const regularTasks = isPast
    ? filteredTasks.filter((t) => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELLED)
    : filteredTasks;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="border-b bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">{formattedDate}</h2>
              <div className="mt-1 flex items-center gap-2">
                {isToday && (
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {t("common:today")}
                  </span>
                )}
                {isPast && (
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {t("common:past")}
                  </span>
                )}
                {dayType && getDayTypeBadge(dayType)}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-colors hover:bg-gray-200"
              aria-label={t("common:close")}
            >
              <IconX size={20} />
            </button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-gray-700">
              <IconFilter size={16} />
              <span>{t("common:filter")}:</span>
            </div>
            <button
              onClick={() => setFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {t("common:all")} ({tasks.length})
            </button>
            <button
              onClick={() => setFilter("actionable")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === "actionable"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {t("tasks:actionable")} ({tasks.filter(t => !isInformationalTask(t) && t.status !== TaskStatus.COMPLETED).length})
            </button>
            <button
              onClick={() => setFilter("informational")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === "informational"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {t("tasks:informational")} ({tasks.filter(isInformationalTask).length})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === "completed"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {t("tasks:completed")} ({tasks.filter(t => t.status === TaskStatus.COMPLETED).length})
            </button>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={hideBreaks}
                onChange={(e) => setHideBreaks(e.target.checked)}
                className="rounded"
              />
              {t("tasks:hide_breaks")}
            </label>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-180px)] overflow-y-auto p-4">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              {filter !== "all" || hideBreaks
                ? t("tasks:no_matching_tasks")
                : t("tasks:no_tasks_for_day")}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Overdue tasks section (only for past days) */}
              {overdueTasks.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <IconAlertCircle size={18} className="text-red-600" />
                    <h3 className="font-semibold text-red-700">
                      {t("tasks:overdue_tasks")} ({overdueTasks.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {overdueTasks.map((task) => (
                      <button
                        key={task._id}
                        onClick={() => editable && onTaskClick?.(task)}
                        disabled={!editable}
                        className={`w-full rounded-lg border-2 border-red-200 bg-red-50 p-3 text-left transition-colors ${
                          editable ? "cursor-pointer hover:bg-red-100" : "cursor-default"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(task.status)}
                              <span className="font-medium text-gray-900">{task.title}</span>
                            </div>
                            {task.description && (
                              <p className="mt-1 text-sm text-gray-600">{task.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {getObligationBadge(task.obligation_level)}
                              {task.estimated_duration_minutes && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <IconClock size={14} />
                                  {task.estimated_duration_minutes} {t("common:minutes")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Regular tasks section */}
              {regularTasks.length > 0 && (
                <div>
                  {overdueTasks.length > 0 && (
                    <h3 className="mb-2 font-semibold text-gray-700">
                      {isPast ? t("tasks:completed_tasks") : t("tasks:all_tasks")} (
                      {regularTasks.length})
                    </h3>
                  )}
                  <div className="space-y-2">
                    {regularTasks.map((task) => (
                      <button
                        key={task._id}
                        onClick={() => editable && onTaskClick?.(task)}
                        disabled={!editable}
                        className={`w-full rounded-lg border bg-white p-3 text-left transition-colors ${
                          task.status === TaskStatus.COMPLETED
                            ? "border-green-200 bg-green-50"
                            : "border-gray-200 hover:bg-gray-50"
                        } ${editable ? "cursor-pointer" : "cursor-default"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(task.status)}
                              <span
                                className={`font-medium ${
                                  task.status === TaskStatus.COMPLETED
                                    ? "text-gray-600 line-through"
                                    : "text-gray-900"
                                }`}
                              >
                                {task.title}
                              </span>
                            </div>
                            {task.description && (
                              <p className="mt-1 text-sm text-gray-600">{task.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {getObligationBadge(task.obligation_level)}
                              {task.estimated_duration_minutes && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <IconClock size={14} />
                                  {task.estimated_duration_minutes} {t("common:minutes")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              {t("common:total")}: {tasks.length} {t("common:tasks")}
            </div>
            <div className="flex gap-4">
              <span>
                {t("common:completed")}:{" "}
                {tasks.filter((t) => t.status === TaskStatus.COMPLETED).length}
              </span>
              {overdueTasks.length > 0 && (
                <span className="text-red-600">
                  {t("tasks:overdue")}: {overdueTasks.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
