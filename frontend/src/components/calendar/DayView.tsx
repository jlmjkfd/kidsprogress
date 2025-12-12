/**
 * DayView - 24-hour timeline view for a single day
 * Shows tasks positioned at their scheduled times with hourly grid
 */
import { useTranslation } from "react-i18next";
import { IconClock, IconCircle, IconCheck } from "@tabler/icons-react";
import { Task, TaskStatus, ObligationLevel, SchedulingType } from "@/types/task";
import { DayType } from "@/types/schoolCalendar";
import { WeekSelector } from "./WeekSelector";
import { formatDuration } from "@/utils/dateUtils";
import { getLocalTimeInMinutes } from "@/utils/timezone";

interface DayViewProps {
  date: string; // YYYY-MM-DD
  tasks: Task[];
  dayType?: DayType;
  onTaskClick?: (task: Task) => void;
  selectedDate: string; // YYYY-MM-DD of selected day
  onDateSelect: (date: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

export function DayView({
  date,
  tasks,
  onTaskClick,
  selectedDate,
  onDateSelect,
  onPrevWeek,
  onNextWeek,
}: DayViewProps) {
  const { t } = useTranslation(["tasks", "common"]);

  // Check if task is informational (blocks other tasks, not actionable)
  const isInformationalTask = (task: Task): boolean => {
    return task.is_informational;
  };

  // Use all tasks (no filtering)
  const visibleTasks = tasks;

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
      // Use timezone utility to properly convert UTC to local time
      return getLocalTimeInMinutes(task.started_at);
    }
    return null;
  };

  // Get time for display - use hybrid approach: completed tasks at actual time, others at planned time
  const getTaskTime = (task: Task): number | null => {
    if (task.status === TaskStatus.COMPLETED) {
      // For completed tasks, prefer actual time
      const actualTime = getActualTime(task);
      if (actualTime !== null) return actualTime;
    }
    // For pending/in-progress, use planned time
    return getPlannedTime(task);
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
  // Completed flexible tasks should show in timeline (at actual time), not in unscheduled list
  const scheduledTasks = visibleTasks
    .filter(task => {
      const taskTime = getTaskTime(task);
      // Include if has time, OR if completed (even without planned time, it has actual time)
      if (taskTime !== null) return true;
      if (task.status === TaskStatus.COMPLETED && getActualTime(task) !== null) return true;
      return false;
    })
    .sort((a, b) => (getTaskTime(a) || 0) - (getTaskTime(b) || 0));

  // Unscheduled list: pending/in-progress tasks without time (flexible tasks)
  const unscheduledTasks = visibleTasks.filter(task => {
    const taskTime = getTaskTime(task);
    // Exclude completed tasks - they appear in timeline
    if (task.status === TaskStatus.COMPLETED) return false;
    // Include only if no time
    return taskTime === null;
  });

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
    const pixelsPerHour = isMobile ? 40 : 60; // Mobile: 40px/hour, Desktop: 60px/hour
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
        const startDate = new Date(task.started_at!);
        const actualStartTime = getLocalTimeInMinutes(task.started_at!);
        const actualEndTime = getLocalTimeInMinutes(task.completed_at!);

        // Calculate actual duration precisely
        const actualDurationMs = completedDate.getTime() - startDate.getTime();
        const actualDurationMinutes = actualDurationMs / 60000;

        const completionTopOffset = (actualStartTime / 60) * pixelsPerHour;
        const completionHeight = (actualDurationMinutes / 60) * pixelsPerHour;

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
              {t("tasks:actual_completion")}: {formatDuration(actualDurationMinutes, t)}
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
            task.status === TaskStatus.PENDING ? "opacity-70" : ""
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
                  // Show formatted duration
                  <>{formatDuration(duration, t)}</>
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

  return (
    <div className="space-y-4">
      {/* Week Selector Header */}
      <WeekSelector
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
      />

      {/* Timeline - Responsive height */}
      <div className="relative rounded-lg border bg-white overflow-x-auto max-h-[70vh] md:max-h-none overflow-y-auto md:overflow-y-visible">
        {/* Hour Grid - Smaller height with external time labels */}
        <div className="flex">
          {/* Time Labels Column - Outside the timeline */}
          <div className="flex-shrink-0 w-8 md:w-10 bg-gray-50 border-r">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-[40px] md:h-[60px] px-0.5 md:px-1 py-1 text-xs font-medium text-gray-500 text-right"
              >
                {hour.toString().padStart(2, "0")}
              </div>
            ))}
          </div>

          {/* Timeline Grid with Tasks */}
          <div className="relative flex-1 md:min-h-[1440px]" style={{ minHeight: "960px" }}>
            {/* Mobile: 40px per hour × 24 = 960px, Desktop: 60px per hour × 24 = 1440px */}
            {hours.map((hour) => (
              <div
                key={hour}
                className="border-b border-gray-200 last:border-b-0 h-[40px] md:h-[60px]"
              />
            ))}

            {/* Scheduled Tasks Overlay */}
            <div className="absolute inset-0">
              {taskColumns.map((pos, idx) =>
                renderTaskCard(pos.task, idx, pos.column, pos.totalColumns)
              )}
            </div>

            {/* Deadline Lines - Responsive */}
            <div className="absolute inset-0 pointer-events-none">
            {tasks
              .filter(task => task.scheduling_type === SchedulingType.DEADLINE && task.deadline)
              .map((task, idx) => {
                // Parse deadline time (format: HH:MM)
                const [hours, minutes] = task.deadline!.split(":").map(Number);
                const deadlineMinutes = hours * 60 + minutes;
                // Responsive: 40px/hour on mobile, 60px/hour on desktop
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                const pixelsPerHour = isMobile ? 40 : 60;
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
                          <span>{formatDuration(task.estimated_duration_minutes, t)}</span>
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
