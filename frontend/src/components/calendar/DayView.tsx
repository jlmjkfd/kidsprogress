/**
 * DayView - 24-hour timeline view for a single day
 * Shows tasks positioned at their scheduled times with hourly grid
 */
import { useTranslation } from "react-i18next";
import { IconClock, IconCircle, IconCheck } from "@tabler/icons-react";
import { Task, TaskStatus, ObligationLevel } from "@/types/task";
import { DayType } from "@/types/schoolCalendar";

interface DayViewProps {
  date: string; // YYYY-MM-DD
  tasks: Task[];
  dayType?: DayType;
  onTaskClick?: (task: Task) => void;
  hideInformational?: boolean; // Hide informational/blocking tasks (like school time, sleep)
}

export function DayView({
  date,
  tasks,
  dayType,
  onTaskClick,
  hideInformational = false,
}: DayViewProps) {
  const { t, i18n } = useTranslation(["tasks", "common"]);
  const currentLocale = i18n.language || "en";

  // Check if task is informational (blocks other tasks, not actionable)
  const isInformationalTask = (task: Task): boolean => {
    return task.is_informational;
  };

  // Filter tasks based on settings
  const visibleTasks = tasks.filter(task => {
    if (hideInformational && isInformationalTask(task)) return false;
    return true;
  });

  // Get time for a task (in minutes from midnight)
  const getTaskTime = (task: Task): number | null => {
    // Try started_at time first
    if (task.started_at) {
      const date = new Date(task.started_at);
      return date.getHours() * 60 + date.getMinutes();
    }
    // Try fixed time slot
    if (task.fixed_time_slot?.start) {
      const [hours, minutes] = task.fixed_time_slot.start.split(":").map(Number);
      return hours * 60 + minutes;
    }
    // Try preferred time slot
    if (task.preferred_time_slot?.start) {
      const [hours, minutes] = task.preferred_time_slot.start.split(":").map(Number);
      return hours * 60 + minutes;
    }
    return null;
  };

  // Get duration in minutes
  const getTaskDuration = (task: Task): number => {
    // Check for actual duration
    if (task.completed_at && task.started_at) {
      const start = new Date(task.started_at);
      const end = new Date(task.completed_at);
      return (end.getTime() - start.getTime()) / 60000;
    }
    // Check for fixed time slot duration
    if (task.fixed_time_slot?.start && task.fixed_time_slot?.end) {
      const [startH, startM] = task.fixed_time_slot.start.split(":").map(Number);
      const [endH, endM] = task.fixed_time_slot.end.split(":").map(Number);
      return (endH * 60 + endM) - (startH * 60 + startM);
    }
    // Check for preferred time slot duration
    if (task.preferred_time_slot?.start && task.preferred_time_slot?.end) {
      const [startH, startM] = task.preferred_time_slot.start.split(":").map(Number);
      const [endH, endM] = task.preferred_time_slot.end.split(":").map(Number);
      return (endH * 60 + endM) - (startH * 60 + startM);
    }
    // Fall back to estimated duration or default
    return task.estimated_duration_minutes || 30;
  };

  // Separate scheduled and unscheduled tasks
  const scheduledTasks = visibleTasks
    .filter(task => getTaskTime(task) !== null)
    .sort((a, b) => (getTaskTime(a) || 0) - (getTaskTime(b) || 0));

  const unscheduledTasks = visibleTasks.filter(task => getTaskTime(task) === null);

  // Generate hours (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getObligationColor = (level: ObligationLevel, isInfo: boolean): string => {
    if (isInfo) return "bg-gray-100 border-l-gray-400 text-gray-700";
    switch (level) {
      case ObligationLevel.MUST_DO:
        return "bg-red-50 border-l-red-500";
      case ObligationLevel.SHOULD_DO:
        return "bg-blue-50 border-l-blue-500";
      default:
        return "bg-gray-50 border-l-gray-300";
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  const getDayTypeBadge = (type?: DayType): React.ReactElement | null => {
    if (!type) return null;
    const classes = {
      school_day: "bg-blue-100 text-blue-800",
      holiday: "bg-green-100 text-green-800",
      special_school_day: "bg-purple-100 text-purple-800",
      weekend: "bg-gray-100 text-gray-800",
    };
    const labels = {
      school_day: t("tasks:school_calendar.school_day"),
      holiday: t("tasks:school_calendar.holiday"),
      special_school_day: t("tasks:school_calendar.special_school_day"),
      weekend: t("tasks:school_calendar.weekend"),
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${classes[type]}`}>
        {labels[type]}
      </span>
    );
  };

  const renderTaskCard = (task: Task, index: number) => {
    const isInfo = isInformationalTask(task);
    const taskTime = getTaskTime(task);
    const duration = getTaskDuration(task);
    const isActualTime = !!task.started_at;

    // Calculate position (top offset from hour grid)
    const topOffset = taskTime !== null ? (taskTime / 60) * 80 : 0; // 80px per hour
    const height = (duration / 60) * 80;

    return (
      <div
        key={task._id}
        onClick={() => onTaskClick?.(task)}
        className={`absolute left-0 right-0 mx-1 overflow-hidden rounded-lg border-l-4 p-2 shadow-sm transition-all ${
          onTaskClick ? "cursor-pointer hover:shadow-md" : ""
        } ${getObligationColor(task.obligation_level, isInfo)} ${
          task.status === TaskStatus.COMPLETED ? "opacity-60" : ""
        }`}
        style={{
          top: `${topOffset}px`,
          minHeight: `${Math.max(height, 40)}px`,
          zIndex: 10 + index,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <IconClock size={12} />
              <span className={isActualTime ? "font-semibold text-green-700" : ""}>
                {formatTime(taskTime!)}
                {isActualTime && <span className="ml-1 text-green-600">●</span>}
              </span>
            </div>
            <h4 className={`mt-1 text-sm font-semibold truncate ${
              task.status === TaskStatus.COMPLETED ? "line-through text-gray-600" : "text-gray-900"
            }`}>
              {task.title}
            </h4>
            <div className="mt-1 text-xs text-gray-500">
              {duration} {t("common:minutes")}
            </div>
          </div>
          <div>
            {task.status === TaskStatus.COMPLETED ? (
              <IconCheck className="text-green-600" size={16} />
            ) : (
              <IconCircle
                className={task.status === TaskStatus.IN_PROGRESS ? "animate-pulse text-blue-500" : "text-gray-400"}
                size={14}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString(currentLocale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{formattedDate}</h3>
          {dayType && <div className="mt-1">{getDayTypeBadge(dayType)}</div>}
        </div>
        <div className="text-sm text-gray-600">
          {scheduledTasks.length} {t("tasks:scheduled_tasks").toLowerCase()}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative rounded-lg border bg-white overflow-x-auto">
        {/* Hour Grid */}
        <div className="relative" style={{ minHeight: "1920px" }}>
          {/* 80px per hour × 24 hours = 1920px */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="border-b border-gray-200 last:border-b-0"
              style={{ height: "80px", position: "relative" }}
            >
              <div className="absolute left-0 top-0 w-16 px-2 py-1 text-xs font-medium text-gray-500">
                {hour.toString().padStart(2, "0")}:00
              </div>
            </div>
          ))}

          {/* Scheduled Tasks Overlay */}
          <div className="absolute inset-0 pl-16">
            {scheduledTasks.map((task, idx) => renderTaskCard(task, idx))}
          </div>
        </div>
      </div>

      {/* Unscheduled Tasks Section */}
      {unscheduledTasks.length > 0 && (
        <div className="rounded-lg border bg-gray-50 p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            {t("tasks:unscheduled_tasks")} ({unscheduledTasks.length})
          </h4>
          <div className="space-y-2">
            {unscheduledTasks.map((task) => {
              const isInfo = isInformationalTask(task);
              return (
                <div
                  key={task._id}
                  onClick={() => onTaskClick?.(task)}
                  className={`rounded-lg border-l-4 p-3 transition-all ${
                    onTaskClick ? "cursor-pointer hover:shadow-md" : ""
                  } ${getObligationColor(task.obligation_level, isInfo)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h5 className={`text-sm font-semibold ${
                        task.status === TaskStatus.COMPLETED ? "line-through text-gray-600" : "text-gray-900"
                      }`}>
                        {task.title}
                      </h5>
                      {task.estimated_duration_minutes && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <IconClock size={12} />
                          <span>{task.estimated_duration_minutes} {t("common:minutes")}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      {task.status === TaskStatus.COMPLETED ? (
                        <IconCheck className="text-green-600" size={16} />
                      ) : (
                        <IconCircle
                          className={task.status === TaskStatus.IN_PROGRESS ? "animate-pulse text-blue-500" : "text-gray-400"}
                          size={14}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {visibleTasks.length === 0 && (
        <div className="rounded-lg border bg-white p-12 text-center">
          <p className="text-gray-500">{t("tasks:no_tasks_for_day")}</p>
        </div>
      )}
    </div>
  );
}
