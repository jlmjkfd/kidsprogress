/**
 * Activity Pool Management Page
 */
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconStar,
  IconPlayerPause,
  IconGift,
  IconClock,
} from "@tabler/icons-react";
import { useActivities } from "@/api/queries/useActivities";
import { useDefaultTaskCollection, useTaskCollections } from "@/api/queries/useTaskCollections";
import { useCreateTaskCollection } from "@/api/mutations/useTaskCollectionMutations";
import { useCreateActivity, useUpdateActivity, useDeleteActivity } from "@/api/mutations/useActivityMutations";
import { Activity, ActivityCreate, ActivityUpdate } from "@/types/enhanced-tasks";

export default function ActivitiesPage() {
  const { childId } = useParams<{ childId: string }>();
  const { t } = useTranslation(["common", "tasks"]);
  const { data: activities, isLoading } = useActivities(childId || "");
  const { data: defaultCollection } = useDefaultTaskCollection(childId || "");
  const { data: allCollections } = useTaskCollections(childId || "");
  const createActivityMutation = useCreateActivity();
  const updateActivityMutation = useUpdateActivity();
  const deleteActivityMutation = useDeleteActivity();
  const createCollectionMutation = useCreateTaskCollection();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>();
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  const handleCreate = async () => {
    const collectionToUse = defaultCollection || allCollections?.[0];

    if (!collectionToUse && !isCreatingCollection) {
      setIsCreatingCollection(true);
      try {
        await createCollectionMutation.mutateAsync({
          child_id: childId || "",
          name: "My Tasks",
          description: "Default task collection",
          color: "#3B82F6",
          icon: "checkbox",
        });
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error("Failed to create default collection:", error);
        alert("Failed to create task collection. Please try again.");
        setIsCreatingCollection(false);
        return;
      }
      setIsCreatingCollection(false);
    }

    setEditingActivity(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setIsModalOpen(true);
  };

  const handleDelete = async (activityId: string) => {
    if (!confirm(t("tasks:activity.confirm_delete"))) return;
    await deleteActivityMutation.mutateAsync(activityId);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="text-gray-600">{t("common:loading")}</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {t("tasks:activity.title")}
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            {t("tasks:activity.description")}
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={isCreatingCollection}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors min-h-[44px]"
        >
          <IconPlus size={20} />
          <span>{isCreatingCollection ? t("common:loading") : t("tasks:activity.create")}</span>
        </button>
      </div>

      {/* Activities List */}
      {!activities || activities.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <IconStar className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t("tasks:activity.empty_title")}
          </h3>
          <p className="text-gray-600 mb-6">{t("tasks:activity.empty_description")}</p>
          <button
            onClick={handleCreate}
            disabled={isCreatingCollection}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <IconPlus size={20} />
            <span>{isCreatingCollection ? t("common:loading") : t("tasks:activity.create_first")}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activities.map((activity) => (
            <div
              key={activity._id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {activity.title}
                    </h3>
                    {activity.activity_type === "reward_activity" && (
                      <IconGift size={18} className="text-amber-500" title={t("tasks:activity.type_reward")} />
                    )}
                  </div>
                  {activity.description && (
                    <p className="text-sm text-gray-600">{activity.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(activity)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors min-h-[44px] min-w-[44px]"
                    title={t("common:edit")}
                  >
                    <IconEdit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(activity._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors min-h-[44px] min-w-[44px]"
                    title={t("common:delete")}
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              </div>

              {/* Usage Rules */}
              {activity.usage_rules && (
                <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                  {activity.usage_rules.max_times_per_day && (
                    <div className="flex items-center gap-1">
                      <IconClock size={16} />
                      <span>{activity.usage_rules.max_times_per_day}x/day</span>
                    </div>
                  )}
                  {activity.usage_rules.max_duration_minutes && (
                    <div className="flex items-center gap-1">
                      <IconClock size={16} />
                      <span>{activity.usage_rules.max_duration_minutes} min</span>
                    </div>
                  )}
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-2">
                {!activity.is_active && (
                  <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    <IconPlayerPause size={14} />
                    {t("tasks:activity.inactive")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
