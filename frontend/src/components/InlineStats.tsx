/**
 * InlineStats - Compact inline display of task completion stats
 * Shows completed tasks count and points earned
 */
import { IconStar, IconTrophy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

interface InlineStatsProps {
  completedCount: number;
  pointsEarned: number;
}

export function InlineStats({ completedCount, pointsEarned }: InlineStatsProps) {
  const { t } = useTranslation(["tasks"]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-700 md:gap-3 md:text-base">
      <div className="flex items-center gap-1.5">
        <IconStar size={18} className="text-yellow-500" />
        <span>
          {completedCount} {t("tasks:tasks_count", { count: completedCount })}
        </span>
      </div>
      <span className="text-gray-300">•</span>
      <div className="flex items-center gap-1.5">
        <IconTrophy size={18} className="text-purple-500" />
        <span>
          {pointsEarned} {t("tasks:points_earned", { points: pointsEarned })}
        </span>
      </div>
    </div>
  );
}
