/**
 * Overdue Task Card Component
 * Displays a single overdue task (one-off or recurring) with appropriate actions
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import {
  IconChevronDown,
  IconChevronUp,
  IconCheck,
  IconArrowRight,
  IconChartBar,
  IconList,
  IconRepeat,
  IconCalendar,
  IconHistory,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { getTaskDisplayDate } from "@/utils/timezone";
import { OverdueTask } from "@/types/task";

interface OverdueTaskCardProps {
  task: OverdueTask;
  childId: string;
  onMarkDone?: (taskId: string) => void;
  onMarkAllDone?: (sourceId: string) => void;
  onViewAttempts?: (taskId: string, fromOverdueCard: boolean) => void;
  defaultExpanded?: boolean; // Auto-expand this card (e.g., when returning from attempts)
}

export function OverdueTaskCard({
  task,
  childId,
  onMarkDone,
  onMarkAllDone,
  onViewAttempts,
  defaultExpanded = false,
}: OverdueTaskCardProps) {
  const { t } = useTranslation(["tasks"]);
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showAllDates, setShowAllDates] = useState(false);

  // Fetch completion counts by date for this recurring task
  const sourceId = task.is_recurring ? task.source_id : undefined;

  const { data: completionData } = useQuery({
    queryKey: ["completion-counts", sourceId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/completions/by-date/${sourceId}`
      );
      return response.data;
    },
    enabled: !!sourceId && task.is_recurring,
  });

  const dateCounts = completionData?.date_counts || {};
  console.log('[OverdueTaskCard] Completion counts by date:', dateCounts);

  // Fetch materialized tasks for this recurring task to check status
  // Always fetch when it's a recurring task (not only when expanded) so buttons show correct state
  const { data: materializedTasks } = useQuery({
    queryKey: ["materialized-tasks", sourceId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/tasks/child/${childId}/materialized/${sourceId}`
      );
      return response.data;
    },
    enabled: !!sourceId && task.is_recurring,
  });

  // Create a map of date -> task status and progress state
  // Normalize dates to YYYY-MM-DD format for consistent comparison
  const taskStatusByDate: Record<string, string> = {};
  const hasInProgressAttemptByDate: Record<string, boolean> = {};
  if (materializedTasks) {
    for (const t of materializedTasks) {
      const dateStr = getTaskDisplayDate(t);
      if (dateStr) {
        taskStatusByDate[dateStr] = t.status;
        // Check if there's an in-progress attempt (saved progress state with data)
        hasInProgressAttemptByDate[dateStr] = !!(t.progress_state && Object.keys(t.progress_state).length > 0);
      }
    }
  }

  console.log('[OverdueTaskCard] Materialized tasks status map:', taskStatusByDate);
  console.log('[OverdueTaskCard] In-progress attempts by date:', hasInProgressAttemptByDate);

  const handleOpenTask = () => {
    navigate(`/child-portal/${childId}/tasks/execute/${task.task_id}`);
  };

  const handleMarkDone = () => {
    if (task.completion_type === "simple" && onMarkDone) {
      onMarkDone(task.task_id);
    } else {
      handleOpenTask();
    }
  };

  const renderCriteriaIcons = () => {
    const icons = [];
    if (task.has_metrics) {
      icons.push(
        <span key="metrics" className="flex items-center gap-1 text-xs">
          <IconChartBar size={14} />
          {t("tasks:overdue_view.metrics_count", { count: 1 })}
        </span>
      );
    }
    if (task.has_subtasks) {
      icons.push(
        <span key="subtasks" className="flex items-center gap-1 text-xs">
          <IconList size={14} />
          {t("tasks:overdue_view.subtasks_count", { count: 1 })}
        </span>
      );
    }
    return icons;
  };

  // One-off task rendering
  if (!task.is_recurring) {
    const daysText =
      task.days_overdue === 1
        ? t("tasks:overdue_view.days_ago", { count: task.days_overdue })
        : t("tasks:overdue_view.days_ago_plural", { count: task.days_overdue });

    return (
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6">
        {/* Task Title - Full Width */}
        <h3 className="mb-3 text-lg font-bold text-gray-900 sm:text-xl">
          {task.title}
        </h3>

        {/* Task Type Tag and Button Row */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {/* Left: Task Type Tag */}
          <div className="flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1.5">
            <IconCalendar size={16} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              {t("tasks:overdue_view.one_time_task")}
            </span>
          </div>

          {/* Right: Action Button */}
          {task.completion_type === "simple" ? (
            <button
              onClick={handleMarkDone}
              className="flex items-center gap-2 rounded-xl bg-green-600 px-2 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700"
            >
              <IconCheck size={18} />
              <span>{t("tasks:overdue_view.mark_done")}</span>
            </button>
          ) : (
            <button
              onClick={handleOpenTask}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
            >
              <IconArrowRight size={18} />
              <span>{t("tasks:overdue_view.open_task")}</span>
            </button>
          )}
        </div>

        {/* Scheduled Info */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span>
            {t("tasks:overdue_view.scheduled_for")} {task.scheduled_date} {/* Already formatted as YYYY-MM-DD from backend */}
          </span>
          <span className="font-semibold text-orange-600">({daysText})</span>
        </div>

        {/* Criteria Icons */}
        {task.completion_type === "with_criteria" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-gray-600">
            {renderCriteriaIcons()}
          </div>
        )}
      </div>
    );
  }

  // Recurring task rendering
  const missedText =
    task.total_missed_days === 1
      ? t("tasks:overdue_view.missed_days", { count: task.total_missed_days })
      : t("tasks:overdue_view.missed_days_plural", {
          count: task.total_missed_days,
        });

  return (
    <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-white to-orange-50 p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6">
      {/* Task Title - Full Width */}
      <h3 className="mb-3 text-lg font-bold text-gray-900 sm:text-xl">
        {task.title}
      </h3>

      {/* Task Type Tag and View Details Button Row */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Task Type Tag */}
        <div className="flex items-center gap-2 rounded-full bg-orange-100 px-2 py-1.5">
          <IconRepeat size={16} className="text-orange-600" />
          <span className="text-sm font-semibold text-orange-700">
            {t("tasks:overdue_view.recurring_task")}
          </span>
        </div>

        {/* Right: View Details Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 rounded-xl bg-orange-100 px-2 py-2 text-sm font-bold text-orange-700 transition-colors hover:bg-orange-200"
        >
          {isExpanded ? (
            <IconChevronUp size={18} />
          ) : (
            <IconChevronDown size={18} />
          )}
          <span>
            {isExpanded
              ? t("tasks:overdue_view.hide_details")
              : t("tasks:overdue_view.view_details")}
          </span>
        </button>
      </div>

      {/* Missed Info */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-orange-700">{missedText}</span>
        <span className="text-gray-600">
          (
          {t("tasks:overdue_view.date_range", {
            start: task.missed_date_range.start,
            end: task.missed_date_range.end,
          })}
          )
        </span>
      </div>

      {/* Mark All Done Button */}
      {task.completion_type === "simple" && onMarkAllDone && sourceId && (
        <button
          onClick={() => onMarkAllDone(sourceId)}
          className="mb-3 flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700"
        >
          <IconCheck size={18} />
          <span>{t("tasks:overdue_view.mark_all_done")}</span>
        </button>
      )}

      {/* Criteria Icons */}
      {task.completion_type === "with_criteria" && (
        <div className="flex flex-wrap items-center gap-2 text-gray-600">
          {renderCriteriaIcons()}
        </div>
      )}

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-4 space-y-2 border-t border-orange-200 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              {showAllDates
                ? t("tasks:overdue_view.all_missed_dates")
                : t("tasks:overdue_view.recent_missed_dates")}
              :
            </p>
            {task.older_count > 0 && (
              <button
                onClick={() => setShowAllDates(!showAllDates)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {showAllDates
                  ? t("tasks:overdue_view.show_recent")
                  : t("tasks:overdue_view.show_all", {
                      count: task.total_missed_days,
                    })}
              </button>
            )}
          </div>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            }}
          >
            {(showAllDates
              ? task.all_missed_dates
              : task.recent_missed_dates
            ).map((date) => {
              // Construct virtual task ID for this specific date
              const virtualTaskId = `${sourceId}_${date}`;
              const executePath = `/child-portal/${childId}/tasks/execute/${virtualTaskId}`;
              const attemptsPath = `/child-portal/${childId}/tasks/attempts/${virtualTaskId}`;
              const hasCompletions = dateCounts[date] > 0;
              const taskStatus = taskStatusByDate[date];
              const hasInProgressAttempt = hasInProgressAttemptByDate[date] || false;

              console.log(`[OverdueTaskCard] Date ${date}: status=${taskStatus}, hasInProgressAttempt=${hasInProgressAttempt}, hasCompletions=${hasCompletions}`);

              return (
                <div
                  key={`${sourceId}_${date}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white p-2 shadow-sm"
                >
                  <span className="flex-shrink-0 text-sm text-gray-700">
                    {date}
                  </span>
                  <div className="flex items-center gap-1">
                    {hasCompletions && (
                      <button
                        onClick={() => {
                          if (onViewAttempts) {
                            onViewAttempts(virtualTaskId, true);
                          } else {
                            navigate(attemptsPath);
                          }
                        }}
                        className="rounded-lg bg-purple-100 p-1.5 text-purple-700 transition-colors hover:bg-purple-200"
                        title={t("tasks:view_attempts")}
                      >
                        <IconHistory size={16} />
                      </button>
                    )}
                    {task.completion_type === "simple" ? (
                      <button
                        onClick={() => onMarkDone && onMarkDone(virtualTaskId)}
                        className="rounded-lg bg-green-100 p-1.5 text-green-700 transition-colors hover:bg-green-200"
                        title={t("tasks:overdue_view.mark_done")}
                      >
                        <IconCheck size={16} />
                      </button>
                    ) : hasInProgressAttempt ? (
                      <button
                        onClick={() => navigate(executePath)}
                        className="rounded-lg bg-blue-100 p-1.5 text-blue-700 transition-colors hover:bg-blue-200"
                        title={t("tasks:resume")}
                      >
                        <IconPlayerPlay size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(executePath)}
                        className="rounded-lg bg-green-100 p-1.5 text-green-700 transition-colors hover:bg-green-200"
                        title={t("tasks:start")}
                      >
                        <IconPlayerPlay size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
