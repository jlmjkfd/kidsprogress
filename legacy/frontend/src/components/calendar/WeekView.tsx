/**
 * WeekView - 7-day week view with time grid
 * Shows tasks across the week with hourly timeline
 */
import { useTranslation } from "react-i18next";
import { IconCircle, IconCheck, IconChevronRight } from "@tabler/icons-react";
import { Task, TaskStatus, ObligationLevel } from "@/types/task";
import { DayType } from "@/types/schoolCalendar";
import { WeekSelector } from "./WeekSelector";
import { getLocalTimeInMinutes, getTaskDisplayDate } from "@/utils/timezone";

interface WeekViewProps {
  startDate: string; // YYYY-MM-DD of week start (Sunday or Monday)
  tasks: Task[]; // All tasks for the week
  dayTypes?: Map<string, DayType>; // Map of date -> dayType
  onTaskClick?: (task: Task) => void;
  selectedDate: string; // YYYY-MM-DD of selected day
  onDateSelect: (date: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

export function WeekView({
  startDate,
  tasks,
  dayTypes,
  onTaskClick,
  selectedDate,
  onDateSelect,
  onPrevWeek,
  onNextWeek,
}: WeekViewProps) {
  const { i18n } = useTranslation(["tasks", "common"]);
  const currentLocale = i18n.language || "en";

  // Use all tasks (no filtering)
  const visibleTasks = tasks;

  // Check if task is informational
  const isInformationalTask = (task: Task): boolean => {
    return task.is_informational;
  };

  // Generate 7 days of the week (using local dates to avoid timezone issues)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    // Parse startDate as local date components
    const [yearStr, monthStr, dayStr] = startDate.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // month is 0-indexed
    const day = parseInt(dayStr);

    const date = new Date(year, month, day + i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    return {
      date: dateStr,
      dayName: date.toLocaleDateString(currentLocale, { weekday: "short" }),
      dayNumber: date.getDate(),
      isToday: date.toDateString() === new Date().toDateString(),
    };
  });

  // Group tasks by date
  const tasksByDate = new Map<string, Task[]>();
  weekDays.forEach((day) => tasksByDate.set(day.date, []));

  visibleTasks.forEach((task) => {
    const taskDate = getTaskDisplayDate(task);
    if (taskDate && tasksByDate.has(taskDate)) {
      tasksByDate.get(taskDate)!.push(task);
    }
  });

  // Get planned time for a task (in minutes from midnight)
  const getPlannedTime = (task: Task): number | null => {
    if (task.fixed_time_slot?.start) {
      const [hours, minutes] = task.fixed_time_slot.start.split(":").map(Number);
      return hours * 60 + minutes;
    }
    if (task.preferred_time_window?.start) {
      const [hours, minutes] = task.preferred_time_window.start.split(":").map(Number);
      return hours * 60 + minutes;
    }
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

  // Get time for display based on task status (not used in week view, kept for mobile list view)
  const getTaskTime = (task: Task): number | null => {
    // For mobile list view: show planned time first, fall back to actual
    return getPlannedTime(task) ?? getActualTime(task);
  };

  // Get duration in minutes - prioritize planned duration
  const getTaskDuration = (task: Task): number => {
    // Check fixed time slot duration
    if (task.fixed_time_slot?.start && task.fixed_time_slot?.end) {
      const [startH, startM] = task.fixed_time_slot.start
        .split(":")
        .map(Number);
      const [endH, endM] = task.fixed_time_slot.end.split(":").map(Number);
      return endH * 60 + endM - (startH * 60 + startM);
    }
    // Check preferred time window duration
    if (task.preferred_time_window?.start && task.preferred_time_window?.end) {
      const [startH, startM] = task.preferred_time_window.start
        .split(":")
        .map(Number);
      const [endH, endM] = task.preferred_time_window.end.split(":").map(Number);
      return endH * 60 + endM - (startH * 60 + startM);
    }
    // Check preferred time slot duration
    if (task.preferred_time_slot?.start && task.preferred_time_slot?.end) {
      const [startH, startM] = task.preferred_time_slot.start
        .split(":")
        .map(Number);
      const [endH, endM] = task.preferred_time_slot.end.split(":").map(Number);
      return endH * 60 + endM - (startH * 60 + startM);
    }
    // Fall back to actual completion duration
    if (task.completed_at && task.started_at) {
      const start = new Date(task.started_at);
      const end = new Date(task.completed_at);
      return (end.getTime() - start.getTime()) / 60000;
    }
    return task.estimated_duration_minutes || 30;
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getObligationColor = (
    level: ObligationLevel,
    isInfo: boolean
  ): string => {
    if (isInfo) return "bg-gray-200 border-l-2 border-l-gray-400";
    switch (level) {
      case ObligationLevel.MUST_DO:
        return "bg-red-100 border-l-2 border-l-red-500";
      case ObligationLevel.SHOULD_DO:
        return "bg-blue-100 border-l-2 border-l-blue-500";
      default:
        return "bg-gray-100 border-l-2 border-l-gray-300";
    }
  };

  const getDayTypeBgClass = (type?: DayType): string => {
    switch (type) {
      case "school_day":
        return "bg-blue-50";
      case "holiday":
        return "bg-green-50";
      case "special_school_day":
        return "bg-purple-50";
      case "weekend":
        return "bg-gray-50";
      default:
        return "bg-white";
    }
  };

  // Get display time: completed tasks show actual time, others show planned time
  const getDisplayTime = (task: Task): number | null => {
    if (task.status === TaskStatus.COMPLETED) {
      // For completed tasks, prefer actual time
      const actualTime = getActualTime(task);
      if (actualTime !== null) return actualTime;
    }
    // For pending/in-progress, use planned time
    return getPlannedTime(task);
  };

  // Check if actual time differs significantly from planned time (>30 min difference)
  const hasTimeDifference = (task: Task): boolean => {
    if (task.status !== TaskStatus.COMPLETED) return false;
    const planned = getPlannedTime(task);
    const actual = getActualTime(task);
    if (planned === null || actual === null) return false;
    return Math.abs(actual - planned) > 30; // 30 minutes threshold
  };

  const renderTaskBlock = (task: Task) => {
    const isInfo = isInformationalTask(task);
    const displayTime = getDisplayTime(task);
    if (displayTime === null) return null;

    const duration = getTaskDuration(task);
    const topOffset = (displayTime / 60) * 32; // 32px per hour in week view
    const height = Math.max((duration / 60) * 32, 4); // Min 4px height - thin bar for week view

    const showTimeBadge = hasTimeDifference(task);

    return (
      <div
        key={task._id}
        onClick={() => onTaskClick?.(task)}
        className={`absolute right-0 left-0 overflow-hidden rounded-sm transition-all ${
          onTaskClick ? "cursor-pointer hover:z-20 hover:shadow-lg hover:scale-105" : ""
        } ${getObligationColor(task.obligation_level, isInfo)} ${
          task.status === TaskStatus.PENDING ? "opacity-70" : ""
        } ${task.status === TaskStatus.IN_PROGRESS ? "ring-1 ring-blue-500 animate-pulse" : ""}`}
        style={{
          top: `${topOffset}px`,
          height: `${height}px`,
          zIndex: task.status === TaskStatus.IN_PROGRESS ? 15 : 10,
        }}
        title={`${task.title}${showTimeBadge ? ' (time adjusted)' : ''} - ${duration} min`}
      >
        {/* Status indicator - minimal icons only */}
        {task.status === TaskStatus.COMPLETED && height >= 12 && (
          <div className="absolute top-0 right-0 p-0.5">
            <IconCheck size={8} className="text-green-600" />
          </div>
        )}
        {showTimeBadge && height >= 12 && (
          <div className="absolute top-0 left-0 p-0.5">
            <div className="w-1 h-1 rounded-full bg-yellow-500"></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Week Selector Header */}
      <WeekSelector
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
      />

      {/* Desktop Week Grid - Timeline View */}
      <div className="hidden md:block">
        <div className="rounded-xl bg-white shadow-sm">
          {/* Time Grid with Tasks */}
          <div style={{ minHeight: "768px" }}>
            {/* 32px per hour × 24 hours = 768px */}
            {/* Grid Layout: time column (32px) + 7 day columns (flex-1 each) + right spacer (32px) */}
            <div className="flex items-start gap-0.5 md:gap-1 p-2">
              {/* Hour Labels Column */}
              <div className="flex-shrink-0" style={{ width: "32px" }}>
                {hours.map((hour, idx) => (
                  <div
                    key={hour}
                    className={`py-0.5 pr-1 text-right text-xs text-gray-400 ${
                      idx % 2 === 0 ? "" : "opacity-60"
                    }`}
                    style={{ height: "32px" }}
                  >
                    {hour.toString().padStart(2, "0")}
                  </div>
                ))}
              </div>

              {/* Day Columns - grid with flex-1 to fill available space, matching WeekSelector */}
              <div className="grid grid-cols-7 flex-1 gap-0.5 rounded-lg bg-white">
              {weekDays.map((day) => {
                const dayType = dayTypes?.get(day.date);
                const dayTasks = tasksByDate.get(day.date) || [];
                const scheduledDayTasks = dayTasks.filter(
                  (t) => getTaskTime(t) !== null
                );

                return (
                  <div
                    key={day.date}
                    className={`relative ${getDayTypeBgClass(dayType)}`}
                  >
                    {/* Hour Grid Lines - subtle dotted lines */}
                    {hours.map((hour, idx) => (
                      <div
                        key={hour}
                        className={`${idx === 0 ? "" : "border-t border-dashed border-gray-200"}`}
                        style={{ height: "32px" }}
                      />
                    ))}

                    {/* Task Blocks Overlay */}
                    <div className="absolute inset-0 px-1">
                      {scheduledDayTasks.map((task) => renderTaskBlock(task))}
                    </div>
                  </div>
                );
              })}
              </div>

              {/* Right spacer to align with WeekSelector next button */}
              <div className="flex-shrink-0" style={{ width: "32px" }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Week View - List by Day */}
      <div className="md:hidden space-y-2">
        {weekDays.map((day) => {
          const dayType = dayTypes?.get(day.date);
          const dayTasks = tasksByDate.get(day.date) || [];
          const isSelected = day.date === selectedDate;

          return (
            <div
              key={day.date}
              className={`rounded-xl bg-white shadow-sm overflow-hidden transition-all ${
                isSelected ? "ring-2 ring-blue-500" : ""
              }`}
            >
              {/* Day Header */}
              <button
                onClick={() => onDateSelect(day.date)}
                className={`w-full px-4 py-3 flex items-center justify-between ${getDayTypeBgClass(dayType)} hover:brightness-95 transition-all`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg ${
                      day.isToday
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    <span className="text-xs font-medium">{day.dayName}</span>
                    <span className="text-lg font-bold">{day.dayNumber}</span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(day.date + "T00:00:00").toLocaleDateString(currentLocale, {
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-xs text-gray-600">
                      {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                    </div>
                  </div>
                </div>
                <IconChevronRight
                  size={20}
                  className={`text-gray-400 transition-transform ${
                    isSelected ? "rotate-90" : ""
                  }`}
                />
              </button>

              {/* Task List (Expanded when selected) */}
              {isSelected && dayTasks.length > 0 && (
                <div className="p-3 space-y-2 border-t">
                  {dayTasks.map((task) => {
                    const isInfo = isInformationalTask(task);
                    const taskTime = getTaskTime(task);
                    const timeStr = taskTime
                      ? `${Math.floor(taskTime / 60)
                          .toString()
                          .padStart(2, "0")}:${(taskTime % 60)
                          .toString()
                          .padStart(2, "0")}`
                      : "";

                    return (
                      <div
                        key={task._id}
                        onClick={() => onTaskClick?.(task)}
                        className={`p-3 rounded-lg ${getObligationColor(
                          task.obligation_level,
                          isInfo
                        )} ${
                          onTaskClick ? "cursor-pointer hover:shadow-md" : ""
                        } transition-all`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {task.status === TaskStatus.COMPLETED ? (
                                <IconCheck
                                  size={16}
                                  className="flex-shrink-0 text-green-600"
                                />
                              ) : task.status === TaskStatus.IN_PROGRESS ? (
                                <IconCircle
                                  size={14}
                                  className="flex-shrink-0 animate-pulse text-blue-500"
                                />
                              ) : (
                                <IconCircle
                                  size={14}
                                  className="flex-shrink-0 text-gray-400"
                                />
                              )}
                              <span className="font-medium text-sm text-gray-900">
                                {task.title}
                              </span>
                            </div>
                            {timeStr && (
                              <div className="mt-1 ml-6 text-xs text-gray-600">
                                {timeStr} • {getTaskDuration(task)} min
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
