/**
 * Child Profile Page - View/Edit single child (Parent Portal)
 * Note: PIN verification removed for parent portal context
 */
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconLock, IconChecklist, IconArrowLeft } from "@tabler/icons-react";
import { useChild } from "@/api/queries/useChild";
import { calculateAge } from "@/types/child";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ChildProfilePage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(["common", "errors", "tasks"]);
  const { data: child, isLoading, error } = useChild(childId || "");

  if (isLoading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  if (error || !child) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="mb-4 text-red-600">
          {t("errors:failed_to_load_child")}
        </div>
        <button
          onClick={() => navigate("/parent-portal")}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Back to Children
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate("/parent-portal")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <IconArrowLeft size={20} />
          <span>{t("common:back")}</span>
        </button>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Avatar and Basic Info */}
          <div className="mb-8 flex items-center gap-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-3xl font-bold text-white">
              {child.avatar_url ? (
                <img
                  src={child.avatar_url}
                  alt={child.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                child.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{child.name}</h2>
              <p className="mt-1 text-gray-600">
                {t("common:age")}: {calculateAge(child.date_of_birth)} {t("common:years_old")}
              </p>
              {child.pin_required && (
                <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
                  <IconLock size={16} />
                  {t("common:pin_protected")}
                </div>
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-8">
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-medium text-gray-500">
                {t("common:profile.member_since")}
              </h3>
              <p className="text-lg text-gray-900">
                {new Date(child.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-medium text-gray-500">
                {t("common:profile.last_updated")}
              </h3>
              <p className="text-lg text-gray-900">
                {new Date(child.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">{t("tasks:quick_actions")}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                onClick={() => navigate(`/parent-portal/children/${childId}/tasks`)}
                className="flex items-center gap-3 rounded-lg border-2 border-blue-200 bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
                  <IconChecklist className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{t("tasks:view_tasks")}</div>
                  <div className="text-sm text-gray-600">{t("tasks:manage_tasks")}</div>
                </div>
              </button>

              {/* TODO: Add more actions like Edit Profile, View Progress, etc. */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
