/**
 * Task Execution Page
 * Routes to unified execution page for both standard and template tasks
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useSubmitCompletion } from "@/api/mutations/useCompletionMutations";
import { getPlugin } from "@/templates/registry";
import type { PrepareExecutionResponse } from "@/types/template";
import LoadingSpinner from "@/components/LoadingSpinner";
import UnifiedExecutionPage from "@/components/execution/UnifiedExecutionPage";

export default function TaskExecutePage() {
  const { taskId, childId } = useParams<{ taskId: string; childId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(["tasks", "common", "errors"]);
  const [isComplete, setIsComplete] = useState(false);

  // Fetch task details
  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tasks/${taskId}`);
      return response.data;
    },
    enabled: !!taskId,
  });

  // Fetch execution data for template tasks
  const { data: executionData, isLoading: executionLoading } = useQuery({
    queryKey: ["execution", taskId],
    queryFn: async () => {
      const response = await apiClient.get<PrepareExecutionResponse>(
        `/api/completions/${taskId}/prepare`
      );
      return response.data;
    },
    enabled: !!taskId && !!task?.template_id,
  });

  const submitCompletion = useSubmitCompletion();

  const handleComplete = () => {
    // Navigate back to task list
    navigate(`/child-portal/${childId}/tasks`, { replace: true });
  };

  const handleCancel = () => {
    navigate(-1);
  };

  // For template tasks, handle completion submission
  const handleTemplateComplete = async (completionData: unknown) => {
    if (!taskId || !task?.child_id) return;

    try {
      const result = await submitCompletion.mutateAsync({
        taskId,
        data: {
          child_id: task.child_id,
          completion_data: completionData as Record<string, any>,
        },
      });

      // Navigate to attempt detail
      navigate(
        `/child-portal/${childId}/tasks/attempts/${taskId}?completionId=${result.completion_id}`,
        { replace: true }
      );
    } catch (error) {
      console.error("Failed to submit completion:", error);
      alert(t("errors:submission_failed"));
    }
  };

  // Loading state
  if (taskLoading || (task?.template_id && executionLoading)) {
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

  // Render template executor if this is a template task
  let templateExecutor = null;
  if (isTemplateTask && executionData) {
    const plugin = getPlugin(task.template_id!);

    if (!plugin) {
      return (
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {t("tasks:executor_not_found")}
              </h2>
              <p className="text-gray-600 mb-6">
                {t("tasks:executor_not_found_desc", { type: task.template_id })}
              </p>
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

    const ExecutorComponent = plugin.components.TaskExecutor;
    templateExecutor = (
      <ExecutorComponent
        taskId={taskId!}
        executionData={executionData.execution_data}
        onComplete={handleTemplateComplete}
        onCancel={handleCancel}
        setIsComplete={setIsComplete}
      />
    );
  }

  // Render unified execution page
  return (
    <UnifiedExecutionPage
      task={task}
      childId={childId!}
      taskId={taskId!}
      onComplete={handleComplete}
      onCancel={handleCancel}
      templateExecutor={templateExecutor}
      isTemplateTask={isTemplateTask}
    />
  );
}
