/**
 * TaskListView - Chronological list of tasks grouped by date with virtual scrolling
 */
import { useTranslation } from "react-i18next";
import { useRef, useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { IconChecklist, IconPlus, IconCalendarTime } from "@tabler/icons-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLocation } from "react-router-dom";
import { Task } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { useDayTypesBatch } from "@/api/queries/useSchoolCalendar";
import { DayType } from "@/types/schoolCalendar";
import { ScrollPositionManager } from "@/utils/ScrollAnchor";

interface TaskListViewProps {
  tasks: Task[];
  childId: string;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskComplete: (task: Task) => void; // Parent complete with time modal
  onTaskUncomplete: (taskId: string) => void;
  onTaskSkip: (taskId: string) => void;
  onCreateClick: () => void;
  isTaskOverdue: (task: Task) => boolean;
  onRestoreOccurrence?: (templateId: string, occurrenceDate: string) => void;
  onRestoreSkipped?: (taskId: string) => void;
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
  onTaskComplete,
  onTaskUncomplete,
  onTaskSkip,
  onCreateClick,
  isTaskOverdue,
  onRestoreOccurrence,
  onRestoreSkipped,
}: TaskListViewProps) {
  const { t } = useTranslation(["common", "tasks"]);
  const location = useLocation();
  const parentRef = useRef<HTMLDivElement>(null);

  // Hide list during scroll restoration to prevent visible jumps
  const [isRestoring, setIsRestoring] = useState(() =>
    ScrollPositionManager.isReturningFromAttempts()
  );

  // Get today's date in local timezone
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // STABLE INDEX-TO-DATE MAPPING - The key to no scroll jumping
  // Range is large enough to cover typical usage, fixed at session start
  // Each index ALWAYS maps to the same date during the session
  const RANGE_PAST_DAYS = 180;   // 6 months history
  const RANGE_FUTURE_DAYS = 545;  // ~1.5 years future (365 + 180)

  // Calculate range ONCE - these never change during the session
  const rangeStart = useMemo(() => addDays(today, -RANGE_PAST_DAYS), [today]);
  const rangeEnd = useMemo(() => addDays(today, RANGE_FUTURE_DAYS), [today]);
  const totalDays = RANGE_PAST_DAYS + RANGE_FUTURE_DAYS + 1; // 726 days total

  // Index-to-Date mapping (STABLE - never changes)
  // index 0 = rangeStart, index 180 = today, index 725 = rangeEnd
  const indexToDate = useCallback((index: number): string => {
    return addDays(rangeStart, index);
  }, [rangeStart]);

  // Date-to-Index mapping (reverse lookup)
  const dateToIndex = useCallback((date: string): number => {
    const targetDate = new Date(date + 'T00:00:00');
    const startDate = new Date(rangeStart + 'T00:00:00');
    // Use Math.round to handle timezone/DST issues
    const diffDays = Math.round((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [rangeStart]);

  // Cache all fetched day types in a Map to prevent flashing
  const [cachedDayTypes, setCachedDayTypes] = useState<Map<string, DayType>>(new Map());

  // Fetch day types for the fixed range
  const { data: dayTypes } = useDayTypesBatch(childId, rangeStart, rangeEnd);

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

  // Group tasks by date (hierarchical structure - better UX)
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

  // Virtualizer count = total days in range
  // Each index maps to exactly one date via indexToDate()
  const virtualizer = useVirtualizer({
    count: totalDays,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated height per date section
    overscan: 5,
  });

  // No infinite scroll expansion - fixed range is loaded upfront
  // Virtual rendering handles performance (only renders visible items)
  const isInitialLoadRef = useRef(true);

  // Restore scroll position when returning from attempts view OR scroll to today on first load
  const hasScrolledToTodayRef = useRef(false);
  const hasRestoredScrollRef = useRef(false);

  // Scroll restoration - MUST use useLayoutEffect to run before paint
  useLayoutEffect(() => {
    if (ScrollPositionManager.isReturningFromAttempts() && !hasRestoredScrollRef.current) {
      hasRestoredScrollRef.current = true;
      hasScrolledToTodayRef.current = true; // Prevent scroll to today

      ScrollPositionManager.clearReturningFlag();

      const position = ScrollPositionManager.restore();
      console.log('[Scroll Restore] Position:', position);

      if (!position) {
        setIsRestoring(false);
        return;
      }

      // Strategy: Scroll to date section first, then to task
      // List is hidden (visibility: hidden) until restoration completes
      console.log('[Scroll Restore] Restoring to index:', position.index, 'task:', position.taskId);

      // Step 1: Scroll to date section using virtualizer API
      virtualizer.scrollToIndex(position.index, { align: 'start' });

      // Step 2: Wait for task element to exist, then scroll to it
      let attempts = 0;
      const tryScrollToTask = () => {
        console.log('[Scroll Restore] Attempt', attempts, 'looking for task');
        const taskElement = document.getElementById(position.taskId);
        if (taskElement) {
          console.log('[Scroll Restore] Task found on attempt', attempts);

          // IMPORTANT: Show list first, THEN scroll
          // scrollIntoView doesn't work on hidden elements
          setIsRestoring(false);

          // Wait for visibility change to take effect, then scroll
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              console.log('[Scroll Restore] List visible, now scrolling to task');
              taskElement.scrollIntoView({ block: 'center', behavior: 'auto' });
              console.log('[Scroll Restore] scrollIntoView called');
            });
          });

          ScrollPositionManager.clear();
        } else if (attempts++ < 20) {  // Increased attempts
          console.log('[Scroll Restore] Task not found, retrying...');
          requestAnimationFrame(tryScrollToTask);
        } else {
          console.log('[Scroll Restore] Task not found after 20 attempts, showing list anyway');
          setIsRestoring(false);
        }
      };

      requestAnimationFrame(tryScrollToTask);

      // Enable initial load flag
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    } else if (!ScrollPositionManager.isReturningFromAttempts()) {
      // Not restoring, show list immediately
      setIsRestoring(false);
    }
  }, [location.pathname, virtualizer]);

  // Separate effect for initial scroll to today
  useEffect(() => {
    if (!hasScrolledToTodayRef.current && totalDays > 0) {
      hasScrolledToTodayRef.current = true;

      // Find today's index using dateToIndex mapping
      const todayIndex = dateToIndex(today);
      console.log('[Initial Scroll] Today:', today, 'Index:', todayIndex, 'Total days:', totalDays);
      console.log('[Initial Scroll] Range:', rangeStart, 'to', rangeEnd);

      if (todayIndex >= 0 && todayIndex < totalDays) {
        const scrollToTodayAttempt = () => {
          // Double-check that scroll restoration hasn't taken over
          if (hasRestoredScrollRef.current) {
            console.log('[Initial Scroll] Scroll already restored, aborting scroll to today');
            return;
          }
          requestAnimationFrame(() => {
            console.log('[Initial Scroll] Attempting scroll to index:', todayIndex);
            virtualizer.scrollToIndex(todayIndex, { align: 'center' });
          });
        };

        // Multiple attempts with increasing delays
        scrollToTodayAttempt();
        setTimeout(scrollToTodayAttempt, 100);
        setTimeout(scrollToTodayAttempt, 300);
        setTimeout(scrollToTodayAttempt, 500);

        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 1000);
      } else {
        console.error('[Initial Scroll] Today index out of range:', todayIndex);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalDays, today]);

  const scrollToToday = () => {
    const todayIndex = dateToIndex(today);
    if (todayIndex >= 0 && todayIndex < totalDays) {
      virtualizer.scrollToIndex(todayIndex, { align: 'center' });
    }
  };

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
    <div className="relative">
      {/* Floating Go to Today Button */}
      <button
        onClick={scrollToToday}
        className="fixed right-8 bottom-8 z-10 flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
        title={t("tasks:go_to_today")}
      >
        <IconCalendarTime size={20} />
        <span className="hidden sm:inline">{t("common:today")}</span>
      </button>

      {/* Virtual scrolling container */}
      <div
        ref={parentRef}
        data-scroll-container="task-list"
        className="h-[calc(100vh-20rem)] overflow-y-auto rounded-lg bg-gray-50 p-4"
        style={{
          visibility: isRestoring ? 'hidden' : 'visible'
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            // Map index to date using stable mapping
            const date = indexToDate(virtualRow.index);
            const isToday = date === today;
            const isPast = date < today;
            const dateTasks = tasksByDate[date] || [];

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="mb-6 rounded-lg bg-white p-6 shadow">
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
                          virtualIndex={virtualRow.index}
                          scrollContainerRef={parentRef}
                          isOverdue={isTaskOverdue(task)}
                          onComplete={onTaskComplete}
                          onUncomplete={onTaskUncomplete}
                          onSkip={onTaskSkip}
                          onEdit={onTaskEdit}
                          onDelete={onTaskDelete}
                          onRestore={onRestoreOccurrence}
                          onRestoreSkipped={onRestoreSkipped}
                          viewMode="list"
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-sm text-gray-500">
                      {t("tasks:task_list.no_tasks_for_day")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
