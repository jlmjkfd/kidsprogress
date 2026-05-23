/**
 * Child Basic Info Page
 */
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useChild } from "@/api/queries/useChild";
import { IconUser, IconCalendar, IconShield, IconLanguage } from "@tabler/icons-react";
import EditChildModal from "./components/EditChildModal";

export default function ChildBasicInfoPage() {
  const { childId } = useParams<{ childId: string }>();
  const { t } = useTranslation(["common"]);
  const { data: child, isLoading } = useChild(childId || "");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">{t("common:loading")}</div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-600">{t("common:child_not_found")}</div>
      </div>
    );
  }

  const age = child.date_of_birth
    ? new Date().getFullYear() - new Date(child.date_of_birth).getFullYear()
    : "N/A";

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white text-2xl md:text-3xl font-bold">
            {child.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">{child.name}</h2>
            <p className="text-gray-600 text-sm md:text-base">{t("common:child_management.subtitle", { age })}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <IconUser size={20} className="text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">{t("common:child_info.name")}</p>
              <p className="font-medium text-gray-900">{child.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <IconCalendar size={20} className="text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">{t("common:child_info.date_of_birth")}</p>
              <p className="font-medium text-gray-900">
                {child.date_of_birth
                  ? new Date(child.date_of_birth).toLocaleDateString()
                  : "N/A"
                } ({age} {t("common:child_info.years_old")})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <IconShield size={20} className="text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">{t("common:child_info.pin_status")}</p>
              <p className="font-medium text-gray-900">
                {child.pin_hash ? t("common:child_info.pin_enabled") : t("common:child_info.pin_disabled")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <IconLanguage size={20} className="text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">{t("common:child_info.preferred_language")}</p>
              <p className="font-medium text-gray-900">
                {child.language ? t(`common:languages.${child.language}`) : t("common:child_info.inherit_parent")}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t("common:edit_info")}
          </button>
        </div>
      </div>

      <EditChildModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        child={child}
      />
    </div>
  );
}
