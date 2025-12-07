import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconChevronDown } from "@tabler/icons-react";
import { TaskCompletion } from "@/types/template";

interface AttemptSidebarProps {
  completions: TaskCompletion[];
  selectedCompletionId: string | null;
  onSelectCompletion: (completionId: string) => void;
}

export function AttemptSidebar({
  completions,
  selectedCompletionId,
  onSelectCompletion,
}: AttemptSidebarProps) {
  const { t } = useTranslation(["tasks"]);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (completions.length === 0) return null;

  // Single attempt - no sidebar needed
  if (completions.length === 1) return null;

  const selectedCompletion = completions.find(c => c.completion_id === selectedCompletionId);
  const selectedIndex = completions.findIndex(c => c.completion_id === selectedCompletionId);
  const selectedAttemptNumber = selectedIndex >= 0 ? completions.length - selectedIndex : 1;

  // Mobile: Dropdown
  const MobileDropdown = () => (
    <div className="relative md:hidden">
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="flex w-full items-center justify-between rounded-xl bg-white p-4 shadow-lg"
      >
        <div className="flex-1 text-left">
          <p className="font-bold text-gray-900">
            {t("tasks:attempt_number", { number: selectedAttemptNumber })}
          </p>
        </div>
        <IconChevronDown
          size={20}
          className={`text-gray-600 transition-transform ${mobileOpen ? "rotate-180" : ""}`}
        />
      </button>

      {mobileOpen && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-96 overflow-y-auto rounded-xl bg-white shadow-xl">
          {completions.map((completion, index) => {
            const isSelected = completion.completion_id === selectedCompletionId;
            const attemptNumber = completions.length - index;
            return (
              <button
                key={completion.completion_id}
                onClick={() => {
                  onSelectCompletion(completion.completion_id);
                  setMobileOpen(false);
                }}
                className={`flex w-full items-center justify-between border-b p-4 text-left transition-colors last:border-b-0 ${
                  isSelected
                    ? "bg-purple-50 border-l-4 border-l-purple-600"
                    : "hover:bg-gray-50"
                }`}
              >
                <p className="font-bold text-gray-900">
                  {attemptNumber}
                </p>
                {completion.measured_data?.score !== undefined && (
                  <div className="rounded-full bg-green-100 px-2 py-1">
                    <span className="text-xs font-bold text-green-700">
                      {completion.measured_data.score}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // Desktop: Scrollable Sidebar
  const DesktopSidebar = () => (
    <div className="hidden w-64 shrink-0 md:block">
      <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-hidden rounded-2xl bg-white shadow-lg">
        <div className="border-b p-4">
          <h3 className="font-bold text-gray-900">{t("tasks:attempts")}</h3>
          <p className="text-sm text-gray-600">
            {t("tasks:total_attempts", { count: completions.length })}
          </p>
        </div>

        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
          {completions.map((completion, index) => {
            const isSelected = completion.completion_id === selectedCompletionId;
            const attemptNumber = completions.length - index; // Reverse: newest = highest number
            return (
              <button
                key={completion.completion_id}
                onClick={() => onSelectCompletion(completion.completion_id)}
                className={`w-full border-b p-4 text-left transition-colors last:border-b-0 ${
                  isSelected
                    ? "bg-purple-50 border-l-4 border-l-purple-600"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-lg font-bold ${
                      isSelected ? "text-purple-600" : "text-gray-900"
                    }`}
                  >
                    {attemptNumber}
                  </span>

                  {completion.measured_data?.score !== undefined && (
                    <div className="rounded-full bg-green-100 px-2 py-1">
                      <span className="text-xs font-bold text-green-700">
                        {completion.measured_data.score}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <MobileDropdown />
      <DesktopSidebar />
    </>
  );
}
