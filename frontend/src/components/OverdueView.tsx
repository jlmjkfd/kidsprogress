/**
 * Overdue Tasks View Component
 * Displays overdue tasks grouped by obligation level with smart expansion
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  IconCheck,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { useOverdueTasks } from "@/api/queries/useTasks";
import { useCompleteTask, useCompleteRecurringTasksBulk } from "@/api/mutations/useTaskMutations";
import { OverdueTaskCard } from "./OverdueTaskCard";
import LoadingSpinner from "./LoadingSpinner";

interface OverdueViewProps {
  childId: string;
}

export function OverdueView({ childId }: OverdueViewProps) {
  const { t } = useTranslation(["tasks"]);
  const { data: overdueTasks, isLoading } = useOverdueTasks(childId);
  const completeTaskMutation = useCompleteTask();
  const completeBulkMutation = useCompleteRecurringTasksBulk();

  const [shouldDoExpanded, setShouldDoExpanded] = useState(true);
  const [optionalExpanded, setOptionalExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!overdueTasks) {
    return null;
  }

  const totalOverdue =
    overdueTasks.must_do.length +
    overdueTasks.should_do.length +
    overdueTasks.optional.length;

  if (totalOverdue === 0) {
    return (
      <div className="rounded-3xl bg-white p-12 text-center shadow-xl">
        <IconCheck className="mx-auto mb-4 text-green-400" size={80} />
        <h3 className="mb-2 text-3xl font-bold text-gray-900">
          {t("tasks:child_portal.all_done")}
        </h3>
        <p className="text-xl text-gray-600">
          {t("tasks:overdue_view.no_overdue")}
        </p>
      </div>
    );
  }

  const handleMarkDone = async (taskId: string) => {
    try {
      await completeTaskMutation.mutateAsync({ taskId, childId });
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  const handleMarkAllDone = async (sourceId: string) => {
    if (!overdueTasks) return;

    // Find the recurring task to get all its dates
    const allTasks = [
      ...overdueTasks.must_do,
      ...overdueTasks.should_do,
      ...overdueTasks.optional,
    ];
    const recurringTask = allTasks.find(
      (task) => task.is_recurring && task.source_id === sourceId
    );

    if (!recurringTask || !recurringTask.is_recurring) {
      console.error("Recurring task not found:", sourceId);
      return;
    }

    try {
      const result = await completeBulkMutation.mutateAsync({
        sourceId,
        childId,
        dateList: recurringTask.recent_missed_dates,
      });

      if (result.failed_count > 0) {
        console.error("Some tasks failed to complete:", result.errors);
      }
    } catch (error) {
      console.error("Failed to complete tasks in bulk:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {overdueTasks.must_do.length > 0 && (
        <div className="rounded-3xl bg-gradient-to-r from-orange-50 to-red-50 p-4 shadow-xl sm:p-6">
          <div className="flex items-center gap-3">
            <IconAlertTriangle size={28} className="text-red-600" />
            <div>
              <h3 className="text-xl font-bold text-gray-900 sm:text-2xl">
                {t("tasks:overdue_view.must_do_count", { count: overdueTasks.must_do.length })}
              </h3>
              <p className="text-sm text-gray-600 sm:text-base">
                {totalOverdue} {t("tasks:overdue_tasks")} {t("common:total").toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MUST DO Section - Always visible, never collapsible */}
      {overdueTasks.must_do.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-1 rounded-full bg-red-600"></div>
            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
              🔴 {t("tasks:overdue_view.must_do")} ({overdueTasks.must_do.length})
            </h2>
          </div>
          <div className="space-y-3">
            {overdueTasks.must_do.map((task) => (
              <OverdueTaskCard
                key={task.task_id}
                task={task}
                childId={childId}
                onMarkDone={handleMarkDone}
                onMarkAllDone={handleMarkAllDone}
              />
            ))}
          </div>
        </div>
      )}

      {/* SHOULD DO Section - Collapsible */}
      {overdueTasks.should_do.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShouldDoExpanded(!shouldDoExpanded)}
            className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-yellow-50 to-orange-50 p-4 transition-colors hover:from-yellow-100 hover:to-orange-100"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-1 rounded-full bg-yellow-600"></div>
              <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                🟡 {t("tasks:overdue_view.should_do")} ({overdueTasks.should_do.length})
              </h2>
            </div>
            {shouldDoExpanded ? <IconChevronUp size={24} /> : <IconChevronDown size={24} />}
          </button>

          {shouldDoExpanded && (
            <div className="space-y-3 pl-0 sm:pl-4">
              {overdueTasks.should_do.map((task) => (
                <OverdueTaskCard
                  key={task.task_id}
                  task={task}
                  childId={childId}
                  onMarkDone={handleMarkDone}
                  onMarkAllDone={handleMarkAllDone}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* OPTIONAL Section - Collapsed by default */}
      {overdueTasks.optional.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setOptionalExpanded(!optionalExpanded)}
            className="flex w-full items-center justify-between rounded-2xl bg-gray-100 p-4 transition-colors hover:bg-gray-200"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-1 rounded-full bg-gray-400"></div>
              <h2 className="text-xl font-bold text-gray-700 sm:text-2xl">
                ⚪ {t("tasks:overdue_view.optional")} ({overdueTasks.optional.length})
              </h2>
            </div>
            {optionalExpanded ? <IconChevronUp size={24} /> : <IconChevronDown size={24} />}
          </button>

          {optionalExpanded && (
            <div className="space-y-3 pl-0 sm:pl-4">
              {overdueTasks.optional.map((task) => (
                <OverdueTaskCard
                  key={task.task_id}
                  task={task}
                  childId={childId}
                  onMarkDone={handleMarkDone}
                  onMarkAllDone={handleMarkAllDone}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
