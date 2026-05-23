/**
 * Parent Portal Settings Page
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconLock, IconLanguage, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import { useAppSelector } from "@store/hooks";
import { useParentPinStatus } from "@api/queries/useParentPinStatus";
import ParentPinChangeModal from "./ParentPinChangeModal";
import ParentPinRemoveModal from "./ParentPinRemoveModal";
import DeviceManagementSection from "./DeviceManagementSection";

export default function ParentPortalSettings() {
  const { t, i18n } = useTranslation(["common", "auth"]);
  const user = useAppSelector((state) => state.auth.user);
  const { data: pinStatus } = useParentPinStatus();
  const [showPinChangeModal, setShowPinChangeModal] = useState(false);
  const [showPinRemoveModal, setShowPinRemoveModal] = useState(false);

  // Get current language from i18n
  const currentLanguage = i18n.language as "en" | "zh";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t("common:navigation.settings")}</h1>

      <div className="space-y-6">
        {/* Account Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t("common:settings.account_info")}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t("common:settings.email")}</label>
              <p className="text-gray-900">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t("common:settings.name")}</label>
              <p className="text-gray-900">{user?.full_name}</p>
            </div>
          </div>
        </div>

        {/* Language Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <IconLanguage className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">{t("common:settings.language")}</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <IconCheck className="text-green-600" size={20} />
              <span className="text-gray-900">
                {t(`common:languages.${currentLanguage}`)}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {t("common:settings.language_hint")}
            </p>
          </div>
        </div>

        {/* Parent Portal PIN */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <IconLock className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">{t("common:settings.parent_pin")}</h2>
          </div>
          <p className="text-gray-600 mb-4">
            {t("common:settings.parent_pin_description")}
          </p>

          {pinStatus?.has_pin ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <IconCheck size={20} />
                <span className="font-medium">{t("common:settings.pin_is_set")}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPinChangeModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {t("common:settings.change_pin")}
                </button>
                <button
                  onClick={() => setShowPinRemoveModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  {t("common:settings.remove_pin")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-500">
                <IconAlertCircle size={20} />
                <span>{t("common:settings.no_pin_set")}</span>
              </div>
              <button
                onClick={() => setShowPinChangeModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {t("common:settings.set_pin")}
              </button>
            </div>
          )}
        </div>

        {/* Device Management */}
        <DeviceManagementSection />
      </div>

      {/* Parent PIN Change Modal */}
      <ParentPinChangeModal
        isOpen={showPinChangeModal}
        onClose={() => setShowPinChangeModal(false)}
        hasExistingPin={pinStatus?.has_pin || false}
      />

      {/* Parent PIN Remove Modal */}
      <ParentPinRemoveModal
        isOpen={showPinRemoveModal}
        onClose={() => setShowPinRemoveModal(false)}
      />
    </div>
  );
}
