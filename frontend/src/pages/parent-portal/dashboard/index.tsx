/**
 * Parent Dashboard - Overview of all children's tasks and recent completions
 */
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconUser,
  IconPlus,
  IconChecklist,
  IconCheck,
  IconClock,
  IconChevronRight,
  IconCalendarEvent,
} from "@tabler/icons-react";
import { useChildren } from "@/api/queries/useChildren";
import { useTasksByChild } from "@/api/queries/useTasks";
import { calculateAge } from "@/types/child";
import { Child } from "@/types/child";
import { Task } from "@/types/task";
import AddChildModal from "../children/components/AddChildModal";
import LoadingSpinner from "@/components/LoadingSpinner";

// Helper to get local date string
const getLocalDateString = (date: Date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Child card with task stats
function ChildCard({ child }: { child: Child }) {
  const navigate = useNavigate();
  const { t } = useTranslation(["common", "tasks"]);
  const { data: tasks } = useTasksByChild(child._id);

  const today = getLocalDateString();
  const todayTasks = tasks?.filter(task => {
    const taskDate = task.scheduled_date?.split("T")[0];
    return taskDate === today;
  }) || [];

  const completedToday = todayTasks.filter(t => t.status === "completed").length;
  const totalToday = todayTasks.length;

  return (
    <button
      onClick={() => navigate(`/parent-portal/children/${child._id}/tasks`)}
      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left group border border-gray-100 hover:border-blue-200"
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
          {child.avatar_url ? (
            <img
              src={child.avatar_url}
              alt={child.name}
              className="w-full h-full rounded-xl object-cover"
            />
          ) : (
            <IconUser size={28} className="text-blue-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{child.name}</h3>
          <p className="text-sm text-gray-500">{t("common:age")}: {calculateAge(child.date_of_birth)}</p>
        </div>
        <IconChevronRight size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <IconChecklist size={18} className="text-gray-400" />
            <span className="text-sm text-gray-600">
              {completedToday}/{totalToday} {t("tasks:dashboard.tasks_today")}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// Recent completion item
function CompletionItem({ task, childName }: { task: Task; childName: string }) {
  const { t } = useTranslation(["tasks"]);

  const getTimeAgo = (dateStr: string) => {
    // Parse as UTC if no timezone specified, then compare with current local time
    let date = new Date(dateStr);
    // If the date string doesn't have timezone info, treat it as UTC
    if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
      date = new Date(dateStr + 'Z');
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t("tasks:dashboard.just_now");
    if (diffMins < 60) return t("tasks:dashboard.mins_ago", { count: diffMins });
    if (diffHours < 24) return t("tasks:dashboard.hours_ago", { count: diffHours });
    return t("tasks:dashboard.days_ago", { count: diffDays });
  };

  return (
    <div className="flex items-center gap-4 py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <IconCheck size={16} className="text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
        <p className="text-xs text-gray-500">{childName}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <IconClock size={14} />
        <span>{task.completed_at ? getTimeAgo(task.completed_at) : ""}</span>
      </div>
    </div>
  );
}

// Recent completions section - fetches and displays for a single child
function ChildRecentCompletions({
  child,
  onCompletionsReady
}: {
  child: Child;
  onCompletionsReady: (childId: string, completions: Array<{ task: Task; childName: string }>) => void;
}) {
  const { data: tasks } = useTasksByChild(child._id);

  // Extract completions and notify parent
  const completions = useMemo(() => {
    if (!tasks) return [];
    return tasks
      .filter(t => t.status === "completed" && t.completed_at)
      .map(task => ({ task, childName: child.name }));
  }, [tasks, child.name]);

  // Use useEffect for the side effect of notifying parent
  useEffect(() => {
    if (completions.length > 0 || tasks) {
      onCompletionsReady(child._id, completions);
    }
  }, [completions, child._id, onCompletionsReady, tasks]);

  return null; // This is a data-fetching component
}

// Recent completions list component
function RecentCompletionsList({ children }: { children: Child[] }) {
  const { t } = useTranslation(["tasks"]);
  const [completionsMap, setCompletionsMap] = useState<Record<string, Array<{ task: Task; childName: string }>>>({});

  const handleCompletionsReady = useMemo(() => {
    return (childId: string, completions: Array<{ task: Task; childName: string }>) => {
      setCompletionsMap(prev => {
        // Only update if different
        if (JSON.stringify(prev[childId]) !== JSON.stringify(completions)) {
          return { ...prev, [childId]: completions };
        }
        return prev;
      });
    };
  }, []);

  // Combine all completions and sort
  const allCompletions = useMemo(() => {
    const all = Object.values(completionsMap).flat();
    return all
      .sort((a, b) => {
        const dateA = new Date(a.task.completed_at || 0).getTime();
        const dateB = new Date(b.task.completed_at || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 10);
  }, [completionsMap]);

  return (
    <>
      {/* Hidden data fetchers */}
      {children.map(child => (
        <ChildRecentCompletions
          key={child._id}
          child={child}
          onCompletionsReady={handleCompletionsReady}
        />
      ))}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {allCompletions.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {allCompletions.map(({ task, childName }) => (
              <CompletionItem key={task._id} task={task} childName={childName} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <IconCheck size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">{t("tasks:dashboard.no_completions")}</p>
          </div>
        )}
      </div>
    </>
  );
}

export default function ParentDashboardPage() {
  const { t } = useTranslation(["common", "tasks"]);
  const { data: children, isLoading } = useChildren();
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(false);

  if (isLoading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {t("tasks:dashboard.title")}
        </h1>
        <p className="text-gray-500 mt-1">{t("tasks:dashboard.subtitle")}</p>
      </div>

      {/* Children Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <IconUser size={20} className="text-blue-600" />
            {t("tasks:dashboard.children")}
          </h2>
          <button
            onClick={() => setIsAddChildModalOpen(true)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <IconPlus size={18} />
            {t("common:add_child")}
          </button>
        </div>

        {children && children.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map(child => (
              <ChildCard key={child._id} child={child} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
            <IconUser size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">{t("common:no_children")}</p>
            <button
              onClick={() => setIsAddChildModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <IconPlus size={18} />
              {t("common:add_first_child")}
            </button>
          </div>
        )}
      </section>

      {/* Recent Completions Section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <IconCalendarEvent size={20} className="text-green-600" />
          {t("tasks:dashboard.recent_completions")}
        </h2>

        {children && children.length > 0 ? (
          <RecentCompletionsList children={children} />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <IconCheck size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">{t("tasks:dashboard.no_completions")}</p>
          </div>
        )}
      </section>

      {/* Add Child Modal */}
      <AddChildModal
        isOpen={isAddChildModalOpen}
        onClose={() => setIsAddChildModalOpen(false)}
      />
    </div>
  );
}
