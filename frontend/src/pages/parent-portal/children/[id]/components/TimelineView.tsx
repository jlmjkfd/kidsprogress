/**
 * TimelineView - Day/Week timeline view showing tasks in time slots
 */
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Task, SchedulingType } from "@/types/task";
import { IconClock, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

interface TimelineViewProps {
  tasks: Task[];
  selectedDate: string;
  onTaskClick: (task: Task) => void;
  onDateChange: (date: string) => void;
}

type ViewMode = "day" | "week";

// Time slot configuration (24-hour format)
const HOUR_START = 6; // 6 AM
const HOUR_END = 23; // 11 PM
const SLOT_HEIGHT = 60; // pixels per hour

export function TimelineView({
  tasks,
  selectedDate,
  onTaskClick,
  onDateChange,
}: TimelineViewProps) {
  const { t } = useTranslation(["common", "tasks"]);
  const [viewMode, setViewMode] = useState<ViewMode>("day");

  // Generate time slots (6 AM - 11 PM)
  const timeSlots = Array.from(
    { length: HOUR_END - HOUR_START + 1 },
    (_, i) => HOUR_START + i
  );

  // Parse time string (HH:MM) to decimal hours
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours + minutes / 60;
  };

  // Calculate position for a time (6 AM = 0, 11 PM = max)
  const getTimePosition = (timeStr: string): number => {
    const time = parseTime(timeStr);
    return (time - HOUR_START) * SLOT_HEIGHT;
  };

  // Calculate height for a time range
  const getTimeHeight = (startTime: string, endTime: string): number => {
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    return (end - start) * SLOT_HEIGHT;
  };

  // Filter tasks for selected date and categorize them
  const getTasksForDate = (date: string) => {
    const dateTasks = tasks.filter((task) => {
      const taskDate = task.scheduled_date?.split("T")[0];
      return taskDate === date && !task.is_deleted;
    });

    const fixedTasks: Task[] = [];
    const windowTasks: Task[] = [];
    const preferredTasks: Task[] = [];
    const flexibleTasks: Task[] = [];

    dateTasks.forEach((task) => {
      if (task.scheduling_type === SchedulingType.FIXED_TIME && task.fixed_time_slot) {
        fixedTasks.push(task);
      } else if (task.scheduling_type === SchedulingType.TIME_WINDOW && task.preferred_time_window) {
        windowTasks.push(task);
      } else if (task.preferred_time_slot) {
        preferredTasks.push(task);
      } else {
        flexibleTasks.push(task);
      }
    });

    return { fixedTasks, windowTasks, preferredTasks, flexibleTasks };
  };

  const { fixedTasks, windowTasks, preferredTasks, flexibleTasks } = getTasksForDate(selectedDate);

  // Navigate dates
  const addDays = (dateStr: string, days: number): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const handlePrevDay = () => {
    onDateChange(addDays(selectedDate, -1));
  };

  const handleNextDay = () => {
    onDateChange(addDays(selectedDate, 1));
  };

  const handleToday = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    onDateChange(today);
  };

  return (
    <div className="flex h-[calc(100vh-20rem)] gap-4">
      {/* Main Timeline */}
      <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevDay}
                className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
                title={t("common:previous")}
              >
                <IconChevronLeft size={20} />
              </button>
              <button
                onClick={handleToday}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                {t("common:today")}
              </button>
              <button
                onClick={handleNextDay}
                className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
                title={t("common:next")}
              >
                <IconChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="relative p-4">
          {/* Time labels and grid lines */}
          <div className="flex">
            {/* Time column */}
            <div className="w-20 flex-shrink-0">
              {timeSlots.map((hour) => (
                <div
                  key={hour}
                  className="relative flex items-start justify-end pr-3 text-xs text-gray-500"
                  style={{ height: `${SLOT_HEIGHT}px` }}
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Timeline area */}
            <div className="relative flex-1 border-l border-gray-200">
              {/* Grid lines */}
              {timeSlots.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-gray-100"
                  style={{ height: `${SLOT_HEIGHT}px` }}
                />
              ))}

              {/* Time Window Tasks (background, semi-transparent) */}
              {windowTasks.map((task) => {
                const top = getTimePosition(task.preferred_time_window!.start);
                const height = getTimeHeight(
                  task.preferred_time_window!.start,
                  task.preferred_time_window!.end
                );
                return (
                  <div
                    key={task._id}
                    className="absolute left-0 right-0 mx-2 cursor-pointer rounded-lg border-2 border-cyan-300 bg-cyan-50 bg-opacity-60 p-2 transition-all hover:bg-opacity-80 hover:shadow-md"
                    style={{ top: `${top}px`, height: `${height}px` }}
                    onClick={() => onTaskClick(task)}
                  >
                    <div className="flex items-start gap-2">
                      <IconClock size={16} className="mt-0.5 flex-shrink-0 text-cyan-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-cyan-900">{task.title}</p>
                        <p className="text-xs text-cyan-700">
                          {task.preferred_time_window!.start} - {task.preferred_time_window!.end}
                        </p>
                        {height > 60 && task.description && (
                          <p className="mt-1 truncate text-xs text-cyan-600">{task.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Preferred Time Tasks (dotted outline) */}
              {preferredTasks.map((task) => {
                const top = getTimePosition(task.preferred_time_slot!.start);
                const height = getTimeHeight(
                  task.preferred_time_slot!.start,
                  task.preferred_time_slot!.end
                );
                return (
                  <div
                    key={task._id}
                    className="absolute left-0 right-0 mx-2 cursor-pointer rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 bg-opacity-40 p-2 transition-all hover:bg-opacity-70 hover:shadow-md"
                    style={{ top: `${top}px`, height: `${height}px` }}
                    onClick={() => onTaskClick(task)}
                  >
                    <div className="flex items-start gap-2">
                      <IconClock size={16} className="mt-0.5 flex-shrink-0 text-blue-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-blue-900">{task.title}</p>
                        <p className="text-xs text-blue-700">
                          {task.preferred_time_slot!.start} - {task.preferred_time_slot!.end} ({t("tasks:preferred")})
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Fixed Time Tasks (solid blocks, on top) */}
              {fixedTasks.map((task) => {
                const top = getTimePosition(task.fixed_time_slot!.start);
                const height = getTimeHeight(
                  task.fixed_time_slot!.start,
                  task.fixed_time_slot!.end
                );
                return (
                  <div
                    key={task._id}
                    className="absolute left-0 right-0 mx-2 cursor-pointer rounded-lg border border-purple-400 bg-purple-100 p-2 shadow-sm transition-all hover:shadow-lg"
                    style={{ top: `${top}px`, height: `${height}px`, zIndex: 10 }}
                    onClick={() => onTaskClick(task)}
                  >
                    <div className="flex items-start gap-2">
                      <IconClock size={16} className="mt-0.5 flex-shrink-0 text-purple-700" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-purple-900">{task.title}</p>
                        <p className="text-xs font-medium text-purple-700">
                          {task.fixed_time_slot!.start} - {task.fixed_time_slot!.end}
                        </p>
                        {height > 60 && task.description && (
                          <p className="mt-1 truncate text-xs text-purple-600">{task.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar - Flexible/Unscheduled Tasks */}
      <div className="w-64 flex-shrink-0 overflow-y-auto rounded-lg bg-white p-4 shadow">
        <h4 className="mb-3 text-sm font-semibold text-gray-900">
          {t("tasks:flexible_tasks")}
        </h4>
        {flexibleTasks.length === 0 ? (
          <p className="text-xs text-gray-500">{t("tasks:no_flexible_tasks")}</p>
        ) : (
          <div className="space-y-2">
            {flexibleTasks.map((task) => (
              <div
                key={task._id}
                className="cursor-pointer rounded-lg border border-gray-200 bg-gray-50 p-3 transition-all hover:border-gray-300 hover:shadow-sm"
                onClick={() => onTaskClick(task)}
              >
                <p className="font-medium text-gray-900">{task.title}</p>
                {task.estimated_duration_minutes && (
                  <p className="mt-1 text-xs text-gray-600">
                    ~{task.estimated_duration_minutes} {t("common:minutes")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
