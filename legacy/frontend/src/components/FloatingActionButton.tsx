/**
 * FloatingActionButton (FAB) - Material Design inspired FAB with menu
 * Provides quick access to primary actions without taking permanent screen space
 */
import { useState, useRef, useEffect } from "react";
import {
  IconPlus,
  IconX,
  IconBolt,
  IconCalendarPlus,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

interface FABAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}

interface FloatingActionButtonProps {
  onQuickCapture: () => void;
  onPlanAhead: () => void;
  onAIRecommendation: () => void;
}

export function FloatingActionButton({
  onQuickCapture,
  onPlanAhead,
  onAIRecommendation,
}: FloatingActionButtonProps) {
  const { t } = useTranslation(["tasks"]);
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  const actions: FABAction[] = [
    {
      id: "quick-capture",
      label: t("tasks:quick_capture.button"),
      icon: <IconPlus size={20} />,
      onClick: onQuickCapture,
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      id: "plan-ahead",
      label: t("tasks:plan_ahead.button"),
      icon: <IconCalendarPlus size={20} />,
      onClick: onPlanAhead,
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      id: "ai-recommendation",
      label: t("tasks:ai_recommendation"),
      icon: <IconBolt size={20} />,
      onClick: onAIRecommendation,
      color: "bg-purple-500 hover:bg-purple-600",
    },
  ];

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleActionClick = (action: FABAction) => {
    action.onClick();
    setIsOpen(false);
  };

  return (
    <div ref={fabRef} className="fixed bottom-6 right-6 z-30 md:bottom-8 md:right-8">
      {/* Action Menu */}
      {isOpen && (
        <div className="mb-4 flex flex-col gap-2">
          {actions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={`group flex items-center justify-end gap-3 transition-all ${
                isOpen ? "animate-fade-in-up" : ""
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Label */}
              <span className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                {action.label}
              </span>

              {/* Action Button */}
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-110 ${action.color}`}
              >
                {action.icon}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all hover:scale-110 md:h-16 md:w-16 ${
          isOpen
            ? "rotate-45 bg-gray-700 hover:bg-gray-800"
            : "rotate-0 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        }`}
        aria-label={isOpen ? t("common:close") : t("common:open")}
      >
        {isOpen ? (
          <IconX size={28} className="text-white" />
        ) : (
          <IconPlus size={28} className="text-white" />
        )}
      </button>
    </div>
  );
}
