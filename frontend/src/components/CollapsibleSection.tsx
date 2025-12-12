/**
 * CollapsibleSection - Reusable collapsible section component
 * Provides expand/collapse functionality with smooth animations
 */
import { useState, ReactNode } from "react";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

interface CollapsibleSectionProps {
  title: string;
  icon: ReactNode;
  count?: number;
  badge?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
  variant?: "default" | "primary" | "success" | "warning";
}

export function CollapsibleSection({
  title,
  icon,
  count,
  badge,
  defaultExpanded = true,
  children,
  variant = "default",
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const variantColors = {
    default: "text-gray-900",
    primary: "text-blue-600",
    success: "text-green-600",
    warning: "text-orange-600",
  };

  return (
    <div className="space-y-3">
      {/* Header - Clickable to toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="group flex w-full items-center gap-2 text-left transition-all hover:opacity-80"
      >
        {/* Chevron Icon */}
        <div className="flex-shrink-0">
          {isExpanded ? (
            <IconChevronDown size={24} className={variantColors[variant]} />
          ) : (
            <IconChevronUp size={24} className="text-gray-400" />
          )}
        </div>

        {/* Section Icon */}
        <div className={`flex-shrink-0 ${variantColors[variant]}`}>{icon}</div>

        {/* Title */}
        <h2 className={`text-lg font-bold ${variantColors[variant]}`}>
          {title}
        </h2>

        {/* Count Badge */}
        {count !== undefined && count > 0 && (
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-700">
            {count}
          </span>
        )}

        {/* Custom Badge */}
        {badge && <div className="flex-shrink-0">{badge}</div>}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Expand/Collapse Hint */}
        <span className="text-xs text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
          {isExpanded ? "Click to collapse" : "Click to expand"}
        </span>
      </button>

      {/* Content */}
      {isExpanded && <div className="space-y-3">{children}</div>}
    </div>
  );
}
