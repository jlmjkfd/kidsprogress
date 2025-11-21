/**
 * WeekView - 7-day week view with time grid
 * Shows tasks across the week with hourly timeline
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconCircle, IconCheck, IconChevronRight, IconCalendarTime, IconPlayerPlay } from "@tabler/icons-react";
import { Task, TaskStatus, ObligationLevel } from "@/types/task";
import { DayType } from "@/types/schoolCalendar";
import { WeekSelector } from "./WeekSelector";

interface WeekViewProps {
  startDate: string; // YYYY-MM-DD of week start (Sunday or Monday)
  tasks: Task[]; // All tasks for the week
  dayTypes?: Map<string, DayType>; // Map of date -> dayType
  onTaskClick?: (task: Task) => void;
  hideInformational?: boolean;
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
  hideInformational = false,
  selectedDate,
  onDateSelect,
  onPrevWeek,
  onNextWeek,
}: WeekViewProps) {
  const { t, i18n } = useTranslation(["tasks", "common"]);
  const currentLocale = i18n.language || "en";

  // Toggle between showing planned time vs actual execution time
  const [showPlannedTime, setShowPlannedTime] = useState(true);

  // Check if task is informational
  const isInformationalTask = (task: Task): boolean => {
    return task.is_informational;
  };

  // Filter tasks
  const visibleTasks = tasks.filter((task) => {
    if (hideInformational && isInformationalTask(task)) return false;
    return true;
  });

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
    const taskDate = task.scheduled_date?.split("T")[0];
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
      const date = new Date(task.started_at);
      return date.getHours() * 60 + date.getMinutes();
    }
    return null;
  };

  // Get time for display based on toggle
  const getTaskTime = (task: Task): number | null => {
    if (showPlannedTime) {
      return getPlannedTime(task) ?? getActualTime(task);
    } else {
      return getActualTime(task) ?? getPlannedTime(task);
    }
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

  const renderTaskBlock = (task: Task) => {
    const isInfo = isInformationalTask(task);
    const taskTime = getTaskTime(task);
    if (taskTime === null) return null;

    const duration = getTaskDuration(task);
    const topOffset = (taskTime / 60) * 48; // 48px per hour in week view
    const height = Math.max((duration / 60) * 48, 24); // Min 24px height

    return (
      <div
        key={task._id}
        onClick={() => onTaskClick?.(task)}
        className={`absolute right-0 left-0 mx-0.5 overflow-hidden rounded p-1 text-xs transition-all ${
          onTaskClick ? "cursor-pointer hover:z-20 hover:shadow-md" : ""
        } ${getObligationColor(task.obligation_level, isInfo)} ${
          task.status === TaskStatus.COMPLETED ? "opacity-50" : ""
        }`}
        style={{
          top: `${topOffset}px`,
          height: `${height}px`,
          zIndex: task.status === TaskStatus.IN_PROGRESS ? 15 : 10,
        }}
        title={`${task.title} - ${task.estimated_duration_minutes || 0} min`}
      >
        <div className="flex items-center gap-0.5 truncate">
          {task.status === TaskStatus.COMPLETED ? (
            <IconCheck size={10} className="flex-shrink-0 text-green-600" />
          ) : task.status === TaskStatus.IN_PROGRESS ? (
            <IconCircle
              size={8}
              className="flex-shrink-0 animate-pulse text-blue-500"
            />
          ) : null}
          <span className="truncate font-medium">{task.title}</span>
        </div>
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

      {/* Planned vs Actual Time Toggle */}
      <div className="flex justify-end px-2">
        <div className="inline-flex rounded-lg border bg-white p-1 shadow-sm">
          <button
            onClick={() => setShowPlannedTime(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              showPlannedTime
                ? "bg-blue-100 text-blue-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <IconCalendarTime size={16} />
            {t("tasks:planned_time")}
          </button>
          <button
            onClick={() => setShowPlannedTime(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              !showPlannedTime
                ? "bg-green-100 text-green-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <IconPlayerPlay size={16} />
            {t("tasks:actual_time")}
          </button>
        </div>
      </div>

      {/* Desktop Week Grid - Timeline View */}
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-[800px] rounded-xl bg-white shadow-sm">
          {/* Time Grid with Tasks */}
          <div className="flex gap-2 p-3" style={{ minHeight: "1152px" }}>
            {/* 48px per hour × 24 hours = 1152px */}
            {/* Hour Labels Column - same width as left button (44px) */}
            <div className="flex-shrink-0" style={{ width: "44px" }}>
              {hours.map((hour, idx) => (
                <div
                  key={hour}
                  className={`py-1 pr-2 text-right text-xs text-gray-400 ${
                    idx % 2 === 0 ? "" : "opacity-60"
                  }`}
                  style={{ height: "48px" }}
                >
                  {hour.toString().padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Day Columns - table content */}
            <div className="flex min-w-0 flex-1 gap-1 overflow-hidden rounded-lg bg-white">
              {weekDays.map((day) => {
                const dayType = dayTypes?.get(day.date);
                const dayTasks = tasksByDate.get(day.date) || [];
                const scheduledDayTasks = dayTasks.filter(
                  (t) => getTaskTime(t) !== null
                );

                return (
                  <div
                    key={day.date}
                    className={`relative flex-1 ${getDayTypeBgClass(dayType)}`}
                  >
                    {/* Hour Grid Lines - subtle dotted lines */}
                    {hours.map((hour, idx) => (
                      <div
                        key={hour}
                        className={`${idx === 0 ? "" : "border-t border-dashed border-gray-200"}`}
                        style={{ height: "48px" }}
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

            {/* Right spacer - same width as right button (44px) */}
            <div className="flex-shrink-0" style={{ width: "44px" }}></div>
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
