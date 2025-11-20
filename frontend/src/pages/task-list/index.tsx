/**
 * Task list page - displays tasks for a specific child and collection
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconPlus,
  IconArrowLeft,
  IconFilter,
  IconChecklist,
} from "@tabler/icons-react";
import { useTaskCollections } from "@/api/queries/useTaskCollections";
import { useTasksByChild } from "@/api/queries/useTasks";
import { TaskStatus } from "@/types/task";
import TaskStatusBadge from "@/components/TaskStatusBadge";
import CreateTaskModal from "./components/CreateTaskModal";

export default function TaskListPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(["common", "tasks"]);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: collections, isLoading: collectionsLoading } = useTaskCollections(
    childId || "",
    false
  );
  const { data: tasks, isLoading: tasksLoading } = useTasksByChild(
    childId || "",
    statusFilter
  );

  if (!childId) {
    return <div>Invalid child ID</div>;
  }

  const handleBack = () => {
    navigate(`/child/${childId}`);
  };

  const handleCreateTask = () => {
    setShowCreateModal(true);
  };

  const statusFilters = [
    { label: t("tasks:all"), value: undefined },
    { label: t("tasks:draft"), value: TaskStatus.PENDING },
    { label: t("tasks:scheduled"), value: TaskStatus.PENDING },
    { label: t("tasks:in_progress"), value: TaskStatus.IN_PROGRESS },
    { label: t("tasks:completed"), value: TaskStatus.COMPLETED },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <IconArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("tasks:title")}</h1>
                <p className="text-sm text-gray-600">
                  {collections?.length || 0} {t("tasks:collections")} • {tasks?.length || 0} {t("tasks:tasks")}
                </p>
              </div>
            </div>
            <button
              onClick={handleCreateTask}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <IconPlus size={20} />
              <span>{t("tasks:new_task")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <IconFilter size={20} className="text-gray-600" />
            <span className="font-medium text-gray-700">{t("tasks:filter_by_status")}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.label}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  statusFilter === filter.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {tasksLoading || collectionsLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">{t("common:loading")}</p>
          </div>
        ) : tasks && tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task._id}
                className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => console.log("Task clicked:", task._id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {task.title}
                      </h3>
                      <TaskStatusBadge status={task.status} size="sm" />
                    </div>
                    {task.description && (
                      <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {task.metrics && task.metrics.length > 0 && (
                        <span className="flex items-center gap-1">
                          <IconChecklist size={16} />
                          {task.metrics.length} {t("tasks:metrics")}
                        </span>
                      )}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <span>
                          {task.subtasks.filter((s) => s.completed).length}/
                          {task.subtasks.length} {t("tasks:subtasks")}
                        </span>
                      )}
                      <span className="text-gray-400">
                        {t("tasks:created")}{" "}
                        {new Date(task.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <IconChecklist size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t("tasks:no_tasks_yet")}
            </h3>
            <p className="text-gray-600 mb-4">
              {t("tasks:no_tasks_description")}
            </p>
            <button
              onClick={handleCreateTask}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <IconPlus size={20} />
              <span>{t("tasks:create_task")}</span>
            </button>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        childId={childId}
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
