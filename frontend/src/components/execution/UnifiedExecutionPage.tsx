/**
 * Unified Execution Page
 * Handles execution for both standard tasks (with tools) and template tasks
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { IconArrowLeft, IconCheck, IconX, IconDeviceFloppy } from "@tabler/icons-react";
import { getSystemTools } from "@/tools";
import type { ToolData, ExecutionSession } from "@/tools/types";
import type { Task } from "@/types/task";
import { apiClient } from "@/api/client";

interface UnifiedExecutionPageProps {
  task: Task;
  childId: string;
  taskId: string;
  onComplete: () => void;
  onCancel: () => void;
  // For template tasks
  templateExecutor?: React.ReactNode;
  isTemplateTask: boolean;
}

export default function UnifiedExecutionPage({
  task,
  childId,
  taskId,
  onComplete,
  onCancel,
  templateExecutor,
  isTemplateTask,
}: UnifiedExecutionPageProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const queryClient = useQueryClient();
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);

  // Tool states
  const [toolStates, setToolStates] = useState<Record<string, ToolData>>(() => {
    const systemTools = getSystemTools();
    const initial: Record<string, ToolData> = {};

    // Initialize from task.progress_state if exists
    if (task.progress_state?.tools) {
      return task.progress_state.tools;
    }

    // Otherwise initialize with default states
    systemTools.forEach((tool) => {
      initial[tool.id] = {
        toolId: tool.id,
        state: tool.defaultState,
        lastUpdated: new Date().toISOString(),
      };
    });
    return initial;
  });

  const systemTools = getSystemTools();

  // Auto-save tool states to localStorage every 10 seconds (ONLY for standard tasks)
  useEffect(() => {
    // Template tasks don't use the tool states system, so skip
    if (isTemplateTask) return;

    const saveToLocalStorage = () => {
      try {
        const session: ExecutionSession = {
          taskId,
          childId,
          startedAt: task.started_at || new Date().toISOString(),
          tools: toolStates,
        };
        localStorage.setItem(`execution-${taskId}`, JSON.stringify(session));
      } catch (error) {
        console.error("Failed to save to localStorage:", error);
      }
    };

    const interval = setInterval(saveToLocalStorage, 10000);
    return () => clearInterval(interval);
  }, [taskId, childId, task.started_at, toolStates, isTemplateTask]);

  // Auto-save to database every 60 seconds (ONLY for standard tasks)
  useEffect(() => {
    // Template tasks handle their own auto-save with their own data format
    if (isTemplateTask) return;

    const saveToDatabase = async () => {
      try {
        await apiClient.post(`/api/completions/${taskId}/save-progress`, {
          tools: toolStates,
          saved_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Failed to save progress to database:", error);
      }
    };

    const interval = setInterval(saveToDatabase, 60000);
    return () => clearInterval(interval);
  }, [taskId, toolStates, isTemplateTask]);

  const handleToolStateChange = (toolId: string, newState: any) => {
    setToolStates((prev) => ({
      ...prev,
      [toolId]: {
        toolId,
        state: newState,
        lastUpdated: new Date().toISOString(),
      },
    }));
  };

  const handleSaveAndExit = async () => {
    try {
      // Save progress to database
      await apiClient.post(`/api/completions/${taskId}/save-progress`, {
        tools: toolStates,
        saved_at: new Date().toISOString(),
      });

      // Invalidate queries to refresh task list with updated status
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });

      onCancel();
    } catch (error) {
      console.error("Failed to save progress:", error);
      alert(t("errors:save_failed"));
    }
  };

  const handleComplete = async () => {
    // Save final state
    try {
      await apiClient.post(`/api/completions/${taskId}/save-progress`, {
        tools: toolStates,
        saved_at: new Date().toISOString(),
      });

      // Complete the task
      await apiClient.post(`/api/tasks/${taskId}/complete`, null, {
        params: { child_id: childId },
      });

      // Clean up localStorage
      localStorage.removeItem(`execution-${taskId}`);

      // Invalidate all task-related queries to refresh the UI
      await queryClient.invalidateQueries();

      onComplete();
    } catch (error) {
      console.error("Failed to complete task:", error);
      alert(t("errors:completion_failed"));
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isTemplateTask ? "" : "pb-24"}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onCancel}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <IconArrowLeft size={20} />
              {t("common:back")}
            </button>
            <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div
          className={`grid grid-cols-1 gap-6 ${isTemplateTask ? "" : "lg:grid-cols-3"}`}
        >
          {/* Main Content Area */}
          <div className={isTemplateTask ? "" : "space-y-6 lg:col-span-2"}>
            {isTemplateTask ? (
              // Template task executor - full width, handles its own layout
              templateExecutor
            ) : (
              // Standard task - show description and notes tool
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                  {t("tasks:task_details")}
                </h2>
                {task.description && (
                  <p className="mb-6 text-gray-600">{task.description}</p>
                )}

                {/* Note tool for standard tasks */}
                {systemTools.map((tool) => {
                  if (tool.id === "note") {
                    const ToolComponent = tool.component;
                    return (
                      <ToolComponent
                        key={tool.id}
                        taskId={taskId}
                        childId={childId}
                        state={toolStates[tool.id]?.state || tool.defaultState}
                        onChange={(newState) =>
                          handleToolStateChange(tool.id, newState)
                        }
                        isActive={true}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>

          {/* Tools Sidebar - Only for standard tasks */}
          {!isTemplateTask && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">
                {t("tasks:tools")}
              </h3>

              {/* Tool Tabs */}
              <div className="flex flex-wrap gap-2">
                {systemTools.map((tool) => {
                  if (tool.id === "note" && !isTemplateTask) return null; // Note shown in main area for standard tasks

                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() =>
                        setActiveToolId(
                          activeToolId === tool.id ? null : tool.id
                        )
                      }
                      className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
                        activeToolId === tool.id
                          ? "bg-blue-600 text-white"
                          : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Icon size={18} />
                      {tool.name}
                    </button>
                  );
                })}
              </div>

              {/* Active Tool */}
              {activeToolId &&
                systemTools.map((tool) => {
                  if (tool.id === activeToolId) {
                    const ToolComponent = tool.component;
                    return (
                      <ToolComponent
                        key={tool.id}
                        taskId={taskId}
                        childId={childId}
                        state={toolStates[tool.id]?.state || tool.defaultState}
                        onChange={(newState) =>
                          handleToolStateChange(tool.id, newState)
                        }
                        isActive={true}
                      />
                    );
                  }
                  return null;
                })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Buttons - Only for standard tasks */}
      {!isTemplateTask && (
        <>
          <div className="fixed right-0 bottom-0 left-0 border-t border-gray-200 bg-white p-4 shadow-lg md:left-64">
            <div className="mx-auto flex max-w-7xl gap-3">
              <button
                onClick={() => setShowConfirmComplete(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-green-700"
              >
                <IconCheck size={24} />
                {t("tasks:complete_task")}
              </button>
              <button
                onClick={handleSaveAndExit}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <IconDeviceFloppy size={20} />
                {t("tasks:save_and_exit")}
              </button>
              <button
                onClick={onCancel}
                className="rounded-xl border-2 border-gray-300 px-6 py-4 font-semibold transition-colors hover:bg-gray-50"
              >
                {t("common:cancel")}
              </button>
            </div>
          </div>

          {/* Confirmation Modal */}
          {showConfirmComplete && (
            <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
              <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <h3 className="mb-4 text-xl font-bold text-gray-900">
                  {t("tasks:confirm_complete_title")}
                </h3>
                <p className="mb-6 text-gray-600">
                  {t("tasks:confirm_complete_message")}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleComplete}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-semibold text-white transition-colors hover:bg-green-700"
                  >
                    <IconCheck size={20} />
                    {t("common:yes")}
                  </button>
                  <button
                    onClick={() => setShowConfirmComplete(false)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-200 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-300"
                  >
                    <IconX size={20} />
                    {t("common:no")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
