/**
 * WeekView - 7-day week view with time grid
 * Shows tasks across the week with hourly timeline
 */
import { useTranslation } from "react-i18next";
import { IconCircle, IconCheck } from "@tabler/icons-react";
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
  const { i18n } = useTranslation(["common"]);
  const currentLocale = i18n.language || "en";

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

  // Get time for a task (in minutes from midnight)
  const getTaskTime = (task: Task): number | null => {
    if (task.started_at) {
      const date = new Date(task.started_at);
      return date.getHours() * 60 + date.getMinutes();
    }
    if (task.fixed_time_slot?.start) {
      const [hours, minutes] = task.fixed_time_slot.start
        .split(":")
        .map(Number);
      return hours * 60 + minutes;
    }
    if (task.preferred_time_slot?.start) {
      const [hours, minutes] = task.preferred_time_slot.start
        .split(":")
        .map(Number);
      return hours * 60 + minutes;
    }
    return null;
  };

  // Get duration in minutes
  const getTaskDuration = (task: Task): number => {
    if (task.completed_at && task.started_at) {
      const start = new Date(task.started_at);
      const end = new Date(task.completed_at);
      return (end.getTime() - start.getTime()) / 60000;
    }
    if (task.fixed_time_slot?.start && task.fixed_time_slot?.end) {
      const [startH, startM] = task.fixed_time_slot.start
        .split(":")
        .map(Number);
      const [endH, endM] = task.fixed_time_slot.end.split(":").map(Number);
      return endH * 60 + endM - (startH * 60 + startM);
    }
    if (task.preferred_time_slot?.start && task.preferred_time_slot?.end) {
      const [startH, startM] = task.preferred_time_slot.start
        .split(":")
        .map(Number);
      const [endH, endM] = task.preferred_time_slot.end.split(":").map(Number);
      return endH * 60 + endM - (startH * 60 + startM);
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

      {/* Week Grid */}
      <div className="overflow-x-auto">
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
    </div>
  );
}
