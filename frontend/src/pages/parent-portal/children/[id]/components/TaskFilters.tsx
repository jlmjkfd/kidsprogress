/**
 * TaskFilters - Filter controls for tasks
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconFilter, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
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
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if any filters are active
  const hasActiveFilters = statusFilter !== "all" || schedulingTypeFilter !== "all" || obligationFilter !== "all";

  return (
    <div className="rounded-lg bg-white shadow-sm border border-gray-200">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <IconFilter size={16} className="text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">{t("common:filters")}</h3>
          {hasActiveFilters && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
              {t("common:active")}
            </span>
          )}
        </div>
        {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
      </button>

      {/* Expandable Filter Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-3">
        {/* Status Filter */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            {t("tasks:status")}
          </label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as TaskStatus | "all")}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">{t("tasks:all_statuses")}</option>
            <option value={TaskStatus.PENDING}>{t("tasks:pending")}</option>
            <option value={TaskStatus.IN_PROGRESS}>{t("tasks:in_progress")}</option>
            <option value={TaskStatus.PAUSED}>{t("tasks:paused")}</option>
            <option value={TaskStatus.COMPLETED}>{t("tasks:completed")}</option>
            <option value={TaskStatus.SKIPPED}>{t("tasks:skipped")}</option>
          </select>
        </div>

        {/* Scheduling Type Filter */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            {t("tasks:scheduling_type")}
          </label>
          <select
            value={schedulingTypeFilter}
            onChange={(e) =>
              onSchedulingTypeFilterChange(e.target.value as SchedulingType | "all")
            }
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <label className="mb-1 block text-xs font-medium text-gray-700">
            {t("tasks:obligation_level")}
          </label>
          <select
            value={obligationFilter}
            onChange={(e) =>
              onObligationFilterChange(e.target.value as ObligationLevel | "all")
            }
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">{t("tasks:all_levels")}</option>
            <option value={ObligationLevel.MUST_DO}>{t("tasks:must_do")}</option>
            <option value={ObligationLevel.SHOULD_DO}>{t("tasks:should_do")}</option>
            <option value={ObligationLevel.OPTIONAL}>{t("tasks:optional")}</option>
          </select>
        </div>
          </div>
        </div>
      )}
    </div>
  );
}
