/**
 * Parent Portal - Manage Children page
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconUser, IconPlus, IconLock } from "@tabler/icons-react";
import { useChildren } from "@api/queries/useChildren";
import { calculateAge } from "@/types/child";
import AddChildModal from "./components/AddChildModal";

export default function ManageChildrenPage() {
  const { t } = useTranslation(["common"]);
  const navigate = useNavigate();
  const { data: children, isLoading, isError } = useChildren();
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(false);

  const handleSelectChild = (childId: string) => {
    navigate(`/parent-portal/children/${childId}`);
  };

  const handleAddChild = () => {
    setIsAddChildModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">{t("common:loading")}</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-600">Failed to load children</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("common:manage_children")}
          </h1>
          <p className="text-gray-600">
            {t("common:manage_children_description")}
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {t("common:children_count")} ({children?.length || 0})
          </h2>
          <button
            onClick={handleAddChild}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
          >
            <IconPlus className="h-5 w-5" />
            {t("common:add_child")}
          </button>
        </div>

        {/* Children Grid */}
        {children && children.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <button
                key={child._id}
                onClick={() => handleSelectChild(child._id)}
                className="group relative overflow-hidden rounded-lg bg-white p-6 text-left shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-blue-500"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    {child.avatar_url ? (
                      <img
                        src={child.avatar_url}
                        alt={child.name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <IconUser className="h-8 w-8" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {child.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t("common:age")}: {calculateAge(child.date_of_birth)} {t("common:years_old")}
                    </p>
                    {child.pin_required && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <IconLock className="h-3 w-3" />
                        {t("common:pin_protected")}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <IconUser className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              {t("common:no_children")}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {t("common:no_children_description")}
            </p>
            <button
              onClick={handleAddChild}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
            >
              <IconPlus className="h-5 w-5" />
              {t("common:add_first_child")}
            </button>
          </div>
        )}
      </div>

      {/* Add Child Modal */}
      <AddChildModal
        isOpen={isAddChildModalOpen}
        onClose={() => setIsAddChildModalOpen(false)}
      />
    </div>
  );
}
