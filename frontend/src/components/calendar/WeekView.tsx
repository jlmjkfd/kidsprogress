/**
 * WeekView - 7-day week view with time grid
 * Shows tasks across the week with hourly timeline
 */
import { useTranslation } from "react-i18next";
import { IconCircle, IconCheck } from "@tabler/icons-react";
import { Task, TaskStatus, ObligationLevel, SchedulingType } from "@/types/task";
import { DayType } from "@/types/schoolCalendar";

interface WeekViewProps {
  startDate: string; // YYYY-MM-DD of week start (Sunday or Monday)
  tasks: Task[]; // All tasks for the week
  dayTypes?: Map<string, DayType>; // Map of date -> dayType
  onTaskClick?: (task: Task) => void;
  hideInformational?: boolean;
}

export function WeekView({
  startDate,
  tasks,
  dayTypes,
  onTaskClick,
  hideInformational = false,
}: WeekViewProps) {
  const { t, i18n } = useTranslation(["common"]);
  const currentLocale = i18n.language || "en";

  // Helper to parse YYYY-MM-DD as local date (avoid timezone issues)
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  // Check if task is informational
  const isInformationalTask = (task: Task): boolean => {
    return task.blocks_other_tasks && task.scheduling_type === SchedulingType.FIXED_TIME;
  };

  // Filter tasks
  const visibleTasks = tasks.filter(task => {
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
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    return {
      date: dateStr,
      dayName: date.toLocaleDateString(currentLocale, { weekday: "short" }),
      dayNumber: date.getDate(),
      isToday: date.toDateString() === new Date().toDateString(),
    };
  });

  // Group tasks by date
  const tasksByDate = new Map<string, Task[]>();
  weekDays.forEach(day => tasksByDate.set(day.date, []));

  visibleTasks.forEach(task => {
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
      const [hours, minutes] = task.fixed_time_slot.start.split(":").map(Number);
      return hours * 60 + minutes;
    }
    if (task.preferred_time_slot?.start) {
      const [hours, minutes] = task.preferred_time_slot.start.split(":").map(Number);
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
      const [startH, startM] = task.fixed_time_slot.start.split(":").map(Number);
      const [endH, endM] = task.fixed_time_slot.end.split(":").map(Number);
      return (endH * 60 + endM) - (startH * 60 + startM);
    }
    if (task.preferred_time_slot?.start && task.preferred_time_slot?.end) {
      const [startH, startM] = task.preferred_time_slot.start.split(":").map(Number);
      const [endH, endM] = task.preferred_time_slot.end.split(":").map(Number);
      return (endH * 60 + endM) - (startH * 60 + startM);
    }
    return task.estimated_duration_minutes || 30;
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getObligationColor = (level: ObligationLevel, isInfo: boolean): string => {
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
        className={`absolute left-0 right-0 mx-0.5 overflow-hidden rounded p-1 text-xs transition-all ${
          onTaskClick ? "cursor-pointer hover:shadow-md hover:z-20" : ""
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
            <IconCheck size={10} className="text-green-600 flex-shrink-0" />
          ) : task.status === TaskStatus.IN_PROGRESS ? (
            <IconCircle size={8} className="animate-pulse text-blue-500 flex-shrink-0" />
          ) : null}
          <span className="truncate font-medium">{task.title}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Week Header */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {parseLocalDate(weekDays[0].date).toLocaleDateString(currentLocale, { month: "long", day: "numeric" })}
          {" - "}
          {parseLocalDate(weekDays[6].date).toLocaleDateString(currentLocale, { month: "long", day: "numeric" })}
        </span>
        <span>{visibleTasks.length} {t('common:tasks')}</span>
      </div>

      {/* Week Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px] rounded-lg border bg-white">
          {/* Day Headers */}
          <div className="grid grid-cols-8 border-b bg-gray-50 sticky top-0 z-20">
            <div className="border-r p-2 text-xs font-medium text-gray-500">{t("common:time")}</div>
            {weekDays.map((day) => {
              const dayType = dayTypes?.get(day.date);
              return (
                <div
                  key={day.date}
                  className={`border-r last:border-r-0 p-2 text-center ${getDayTypeBgClass(dayType)}`}
                >
                  <div className={`text-xs font-semibold ${day.isToday ? "text-blue-700" : "text-gray-700"}`}>
                    {day.dayName}
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      day.isToday ? "text-blue-700" : "text-gray-900"
                    }`}
                  >
                    {day.dayNumber}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Grid with Tasks */}
          <div className="relative" style={{ minHeight: "1152px" }}>
            {/* 48px per hour × 24 hours = 1152px */}
            <div className="grid grid-cols-8">
              {/* Hour Labels Column */}
              <div className="border-r">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-gray-100 px-2 py-1 text-xs text-gray-500"
                    style={{ height: "48px" }}
                  >
                    {hour.toString().padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {weekDays.map((day) => {
                const dayType = dayTypes?.get(day.date);
                const dayTasks = tasksByDate.get(day.date) || [];
                const scheduledDayTasks = dayTasks.filter(t => getTaskTime(t) !== null);

                return (
                  <div
                    key={day.date}
                    className={`relative border-r last:border-r-0 ${getDayTypeBgClass(dayType)}`}
                  >
                    {/* Hour Grid Lines */}
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="border-b border-gray-100"
                        style={{ height: "48px" }}
                      />
                    ))}

                    {/* Task Blocks Overlay */}
                    <div className="absolute inset-0">
                      {scheduledDayTasks.map((task) => renderTaskBlock(task))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
