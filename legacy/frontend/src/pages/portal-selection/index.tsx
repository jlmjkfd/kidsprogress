/**
 * Portal selection page - Choose between Parent Portal or Child Portal
 * Displayed after parent login
 */
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconUserShield,
  IconUsers,
  IconSettings,
  IconChartBar,
  IconChecklist,
  IconSparkles,
  IconMessageCircle,
} from "@tabler/icons-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLogout } from "@api/mutations/useLogout";
import { useAppDispatch } from "@store/hooks";
import { logout } from "@store/slices/authSlice";
import { clearSelectedChild } from "@store/slices/childSlice";
import { getDeviceToken } from "@/utils/deviceToken";
import ParentPinModal from "@/components/ParentPinModal";
import { useParentPortalAccess } from "@/hooks/useParentPortalAccess";
import DeviceRegistrationModal from "@/components/DeviceRegistrationModal";
import { useDevices } from "@api/queries/useDevices";
import { useState, useEffect } from "react";

export default function PortalSelectionPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(["common"]);
  const dispatch = useAppDispatch();
  const logoutMutation = useLogout();
  const { navigateToParentPortal, showPinModal, handlePinSuccess, handlePinCancel } = useParentPortalAccess();
  const { data: devices } = useDevices();
  const [showDeviceRegistration, setShowDeviceRegistration] = useState(false);

  // Check if device should be registered on mount (only right after login)
  useEffect(() => {
    const checkDeviceRegistration = () => {
      // Only check if we just logged in (flag set by login page)
      const shouldShowPrompt = sessionStorage.getItem("show_device_registration_prompt");
      if (!shouldShowPrompt) return;

      // Clear the flag immediately so it doesn't show again
      sessionStorage.removeItem("show_device_registration_prompt");

      const loginPreference = localStorage.getItem("login_trusted_device_preference");
      const wasTrustedDuringLogin = loginPreference ? JSON.parse(loginPreference) : false;

      // Only show modal if user indicated trusted device during login
      if (!wasTrustedDuringLogin) return;

      const currentDeviceToken = getDeviceToken();
      if (!currentDeviceToken) {
        // No device token, show registration modal
        setShowDeviceRegistration(true);
      } else if (devices) {
        // Check if device is registered and active
        const currentDevice = devices.find((d) => d.device_token === currentDeviceToken);
        const isDeviceActivelyRegistered = currentDevice && currentDevice.is_active;

        if (!isDeviceActivelyRegistered) {
          // Device not registered or inactive, show modal
          setShowDeviceRegistration(true);
        }
      }
    };

    checkDeviceRegistration();
  }, [devices]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        // Clear Redux state and localStorage
        dispatch(logout());
        dispatch(clearSelectedChild());

        // Redirect based on device registration
        const deviceToken = getDeviceToken();
        if (deviceToken) {
          // Device is registered, go to child selection
          navigate("/child-selection");
        } else {
          // No device registration, go to login
          navigate("/login");
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">KidsProgress</h1>
            <div className="flex items-center gap-2 sm:gap-4">
              <LanguageSwitcher />
              <button
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="text-sm md:text-base text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 min-h-[44px] disabled:opacity-50"
              >
                {t("common:logout")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Portal Selection */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
            {t("common:portals.select_portal")}
          </h2>
          <p className="text-base md:text-lg text-gray-600">
            {t("common:portals.select_portal_description")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Parent Portal Card */}
          <button
            onClick={() => navigateToParentPortal()}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 md:p-8 text-left border-2 border-transparent hover:border-blue-500 min-h-[44px]"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 md:mb-6">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                <IconUserShield className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" stroke={2} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl sm:text-xl md:text-2xl font-bold text-gray-900">
                  {t("common:portals.parent_portal")}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">{t("common:portals.parent_portal_description")}</p>
              </div>
            </div>

            <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
              <div className="flex items-center gap-2 md:gap-3 text-gray-700 text-sm md:text-base">
                <IconUsers className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                <span className="line-clamp-2">{t("common:portals.parent_features.manage_children")}</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-gray-700 text-sm md:text-base">
                <IconChecklist className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                <span className="line-clamp-2">{t("common:portals.parent_features.create_tasks")}</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-gray-700 text-sm md:text-base">
                <IconChartBar className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                <span className="line-clamp-2">{t("common:portals.parent_features.view_analytics")}</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-gray-700 text-sm md:text-base">
                <IconSettings className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                <span className="line-clamp-2">{t("common:portals.parent_features.configure_settings")}</span>
              </div>
            </div>

            <div className="flex items-center justify-end text-blue-600 font-medium group-hover:translate-x-2 transition-transform text-sm md:text-base">
              <span>→</span>
            </div>
          </button>

          {/* Child Portal Card */}
          <button
            onClick={() => navigate("/child-selection")}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 md:p-8 text-left border-2 border-transparent hover:border-purple-500 min-h-[44px]"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4 md:mb-6">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                <IconSparkles className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" stroke={2} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl sm:text-xl md:text-2xl font-bold text-gray-900">
                  {t("common:portals.child_portal")}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">{t("common:portals.child_portal_description")}</p>
              </div>
            </div>

            <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
              <div className="flex items-center gap-2 md:gap-3 text-gray-700 text-sm md:text-base">
                <IconChecklist className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" />
                <span className="line-clamp-2">{t("common:portals.child_features.complete_tasks")}</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-gray-700 text-sm md:text-base">
                <IconSparkles className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" />
                <span className="line-clamp-2">{t("common:portals.child_features.use_tools")}</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-gray-700 text-sm md:text-base">
                <IconMessageCircle className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" />
                <span className="line-clamp-2">{t("common:portals.child_features.chat_ai")}</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-gray-700 text-sm md:text-base">
                <IconChartBar className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" />
                <span className="line-clamp-2">{t("common:portals.child_features.see_progress")}</span>
              </div>
            </div>

            <div className="flex items-center justify-end text-purple-600 font-medium group-hover:translate-x-2 transition-transform text-sm md:text-base">
              <span>→</span>
            </div>
          </button>
        </div>

        {/* Parent PIN Modal */}
        <ParentPinModal
          isOpen={showPinModal}
          onClose={handlePinCancel}
          onSuccess={handlePinSuccess}
        />

        {/* Device Registration Modal */}
        <DeviceRegistrationModal
          isOpen={showDeviceRegistration}
          onClose={() => setShowDeviceRegistration(false)}
          isTrustedDevice={true}
        />
      </div>
    </div>
  );
}
