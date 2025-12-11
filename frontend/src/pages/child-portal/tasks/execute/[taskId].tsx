/**
 * Task Execution Page
 * Routes to unified execution page for both standard and template tasks
 */
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import UnifiedExecutionPage from "@/components/execution/UnifiedExecutionPage";

export default function TaskExecutePage() {
  const { taskId, childId } = useParams<{ taskId: string; childId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(["tasks", "common", "errors"]);

  // Fetch task details
  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tasks/${taskId}`);
      return response.data;
    },
    enabled: !!taskId,
  });

  const handleComplete = () => {
    // Navigate back to task list
    navigate(`/child-portal/${childId}/tasks`, { replace: true });
  };

  const handleCancel = () => {
    navigate(-1);
  };

  // Loading state
  if (taskLoading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  // Error states
  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t("tasks:task_not_found")}
            </h2>
            <p className="text-gray-600 mb-6">{t("tasks:task_not_found_desc")}</p>
            <button
              onClick={() => navigate(`/child-portal/${childId}/tasks`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t("tasks:back_to_tasks")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isTemplateTask = !!task.template_id;

  // Render unified execution page
  // For template tasks, the UnifiedExecutionPage will need to render the template executor
  // For now, we'll pass null and handle template tasks separately later
  return (
    <UnifiedExecutionPage
      task={task}
      childId={childId!}
      taskId={taskId!}
      onComplete={handleComplete}
      onCancel={handleCancel}
      templateExecutor={null}
      isTemplateTask={isTemplateTask}
    />
  );
}
