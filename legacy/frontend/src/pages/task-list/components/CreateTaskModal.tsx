/**
 * Create task modal with basic form
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconX } from "@tabler/icons-react";
import { useCreateTask } from "@/api/mutations/useTaskMutations";
import { useDefaultTaskCollection } from "@/api/queries/useTaskCollections";
import { TaskCreate } from "@/types/task";

interface CreateTaskModalProps {
  childId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateTaskModal({
  childId,
  isOpen,
  onClose,
}: CreateTaskModalProps) {
  const { t } = useTranslation(["common", "tasks"]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: defaultCollection } = useDefaultTaskCollection(childId);
  const createTaskMutation = useCreateTask();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !defaultCollection) return;

    const taskData: TaskCreate = {
      collection_id: defaultCollection._id,
      child_id: childId,
      title: title.trim(),
      description: description.trim() || undefined,
    };

    try {
      await createTaskMutation.mutateAsync(taskData);
      setTitle("");
      setDescription("");
      onClose();
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{t("tasks:create_new_task")}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <IconX size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t("tasks:task_title")} *
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t("tasks:task_title_placeholder")}
                  required
                  maxLength={200}
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t("tasks:description_optional")}
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t("tasks:description_placeholder")}
                  rows={3}
                />
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p
                  className="text-sm text-blue-800"
                  dangerouslySetInnerHTML={{ __html: t("tasks:draft_info") }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t("common:buttons.cancel")}
              </button>
              <button
                type="submit"
                disabled={!title.trim() || createTaskMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createTaskMutation.isPending ? t("tasks:creating") : t("tasks:create_task")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
