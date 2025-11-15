/**
 * Routines Management Page - Manage recurring task templates
 */
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconCalendar,
  IconRefresh,
  IconPlayerPause,
} from "@tabler/icons-react";
import { useRoutines } from "@/api/queries/useRoutines";
import { useDefaultTaskCollection } from "@/api/queries/useTaskCollections";
import { useCreateRoutine, useUpdateRoutine, useDeleteRoutine } from "@/api/mutations/useRoutineMutations";
import { Routine, RoutineCreate, RoutineUpdate } from "@/types/enhanced-tasks";
import RoutineModal from "./components/RoutineModal";

export default function RoutinesPage() {
  const { childId } = useParams<{ childId: string }>();
  const { t } = useTranslation(["common", "tasks"]);
  const { data: routines, isLoading } = useRoutines(childId || "");
  const { data: defaultCollection } = useDefaultTaskCollection(childId || "");
  const createRoutineMutation = useCreateRoutine();
  const updateRoutineMutation = useUpdateRoutine();
  const deleteRoutineMutation = useDeleteRoutine();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | undefined>();

  const handleCreate = () => {
    setEditingRoutine(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (routine: Routine) => {
    setEditingRoutine(routine);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: RoutineCreate | RoutineUpdate) => {
    if (editingRoutine) {
      await updateRoutineMutation.mutateAsync({
        routineId: editingRoutine._id,
        data: data as RoutineUpdate,
      });
    } else {
      await createRoutineMutation.mutateAsync(data as RoutineCreate);
    }
  };

  const handleDelete = async (routineId: string) => {
    if (!confirm(t("tasks:routine.confirm_delete"))) return;
    await deleteRoutineMutation.mutateAsync(routineId);
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
            {t("tasks:routine.title")}
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            {t("tasks:routine.description")}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
        >
          <IconPlus size={20} />
          <span>{t("tasks:routine.create")}</span>
        </button>
      </div>

      {/* Routines List */}
      {!routines || routines.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <IconCalendar className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t("tasks:routine.empty_title")}
          </h3>
          <p className="text-gray-600 mb-6">{t("tasks:routine.empty_description")}</p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <IconPlus size={20} />
            <span>{t("tasks:routine.create_first")}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {routines.map((routine) => (
            <div
              key={routine._id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {routine.title}
                  </h3>
                  {routine.description && (
                    <p className="text-sm text-gray-600">{routine.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(routine)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors min-h-[44px] min-w-[44px]"
                    title={t("common:edit")}
                  >
                    <IconEdit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(routine._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors min-h-[44px] min-w-[44px]"
                    title={t("common:delete")}
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              </div>

              {/* Recurrence Info */}
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <IconRefresh size={16} />
                <span>
                  {routine.recurrence.frequency} • Every {routine.recurrence.interval}{" "}
                  {routine.recurrence.frequency.toLowerCase()}
                  {routine.recurrence.interval > 1 ? "s" : ""}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                {!routine.is_active && (
                  <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    <IconPlayerPause size={14} />
                    {t("tasks:routine.inactive")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Routine Modal */}
      {defaultCollection && (
        <RoutineModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          routine={editingRoutine}
          childId={childId || ""}
          collectionId={defaultCollection._id}
        />
      )}
    </div>
  );
}
