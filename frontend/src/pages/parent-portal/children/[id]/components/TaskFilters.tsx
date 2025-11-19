/**
 * TaskFilters - Filter controls for tasks
 */
import { useTranslation } from "react-i18next";
import { IconFilter } from "@tabler/icons-react";
import { TaskStatus, SchedulingType, ObligationLevel } from "@/types/task";

interface TaskFiltersProps {
  statusFilter: TaskStatus | "all";
  schedulingTypeFilter: SchedulingType | "all";
  obligationFilter: ObligationLevel | "all";
  onStatusFilterChange: (value: TaskStatus | "all") => void;
  onSchedulingTypeFilterChange: (value: SchedulingType | "all") => void;
  onObligationFilterChange: (value: ObligationLevel | "all") => void;
}

export function TaskFilters({
  statusFilter,
  schedulingTypeFilter,
  obligationFilter,
  onStatusFilterChange,
  onSchedulingTypeFilterChange,
  onObligationFilterChange,
}: TaskFiltersProps) {
  const { t } = useTranslation(["common", "tasks"]);

  return (
    <div className="mb-6 rounded-lg bg-white p-4 shadow">
      <div className="mb-3 flex items-center gap-2">
        <IconFilter size={20} className="text-gray-600" />
        <h3 className="font-semibold text-gray-900">{t("common:filters")}</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Status Filter */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t("tasks:status")}
          </label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as TaskStatus | "all")}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">{t("tasks:all_statuses")}</option>
            <option value={TaskStatus.DRAFT}>{t("tasks:draft")}</option>
            <option value={TaskStatus.SCHEDULED}>{t("tasks:scheduled")}</option>
            <option value={TaskStatus.IN_PROGRESS}>{t("tasks:in_progress")}</option>
            <option value={TaskStatus.PAUSED}>{t("tasks:paused")}</option>
            <option value={TaskStatus.COMPLETED}>{t("tasks:completed")}</option>
            <option value={TaskStatus.CANCELLED}>{t("tasks:cancelled")}</option>
          </select>
        </div>

        {/* Scheduling Type Filter */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t("tasks:scheduling_type")}
          </label>
          <select
            value={schedulingTypeFilter}
            onChange={(e) =>
              onSchedulingTypeFilterChange(e.target.value as SchedulingType | "all")
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">{t("tasks:all_types")}</option>
            <option value={SchedulingType.FLEXIBLE}>{t("tasks:flexible")}</option>
            <option value={SchedulingType.FIXED_TIME}>{t("tasks:fixed_time")}</option>
            <option value={SchedulingType.TIME_WINDOW}>{t("tasks:time_window")}</option>
            <option value={SchedulingType.DEADLINE}>{t("tasks:deadline")}</option>
            <option value={SchedulingType.POOL}>{t("tasks:pool")}</option>
          </select>
        </div>

        {/* Obligation Level Filter */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t("tasks:obligation_level")}
          </label>
          <select
            value={obligationFilter}
            onChange={(e) =>
              onObligationFilterChange(e.target.value as ObligationLevel | "all")
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">{t("tasks:all_levels")}</option>
            <option value={ObligationLevel.MUST_DO}>{t("tasks:must_do")}</option>
            <option value={ObligationLevel.SHOULD_DO}>{t("tasks:should_do")}</option>
            <option value={ObligationLevel.OPTIONAL}>{t("tasks:optional")}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
