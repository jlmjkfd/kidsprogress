/**
 * TaskCard - Displays a single task with actions
 */
import { useTranslation } from "react-i18next";
import {
  IconCalendar,
  IconClock,
  IconCheck,
  IconEdit,
  IconTrash,
  IconRepeat,
  IconLock,
  IconAlertCircle,
  IconSchool,
  IconRestore,
  IconX,
  IconCircleX,
} from "@tabler/icons-react";
import { Task, SchedulingType, ObligationLevel } from "@/types/task";

interface TaskCardProps {
  task: Task;
  isOverdue: boolean;
  onComplete?: (task: Task) => void; // Parent complete with time modal
  onUncomplete?: (taskId: string) => void;
  onSkip?: (taskId: string) => void;
  onRestore?: (templateId: string, occurrenceDate: string) => void; // For deleted virtual occurrences
  onRestoreSkipped?: (taskId: string) => void; // For skipped tasks
  onEdit: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

export function TaskCard({
  task,
  isOverdue,
  onComplete,
  onUncomplete,
  onSkip,
  onRestore,
  onRestoreSkipped,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const { t } = useTranslation(["common", "tasks"]);

  // If this is a deleted occurrence, show restore UI
  if (task.is_deleted && task.source_recurring_task_id && task.scheduled_date) {
    const occurrenceDate = task.scheduled_date.split("T")[0];
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 opacity-60">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 line-through">{task.title}</span>
            <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
              {t("tasks:deleted")}
            </span>
          </div>
          {task.fixed_time_slot && (
            <p className="text-sm text-gray-500">
              {task.fixed_time_slot.start} - {task.fixed_time_slot.end}
            </p>
          )}
        </div>
        {onRestore && (
          <button
            onClick={() =>
              onRestore(task.source_recurring_task_id!, occurrenceDate)
            }
            className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700"
            title={t("tasks:restore_occurrence")}
          >
            <IconRestore size={16} />
            <span>{t("common:restore")}</span>
          </button>
        )}
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "in_progress":
        return "bg-blue-100 text-blue-700";
      case "paused":
        return "bg-yellow-100 text-yellow-700";
      case "skipped":
        return "bg-orange-100 text-orange-700";
      case "archived":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getSchedulingTypeBadge = (schedulingType: SchedulingType) => {
    const badges = {
      [SchedulingType.FLEXIBLE]: {
        label: t("tasks:flexible"),
        color: "bg-blue-100 text-blue-700",
      },
      [SchedulingType.FIXED_TIME]: {
        label: t("tasks:fixed_time"),
        color: "bg-purple-100 text-purple-700",
      },
      [SchedulingType.TIME_WINDOW]: {
        label: t("tasks:time_window"),
        color: "bg-cyan-100 text-cyan-700",
      },
      [SchedulingType.DEADLINE]: {
        label: t("tasks:deadline"),
        color: "bg-orange-100 text-orange-700",
      },
      [SchedulingType.POOL]: {
        label: t("tasks:pool"),
        color: "bg-green-100 text-green-700",
      },
    };
    return badges[schedulingType];
  };

  const getObligationBadge = (obligationLevel: ObligationLevel) => {
    const badges = {
      [ObligationLevel.MUST_DO]: {
        label: t("tasks:must_do"),
        color: "bg-red-100 text-red-700",
      },
      [ObligationLevel.SHOULD_DO]: {
        label: t("tasks:should_do"),
        color: "bg-yellow-100 text-yellow-700",
      },
      [ObligationLevel.OPTIONAL]: {
        label: t("tasks:optional"),
        color: "bg-gray-100 text-gray-700",
      },
    };
    return badges[obligationLevel];
  };

  const schedulingBadge = getSchedulingTypeBadge(task.scheduling_type);
  const obligationBadge = getObligationBadge(task.obligation_level);

  return (
    <div
      className={`rounded-lg p-4 shadow transition-shadow hover:shadow-md ${
        isOverdue ? "border-2 border-red-300 bg-red-50" : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Title and badges */}
          <div className="mb-2 flex items-start gap-2">
            <h3 className="flex-1 text-lg font-semibold text-gray-900">
              {task.title}
            </h3>
            <div className="flex flex-shrink-0 flex-wrap gap-2">
              <span
                className={`rounded px-2 py-1 text-xs font-medium ${getStatusColor(task.status)}`}
              >
                {t(`tasks:${task.status}`)}
              </span>
              <span
                className={`rounded px-2 py-1 text-xs font-medium ${schedulingBadge.color}`}
              >
                {schedulingBadge.label}
              </span>
              <span
                className={`rounded px-2 py-1 text-xs font-medium ${obligationBadge.color}`}
              >
                {obligationBadge.label}
              </span>
              {task.is_recurring && (
                <span className="rounded bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                  <IconRepeat className="inline" size={12} />{" "}
                  {t("tasks:recurring")}
                </span>
              )}
              {task.is_informational && (
                <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                  <IconSchool className="inline" size={12} />{" "}
                  {t("tasks:informational")}
                </span>
              )}
              {task.blocks_other_tasks && (
                <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  <IconLock className="inline" size={12} /> {t("tasks:blocks")}
                </span>
              )}
              {isOverdue && (
                <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                  <IconAlertCircle className="inline" size={12} />{" "}
                  {t("tasks:overdue")}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <p className="mb-2 text-sm text-gray-600">{task.description}</p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            {task.scheduled_date && (
              <div className="flex items-center gap-1">
                <IconCalendar size={16} />
                <span>
                  {new Date(task.scheduled_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {task.fixed_time_slot && (
              <div className="flex items-center gap-1">
                <IconClock size={16} />
                <span className="font-medium text-purple-700">
                  {task.fixed_time_slot.start} - {task.fixed_time_slot.end}
                </span>
              </div>
            )}
            {task.preferred_time_window && (
              <div className="flex items-center gap-1">
                <IconClock size={16} />
                <span className="font-medium text-cyan-700">
                  {task.preferred_time_window.start} -{" "}
                  {task.preferred_time_window.end}
                  <span className="ml-1 text-xs text-gray-500">
                    ({t("tasks:time_window")})
                  </span>
                </span>
              </div>
            )}
            {task.preferred_time_slot &&
              !task.fixed_time_slot &&
              !task.preferred_time_window && (
                <div className="flex items-center gap-1">
                  <IconClock size={16} />
                  <span className="text-blue-700">
                    {task.preferred_time_slot.start} -{" "}
                    {task.preferred_time_slot.end}
                    <span className="ml-1 text-xs text-gray-500">
                      ({t("tasks:preferred")})
                    </span>
                  </span>
                </div>
              )}
            {task.estimated_duration_minutes && (
              <div className="flex items-center gap-1">
                <IconClock size={16} />
                <span>
                  ~{task.estimated_duration_minutes} {t("common:minutes")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons - Only show for non-informational tasks */}
        {!task.is_informational && (
          <div className="flex flex-shrink-0 flex-col gap-2">
            {/* Complete Button - for PENDING, IN_PROGRESS, PAUSED tasks */}
            {(task.status === "pending" ||
              task.status === "in_progress" ||
              task.status === "paused") &&
              onComplete && (
                <button
                  onClick={() => onComplete(task)}
                  className="min-h-[44px] min-w-[44px] rounded-md p-2 text-green-600 transition-colors hover:bg-green-50"
                  title={t("tasks:complete")}
                >
                  <IconCheck size={18} />
                </button>
              )}

            {/* Uncomplete Button - for COMPLETED tasks */}
            {task.status === "completed" && onUncomplete && (
              <button
                onClick={() => onUncomplete(task._id)}
                className="min-h-[44px] min-w-[44px] rounded-md p-2 text-blue-600 transition-colors hover:bg-blue-50"
                title={t("tasks:uncomplete")}
              >
                <IconX size={18} />
              </button>
            )}

            {/* Skip Button - only for PENDING must_do/should_do tasks */}
            {task.status === "pending" &&
              (task.obligation_level === ObligationLevel.MUST_DO ||
                task.obligation_level === ObligationLevel.SHOULD_DO) &&
              onSkip && (
                <button
                  onClick={() => onSkip(task._id)}
                  className="min-h-[44px] min-w-[44px] rounded-md p-2 text-orange-600 transition-colors hover:bg-orange-50"
                  title={t("tasks:skip")}
                >
                  <IconCircleX size={18} />
                </button>
              )}

            {/* Restore Button - for SKIPPED tasks */}
            {task.status === "skipped" && onRestoreSkipped && (
              <button
                onClick={() => onRestoreSkipped(task._id)}
                className="min-h-[44px] min-w-[44px] rounded-md p-2 text-blue-600 transition-colors hover:bg-blue-50"
                title={t("tasks:restore")}
              >
                <IconRestore size={18} />
              </button>
            )}
          </div>
        )}

        {/* Edit/Delete buttons */}
        <div className="flex flex-shrink-0 gap-2">
          <button
            onClick={() => onEdit(task)}
            className="min-h-[44px] min-w-[44px] rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-50"
            title={
              task.is_virtual
                ? t("tasks:edit_occurrence")
                : t("tasks:edit_task")
            }
          >
            <IconEdit size={18} />
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(task._id)}
              className="min-h-[44px] min-w-[44px] rounded-md p-2 text-red-600 transition-colors hover:bg-red-50"
              title={t("tasks:delete_task")}
            >
              <IconTrash size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
