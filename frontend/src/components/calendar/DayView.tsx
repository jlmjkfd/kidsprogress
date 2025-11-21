/**
 * DayView - 24-hour timeline view for a single day
 * Shows tasks positioned at their scheduled times with hourly grid
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconClock, IconCircle, IconCheck, IconCalendarTime, IconPlayerPlay } from "@tabler/icons-react";
import { Task, TaskStatus, ObligationLevel, SchedulingType } from "@/types/task";
import { DayType } from "@/types/schoolCalendar";
import { WeekSelector } from "./WeekSelector";

interface DayViewProps {
  date: string; // YYYY-MM-DD
  tasks: Task[];
  dayType?: DayType;
  onTaskClick?: (task: Task) => void;
  hideInformational?: boolean; // Hide informational/blocking tasks (like school time, sleep)
  selectedDate: string; // YYYY-MM-DD of selected day
  onDateSelect: (date: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

export function DayView({
  date,
  tasks,
  dayType,
  onTaskClick,
  hideInformational = false,
  selectedDate,
  onDateSelect,
  onPrevWeek,
  onNextWeek,
}: DayViewProps) {
  const { t, i18n } = useTranslation(["tasks", "common"]);
  const currentLocale = i18n.language || "en";

  // Toggle between showing planned time vs actual execution time
  const [showPlannedTime, setShowPlannedTime] = useState(true);

  // Check if task is informational (blocks other tasks, not actionable)
  const isInformationalTask = (task: Task): boolean => {
    return task.is_informational;
  };

  // Filter tasks based on settings
  const visibleTasks = tasks.filter(task => {
    if (hideInformational && isInformationalTask(task)) return false;
    return true;
  });

  // Get planned time for a task (in minutes from midnight)
  const getPlannedTime = (task: Task): number | null => {
    // Try fixed time slot
    if (task.fixed_time_slot?.start) {
      const [hours, minutes] = task.fixed_time_slot.start.split(":").map(Number);
      return hours * 60 + minutes;
    }
    // Try preferred time window
    if (task.preferred_time_window?.start) {
      const [hours, minutes] = task.preferred_time_window.start.split(":").map(Number);
      return hours * 60 + minutes;
    }
    // Try preferred time slot
    if (task.preferred_time_slot?.start) {
      const [hours, minutes] = task.preferred_time_slot.start.split(":").map(Number);
      return hours * 60 + minutes;
    }
    return null;
  };

  // Get actual execution time (in minutes from midnight, local time)
  const getActualTime = (task: Task): number | null => {
    if (task.started_at) {
      const date = new Date(task.started_at);
      // Use local time (getHours returns local time)
      return date.getHours() * 60 + date.getMinutes();
    }
    return null;
  };

  // Get time for display based on toggle
  const getTaskTime = (task: Task): number | null => {
    if (showPlannedTime) {
      // Show planned time first, fall back to actual if no plan
      return getPlannedTime(task) ?? getActualTime(task);
    } else {
      // Show actual time first, fall back to planned if not started
      return getActualTime(task) ?? getPlannedTime(task);
    }
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
    // Check for preferred time window duration
    if (task.preferred_time_window?.start && task.preferred_time_window?.end) {
      const [startH, startM] = task.preferred_time_window.start.split(":").map(Number);
      const [endH, endM] = task.preferred_time_window.end.split(":").map(Number);
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

  // Calculate column layout for overlapping tasks
  const calculateTaskColumns = () => {
    const taskPositions: Array<{
      task: Task;
      start: number;
      end: number;
      column: number;
      totalColumns: number;
    }> = [];

    scheduledTasks.forEach((task) => {
      const startTime = getTaskTime(task)!;
      const duration = getTaskDuration(task);
      const endTime = startTime + duration;

      // Find overlapping tasks
      const overlapping = taskPositions.filter(
        (pos) => pos.start < endTime && pos.end > startTime
      );

      // Find the first available column
      const usedColumns = overlapping.map((pos) => pos.column);
      let column = 0;
      while (usedColumns.includes(column)) {
        column++;
      }

      // Add this task
      taskPositions.push({
        task,
        start: startTime,
        end: endTime,
        column,
        totalColumns: Math.max(column + 1, ...overlapping.map((pos) => pos.totalColumns)),
      });

      // Update totalColumns for overlapping tasks
      overlapping.forEach((pos) => {
        pos.totalColumns = Math.max(pos.totalColumns, column + 1);
      });
    });

    return taskPositions;
  };

  const taskColumns = calculateTaskColumns();

  // Generate hours (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Get visual styling based on task scheduling type
  const getTaskStyling = (task: Task, isInfo: boolean): string => {
    if (isInfo) return "bg-gray-100 border-l-4 border-l-gray-400 text-gray-700";

    // Skipped tasks (overdue should_do/optional)
    if (task.status === TaskStatus.SKIPPED) {
      return "bg-orange-50 border-2 border-orange-300 text-orange-700 opacity-70";
    }

    // Visual hierarchy: Fixed (purple) > Window (cyan) > Preferred (blue) > Flexible (gray)
    if (task.fixed_time_slot) {
      return "bg-purple-100 border border-purple-400 text-purple-900 shadow-sm";
    }
    if (task.preferred_time_window) {
      return "bg-cyan-50 border-2 border-cyan-300 text-cyan-900 bg-opacity-60";
    }
    if (task.preferred_time_slot) {
      return "bg-blue-50 border-2 border-dashed border-blue-300 text-blue-900";
    }

    // Fallback to obligation level colors
    switch (task.obligation_level) {
      case ObligationLevel.MUST_DO:
        return "bg-red-50 border-l-4 border-l-red-500";
      case ObligationLevel.SHOULD_DO:
        return "bg-blue-50 border-l-4 border-l-blue-500";
      default:
        return "bg-gray-50 border-l-4 border-l-gray-300";
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

  const renderTaskCard = (task: Task, index: number, column: number = 0, totalColumns: number = 1) => {
    const isInfo = isInformationalTask(task);
    const taskTime = getTaskTime(task);
    const duration = getTaskDuration(task);
    const isActualTime = !!task.started_at;

    // For time windows, get both window duration and estimated duration
    const isTimeWindow = !!task.preferred_time_window;
    const estimatedDuration = task.estimated_duration_minutes || 30;

    // Calculate position (top offset from hour grid) - Responsive pixels per hour
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const pixelsPerHour = isMobile ? 50 : 80; // Mobile: 50px/hour, Desktop: 80px/hour
    const topOffset = taskTime !== null ? (taskTime / 60) * pixelsPerHour : 0;
    const height = (duration / 60) * pixelsPerHour;

    // Calculate horizontal position for column layout
    const columnWidth = totalColumns > 1 ? `${100 / totalColumns}%` : '100%';
    const columnLeft = totalColumns > 1 ? `${(column * 100) / totalColumns}%` : '0';

    // Check if task has actual completion time on this day
    const hasCompletionTime = task.status === TaskStatus.COMPLETED && task.completed_at && task.started_at;
    let completionBlock = null;

    if (hasCompletionTime) {
      const completedDate = new Date(task.completed_at!);
      const taskDate = new Date(date + "T00:00:00");

      // Only show completion block if completed on the displayed day
      if (completedDate.toDateString() === taskDate.toDateString()) {
        const actualStartTime = new Date(task.started_at!).getHours() * 60 + new Date(task.started_at!).getMinutes();
        const actualEndTime = completedDate.getHours() * 60 + completedDate.getMinutes();
        const actualDuration = actualEndTime - actualStartTime;

        const completionTopOffset = (actualStartTime / 60) * pixelsPerHour;
        const completionHeight = (actualDuration / 60) * pixelsPerHour;

        completionBlock = (
          <div
            key={`${task._id}-completion`}
            className="absolute mx-1 rounded-lg border-2 border-green-500 bg-green-50 bg-opacity-30 p-2 pointer-events-none"
            style={{
              top: `${completionTopOffset}px`,
              minHeight: `${Math.max(completionHeight, 40)}px`,
              zIndex: 5 + index,
              left: columnLeft,
              width: `calc(${columnWidth} - 8px)`,
            }}
          >
            <div className="flex items-center gap-1 text-xs text-green-700 font-semibold">
              <IconCheck size={12} />
              <span>{formatTime(actualStartTime)} - {formatTime(actualEndTime)}</span>
            </div>
            <div className="text-xs text-green-600 mt-1">
              {t("tasks:actual_completion")}: {actualDuration} {t("common:minutes")}
            </div>
          </div>
        );
      }
    }

    return (
      <>
        {/* Planned time block */}
        <div
          key={task._id}
          onClick={() => onTaskClick?.(task)}
          className={`absolute mx-1 overflow-hidden rounded-lg p-2 transition-all ${
            onTaskClick ? "cursor-pointer hover:shadow-md" : ""
          } ${getTaskStyling(task, isInfo)} ${
            task.status === TaskStatus.COMPLETED ? "opacity-60" : ""
          }`}
          style={{
            top: `${topOffset}px`,
            minHeight: `${Math.max(height, 40)}px`,
            zIndex: 10 + index,
            left: columnLeft,
            width: `calc(${columnWidth} - 8px)`, // 8px for margins
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
                task.status === TaskStatus.COMPLETED || task.status === TaskStatus.SKIPPED ? "line-through text-gray-600" : "text-gray-900"
              }`}>
                {task.title}
              </h4>
              <div className="mt-1 text-xs text-gray-500">
                {task.status === TaskStatus.SKIPPED ? (
                  <span className="text-orange-600 font-medium">{t("tasks:skipped")}</span>
                ) : isTimeWindow ? (
                  // Show "X min in HH:MM-HH:MM window"
                  <>
                    {estimatedDuration} {t("common:minutes")} {t("common:in")}{" "}
                    {task.preferred_time_window!.start}-{task.preferred_time_window!.end}
                  </>
                ) : (
                  // Show just duration
                  <>{duration} {t("common:minutes")}</>
                )}
              </div>
            </div>
            <div>
              {task.status === TaskStatus.COMPLETED ? (
                <IconCheck className="text-green-600" size={16} />
              ) : task.status === TaskStatus.SKIPPED ? (
                <span className="text-orange-500 text-xs">⊘</span>
              ) : (
                <IconCircle
                  className={task.status === TaskStatus.IN_PROGRESS ? "animate-pulse text-blue-500" : "text-gray-400"}
                  size={14}
                />
              )}
            </div>
          </div>
        </div>

        {/* Actual completion time block (if different from planned) */}
        {completionBlock}
      </>
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
      {/* Week Selector Header */}
      <WeekSelector
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
      />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{formattedDate}</h3>
          {dayType && <div className="mt-1">{getDayTypeBadge(dayType)}</div>}
        </div>
        <div className="flex items-center gap-4">
          {/* Time Display Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setShowPlannedTime(true)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                showPlannedTime
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title={t("tasks:timeline.planned_time")}
            >
              <IconCalendarTime size={14} />
              <span className="hidden sm:inline">{t("tasks:timeline.planned")}</span>
            </button>
            <button
              onClick={() => setShowPlannedTime(false)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                !showPlannedTime
                  ? "bg-white text-green-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title={t("tasks:timeline.actual_time")}
            >
              <IconPlayerPlay size={14} />
              <span className="hidden sm:inline">{t("tasks:timeline.actual")}</span>
            </button>
          </div>
          <div className="text-sm text-gray-600">
            {scheduledTasks.length} {t("tasks:scheduled_tasks").toLowerCase()}
          </div>
        </div>
      </div>

      {/* Timeline - Responsive height */}
      <div className="relative rounded-lg border bg-white overflow-x-auto max-h-[70vh] md:max-h-none overflow-y-auto md:overflow-y-visible">
        {/* Hour Grid - Smaller on mobile */}
        <div className="relative md:min-h-[1920px]" style={{ minHeight: "1200px" }}>
          {/* Mobile: 50px per hour × 24 = 1200px, Desktop: 80px per hour × 24 = 1920px */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="border-b border-gray-200 last:border-b-0 h-[50px] md:h-[80px]"
              style={{ position: "relative" }}
            >
              <div className="absolute left-0 top-0 w-12 md:w-16 px-1 md:px-2 py-1 text-xs font-medium text-gray-500">
                {hour.toString().padStart(2, "0")}:00
              </div>
            </div>
          ))}

          {/* Scheduled Tasks Overlay - Responsive padding */}
          <div className="absolute inset-0 pl-12 md:pl-16">
            {taskColumns.map((pos, idx) =>
              renderTaskCard(pos.task, idx, pos.column, pos.totalColumns)
            )}
          </div>

          {/* Deadline Lines - Responsive */}
          <div className="absolute inset-0 pl-12 md:pl-16 pointer-events-none">
            {tasks
              .filter(task => task.scheduling_type === SchedulingType.DEADLINE && task.deadline)
              .map((task, idx) => {
                // Parse deadline time (format: HH:MM)
                const [hours, minutes] = task.deadline!.split(":").map(Number);
                const deadlineMinutes = hours * 60 + minutes;
                // Responsive: 50px/hour on mobile, 80px/hour on desktop
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                const pixelsPerHour = isMobile ? 50 : 80;
                const topOffset = (deadlineMinutes / 60) * pixelsPerHour;

                return (
                  <div
                    key={`deadline-${task._id}-${idx}`}
                    className="absolute left-0 right-0 border-t-2 border-red-500"
                    style={{ top: `${topOffset}px` }}
                  >
                    <div className="absolute -top-3 right-2 bg-red-500 px-2 py-0.5 text-xs text-white rounded">
                      {task.deadline} {t("tasks:deadline")}
                    </div>
                  </div>
                );
              })}
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
                  className={`rounded-lg p-3 transition-all ${
                    onTaskClick ? "cursor-pointer hover:shadow-md" : ""
                  } ${getTaskStyling(task, isInfo)}`}
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
