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

export default function PortalSelectionPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(["common"]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">KidsProgress</h1>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <button
                onClick={() => {
                  localStorage.removeItem("auth_token");
                  navigate("/login");
                }}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                {t("common:logout")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Portal Selection */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome! Choose Your Portal
          </h2>
          <p className="text-lg text-gray-600">
            Select the portal you want to access
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Parent Portal Card */}
          <button
            onClick={() => navigate("/parent-portal")}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 text-left border-2 border-transparent hover:border-blue-500"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <IconUserShield className="w-8 h-8 text-white" stroke={2} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Parent Portal
                </h3>
                <p className="text-sm text-gray-600">Manage & Monitor</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-gray-700">
                <IconUsers className="w-5 h-5 text-blue-600" />
                <span>Manage children profiles</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <IconChecklist className="w-5 h-5 text-blue-600" />
                <span>Create and assign tasks</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <IconChartBar className="w-5 h-5 text-blue-600" />
                <span>View progress and analytics</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <IconSettings className="w-5 h-5 text-blue-600" />
                <span>Configure settings</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">For parents and guardians</span>
              <span className="text-blue-600 font-medium group-hover:translate-x-2 transition-transform">
                Enter →
              </span>
            </div>
          </button>

          {/* Child Portal Card */}
          <button
            onClick={() => navigate("/child-selection")}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 text-left border-2 border-transparent hover:border-purple-500"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <IconSparkles className="w-8 h-8 text-white" stroke={2} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Child Portal
                </h3>
                <p className="text-sm text-gray-600">Learn & Play</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-gray-700">
                <IconChecklist className="w-5 h-5 text-purple-600" />
                <span>View and complete tasks</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <IconSparkles className="w-5 h-5 text-purple-600" />
                <span>Use learning tools</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <IconMessageCircle className="w-5 h-5 text-purple-600" />
                <span>Chat with AI teacher</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <IconChartBar className="w-5 h-5 text-purple-600" />
                <span>See your progress</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">For children to use</span>
              <span className="text-purple-600 font-medium group-hover:translate-x-2 transition-transform">
                Enter →
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
