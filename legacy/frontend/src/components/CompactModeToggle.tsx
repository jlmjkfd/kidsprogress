/**
 * CompactModeToggle - Toggle between normal and compact view modes
 * Persists user preference in localStorage
 */
import { IconLayoutGrid, IconLayoutList } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

interface CompactModeToggleProps {
  isCompact: boolean;
  onToggle: (isCompact: boolean) => void;
}

export function CompactModeToggle({ isCompact, onToggle }: CompactModeToggleProps) {
  const { t } = useTranslation(["tasks", "common"]);

  return (
    <button
      onClick={() => onToggle(!isCompact)}
      className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow transition-all hover:bg-gray-50 hover:shadow-md"
      title={isCompact ? t("tasks:compact_mode_on") : t("tasks:compact_mode_off")}
      aria-label={t("tasks:compact_mode")}
    >
      {isCompact ? (
        <IconLayoutList size={18} className="text-blue-600" />
      ) : (
        <IconLayoutGrid size={18} className="text-gray-500" />
      )}
      <span className="hidden sm:inline">{t("tasks:compact_mode")}</span>
    </button>
  );
}
