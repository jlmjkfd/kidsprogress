/**
 * Overdue Task Card Component
 * Displays a single overdue task (one-off or recurring) with appropriate actions
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  IconChevronDown,
  IconChevronUp,
  IconCheck,
  IconArrowRight,
  IconChartBar,
  IconList,
  IconRepeat,
  IconCalendar,
} from "@tabler/icons-react";
import { OverdueTask } from "@/types/task";

interface OverdueTaskCardProps {
  task: OverdueTask;
  onMarkDone?: (taskId: string) => void;
  onMarkAllDone?: (sourceId: string) => void;
}

export function OverdueTaskCard({ task, onMarkDone, onMarkAllDone }: OverdueTaskCardProps) {
  const { t } = useTranslation(["tasks"]);
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleOpenTask = () => {
    navigate(`/child-portal/tasks/${task.task_id}/execute`);
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
    const daysText = task.days_overdue === 1
      ? t("tasks:overdue_view.days_ago", { count: task.days_overdue })
      : t("tasks:overdue_view.days_ago_plural", { count: task.days_overdue });

    return (
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <IconCalendar size={18} className="text-gray-500" />
              <h3 className="text-lg font-bold text-gray-900 sm:text-xl">{task.title}</h3>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span>{t("tasks:overdue_view.scheduled_for")} {task.scheduled_date}</span>
              <span className="text-orange-600 font-semibold">({daysText})</span>
            </div>

            {task.completion_type === "with_criteria" && (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-gray-600">
                {renderCriteriaIcons()}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {task.completion_type === "simple" ? (
              <button
                onClick={handleMarkDone}
                className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700 sm:px-6 sm:text-base"
              >
                <IconCheck size={20} />
                <span className="hidden sm:inline">{t("tasks:overdue_view.mark_done")}</span>
              </button>
            ) : (
              <button
                onClick={handleOpenTask}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 sm:px-6 sm:text-base"
              >
                <IconArrowRight size={20} />
                <span className="hidden sm:inline">{t("tasks:overdue_view.open_task")}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Recurring task rendering
  const missedText = task.total_missed_days === 1
    ? t("tasks:overdue_view.missed_days", { count: task.total_missed_days })
    : t("tasks:overdue_view.missed_days_plural", { count: task.total_missed_days });

  return (
    <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-white to-orange-50 p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <IconRepeat size={18} className="text-orange-600" />
            <h3 className="text-lg font-bold text-gray-900 sm:text-xl">{task.title}</h3>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
              {t("tasks:overdue_view.recurring_task")}
            </span>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-orange-700">
              {missedText}
            </span>
            <span className="text-gray-600">
              ({t("tasks:overdue_view.date_range", {
                start: task.missed_date_range.start,
                end: task.missed_date_range.end,
              })})
            </span>
          </div>

          {task.completion_type === "with_criteria" && (
            <div className="mb-3 flex flex-wrap items-center gap-3 text-gray-600">
              {renderCriteriaIcons()}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 rounded-xl bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700 transition-colors hover:bg-orange-200 sm:px-6"
          >
            {isExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
            <span className="hidden sm:inline">
              {isExpanded ? t("tasks:overdue_view.hide_details") : t("tasks:overdue_view.view_details")}
            </span>
          </button>

          {task.completion_type === "simple" && onMarkAllDone && (
            <button
              onClick={() => onMarkAllDone(task.source_id)}
              className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700 sm:px-6"
            >
              <IconCheck size={20} />
              <span className="hidden sm:inline">{t("tasks:overdue_view.mark_all_done")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-4 space-y-2 border-t border-orange-200 pt-4">
          <p className="text-sm font-semibold text-gray-700">
            {t("tasks:overdue_view.recent_missed_dates")}:
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {task.recent_missed_dates.map((date) => (
              <div
                key={date}
                className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
              >
                <span className="text-sm text-gray-700">{date}</span>
                {task.completion_type === "simple" ? (
                  <button
                    onClick={() => onMarkDone && onMarkDone(task.task_id)}
                    className="rounded-lg bg-green-100 p-1 text-green-700 transition-colors hover:bg-green-200"
                  >
                    <IconCheck size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleOpenTask}
                    className="rounded-lg bg-blue-100 p-1 text-blue-700 transition-colors hover:bg-blue-200"
                  >
                    <IconArrowRight size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {task.older_count > 0 && (
            <div className="mt-3 rounded-lg bg-gray-100 p-3 text-sm text-gray-600">
              {t("tasks:overdue_view.older_days_plural", { count: task.older_count })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
