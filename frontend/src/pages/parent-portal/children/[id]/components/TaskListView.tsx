/**
 * TaskListView - Chronological list of tasks grouped by date with lazy loading
 */
import { useTranslation } from "react-i18next";
import { useRef, useState, useEffect, useCallback } from "react";
import { IconChecklist, IconPlus, IconCalendarTime } from "@tabler/icons-react";
import { Task } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { useDayTypesBatch } from "@/api/queries/useSchoolCalendar";
import { DayType } from "@/types/schoolCalendar";

interface TaskListViewProps {
  tasks: Task[];
  childId: string;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskStart: (taskId: string) => void;
  onTaskPause: (taskId: string) => void;
  onTaskResume: (taskId: string) => void;
  onTaskComplete: (taskId: string) => void;
  onCreateClick: () => void;
  isTaskOverdue: (task: Task) => boolean;
  onRestoreOccurrence?: (templateId: string, occurrenceDate: string) => void;
}

// Helper function to add/subtract days from a date string (YYYY-MM-DD)
const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export function TaskListView({
  tasks,
  childId,
  onTaskEdit,
  onTaskDelete,
  onTaskStart,
  onTaskPause,
  onTaskResume,
  onTaskComplete,
  onCreateClick,
  isTaskOverdue,
  onRestoreOccurrence,
}: TaskListViewProps) {
  const { t } = useTranslation(["common", "tasks"]);
  const todayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get today's date in local timezone
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Visible date range (initially: 7 days before today, 14 days after today)
  const [visibleRange, setVisibleRange] = useState<{ start: string; end: string }>({
    start: addDays(today, -7),
    end: addDays(today, 14),
  });

  // Cache all fetched day types in a Map to prevent flashing
  const [cachedDayTypes, setCachedDayTypes] = useState<Map<string, DayType>>(new Map());

  // Track if initial scroll has happened
  const hasScrolledRef = useRef(false);

  // Fixed fetch range - fetch a large range once and cache it
  const fetchStart = addDays(today, -90);
  const fetchEnd = addDays(today, 180);

  // Fetch day types for the fixed range
  const { data: dayTypes } = useDayTypesBatch(childId, fetchStart, fetchEnd);

  // Update cache when new day types are fetched
  useEffect(() => {
    if (dayTypes && dayTypes.length > 0) {
      setCachedDayTypes((prev) => {
        const newCache = new Map(prev);
        dayTypes.forEach((dt) => {
          newCache.set(dt.date, dt.day_type);
        });
        return newCache;
      });
    }
  }, [dayTypes]);

  const scrollToToday = () => {
    if (todayRef.current && containerRef.current) {
      // Get the position of today element relative to its offset parent
      const todayElement = todayRef.current;
      let offsetTop = 0;
      let element: HTMLElement | null = todayElement;

      // Calculate total offset from container
      while (element && element !== containerRef.current) {
        offsetTop += element.offsetTop;
        element = element.offsetParent as HTMLElement | null;
      }

      // Scroll the container smoothly, not the page
      containerRef.current.scrollTo({ top: offsetTop, behavior: "smooth" });
    }
  };

  // Group tasks by date
  const groupTasksByDate = useCallback(() => {
    const grouped: Record<string, Task[]> = {};

    tasks.forEach((task) => {
      const taskDate = task.scheduled_date?.split("T")[0];
      if (taskDate) {
        if (!grouped[taskDate]) {
          grouped[taskDate] = [];
        }
        grouped[taskDate].push(task);
      }
    });

    // Sort tasks within each date by time
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => {
        const timeA = a.fixed_time_slot?.start || "99:99";
        const timeB = b.fixed_time_slot?.start || "99:99";
        return timeA.localeCompare(timeB);
      });
    });

    return grouped;
  }, [tasks]);

  const tasksByDate = groupTasksByDate();

  // Generate all dates in visible range (including days with no tasks)
  const getVisibleDates = useCallback(() => {
    const dates: string[] = [];
    let currentDate = visibleRange.start;

    while (currentDate <= visibleRange.end) {
      dates.push(currentDate);
      currentDate = addDays(currentDate, 1);
    }

    return dates;
  }, [visibleRange]);

  const visibleDates = getVisibleDates();

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const threshold = 500; // Load more when within 500px of edge

    // Near top - load more past days
    if (scrollTop < threshold) {
      setVisibleRange((prev) => ({
        start: addDays(prev.start, -7),
        end: prev.end,
      }));
    }

    // Near bottom - load more future days
    if (scrollTop + clientHeight > scrollHeight - threshold) {
      setVisibleRange((prev) => ({
        start: prev.start,
        end: addDays(prev.end, 7),
      }));
    }
  }, []);

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Auto-scroll to today only on first mount (not when switching tabs)
  useEffect(() => {
    if (todayRef.current && containerRef.current && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
      // Small delay to ensure layout is ready
      setTimeout(() => {
        if (todayRef.current && containerRef.current) {
          // Get the position of today element relative to its offset parent
          const todayElement = todayRef.current;
          let offsetTop = 0;
          let element: HTMLElement | null = todayElement;

          // Calculate total offset from container
          while (element && element !== containerRef.current) {
            offsetTop += element.offsetTop;
            element = element.offsetParent as HTMLElement | null;
          }

          // Scroll the container, not the page
          containerRef.current.scrollTop = offsetTop;
        }
      }, 100);
    }
  }, []);

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow">
        <IconChecklist className="mx-auto mb-4 h-16 w-16 text-gray-400" />
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          {t("tasks:task_list.empty_title")}
        </h3>
        <p className="mb-6 text-gray-600">
          {t("tasks:task_list.empty_description")}
        </p>
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
        >
          <IconPlus size={20} />
          <span>{t("tasks:task_list.create_first")}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100vh-20rem)] overflow-y-auto rounded-lg bg-gray-50 p-4"
    >
      {/* Floating Go to Today Button */}
      <button
        onClick={scrollToToday}
        className="fixed right-8 bottom-8 z-10 flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
        title={t("tasks:go_to_today")}
      >
        <IconCalendarTime size={20} />
        <span className="hidden sm:inline">{t("common:today")}</span>
      </button>

      <div className="space-y-6">
        {visibleDates.map((date) => {
          const isToday = date === today;
          const isPast = date < today;
          const dateTasks = tasksByDate[date] || [];

          // Skip rendering empty dates that are far from today
          if (dateTasks.length === 0) {
            // Only show empty dates within 3 days of today
            const daysDiff = Math.abs((new Date(date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff > 3) {
              return null;
            }
          }

          return (
            <div
              key={date}
              ref={isToday ? todayRef : null}
              className="rounded-lg bg-white p-6 shadow"
            >
              {/* Date Header */}
              <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {new Date(date + "T00:00:00").toLocaleDateString(undefined, {
                      weekday: "short",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>
                  {isToday && (
                    <span className="rounded bg-blue-100 px-2 py-1 text-sm font-medium text-blue-700">
                      {t("common:today")}
                    </span>
                  )}
                  {isPast && !isToday && (
                    <span className="rounded bg-gray-100 px-2 py-1 text-sm font-medium text-gray-600">
                      {t("common:past")}
                    </span>
                  )}
                  {(() => {
                    const dayType = cachedDayTypes.get(date);
                    if (!dayType) return null;

                    const dayTypeConfig: Record<DayType, { bg: string; text: string; label: string }> = {
                      school_day: {
                        bg: "bg-blue-100",
                        text: "text-blue-700",
                        label: t("tasks:school_calendar.school_day")
                      },
                      weekend: {
                        bg: "bg-gray-100",
                        text: "text-gray-700",
                        label: t("tasks:school_calendar.weekend")
                      },
                      holiday: {
                        bg: "bg-green-100",
                        text: "text-green-700",
                        label: t("tasks:school_calendar.holiday")
                      },
                      special_school_day: {
                        bg: "bg-purple-100",
                        text: "text-purple-700",
                        label: t("tasks:school_calendar.special_school_day")
                      },
                    };

                    const config = dayTypeConfig[dayType];
                    return (
                      <span className={`rounded px-2 py-1 text-sm font-medium ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                    );
                  })()}
                </div>
                <span className="text-sm text-gray-600">
                  {dateTasks.length} {t("common:tasks")}
                </span>
              </div>

              {/* Tasks for this date */}
              {dateTasks.length > 0 ? (
                <div className="space-y-3">
                  {dateTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      isOverdue={isTaskOverdue(task)}
                      onStart={onTaskStart}
                      onPause={onTaskPause}
                      onResume={onTaskResume}
                      onComplete={onTaskComplete}
                      onEdit={onTaskEdit}
                      onDelete={onTaskDelete}
                      onRestore={onRestoreOccurrence}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-gray-500">
                  {t("tasks:task_list.no_tasks_for_day")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
