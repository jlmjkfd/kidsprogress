/**
 * Task Execution Page
 * Dynamic executor based on task template
 */
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconArrowLeft, IconCheck } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useSubmitCompletion } from "@/api/mutations/useCompletionMutations";
import { getPlugin } from "@/templates/registry";
import type { PrepareExecutionResponse } from "@/types/template";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function TaskExecutePage() {
  const { taskId, childId } = useParams<{ taskId: string; childId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(["tasks", "common"]);

  // Fetch task details
  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tasks/${taskId}`);
      return response.data;
    },
    enabled: !!taskId,
  });

  // Prepare execution data
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

  const handleComplete = async (completionData: unknown) => {
    if (!taskId || !task?.child_id) return;

    try {
      const result = await submitCompletion.mutateAsync({
        taskId,
        data: {
          child_id: task.child_id,
          completion_data: completionData as Record<string, any>,
        },
      });

      // Navigate to AttemptDetailView to show the completion
      navigate(`/child-portal/${childId}/tasks/attempts/${taskId}?completionId=${result.completion_id}`, {
        replace: true,
      });
    } catch (error) {
      console.error("Failed to submit completion:", error);
      alert(t("errors:submission_failed"));
    }
  };

  const handleBackToTasks = () => {
    navigate(`/child-portal/${childId}/tasks`, { replace: true });
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await apiClient.post(
        `/api/tasks/${taskId}/complete`,
        null,
        { params: { child_id: task?.child_id } }
      );
      handleBackToTasks();
    } catch (error) {
      console.error("Failed to complete task:", error);
      alert(t("errors:completion_failed"));
    }
  };

  // Loading state
  if (taskLoading || executionLoading) {
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
              onClick={() => navigate("/child-portal/tasks")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t("tasks:back_to_tasks")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // For standard tasks (no template_id), show simple completion page
  if (!task.template_id) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <IconArrowLeft size={20} />
              </button>
              <div className="flex-1">
                <h1 className="text-lg md:text-xl font-semibold text-gray-900">
                  {task.title}
                </h1>
                {task.description && (
                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Standard Task Executor */}
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
            <p className="text-gray-700 text-lg">
              {t("tasks:standard_task_instruction")}
            </p>

            <button
              onClick={() => handleCompleteTask(taskId!)}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-3"
            >
              <IconCheck size={24} />
              {t("tasks:mark_as_complete")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Template task - check for executionData
  if (!executionData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t("tasks:loading_execution")}
            </h2>
            <p className="text-gray-600">{t("common:please_wait")}</p>
          </div>
        </div>
      </div>
    );
  }

  // Get the appropriate executor component from plugin
  const plugin = getPlugin(task.template_id);
  if (!plugin) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t("tasks:executor_not_found")}
            </h2>
            <p className="text-gray-600 mb-6">
              {t("tasks:executor_not_found_desc", {
                type: task.template_id,
              })}
            </p>
            <button
              onClick={() => navigate("/child-portal/tasks")}
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <IconArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-lg md:text-xl font-semibold text-gray-900">
                {task.title}
              </h1>
              {task.description && (
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Executor Content */}
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <ExecutorComponent
            taskId={taskId!}
            executionData={executionData.execution_data}
            onComplete={handleComplete}
            onCancel={handleCancel}
            setIsComplete={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
