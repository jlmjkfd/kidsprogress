/**
 * Child Management Layout - Tab navigation for managing a specific child
 */
import { Outlet, useNavigate, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconUser,
  IconChecklist,
  IconChartBar,
  IconArrowLeft,
} from "@tabler/icons-react";
import { useChild } from "@/api/queries/useChild";

export default function ChildManagementLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { childId } = useParams<{ childId: string }>();
  const { t } = useTranslation(["common"]);
  const { data: child, isLoading } = useChild(childId || "");

  const navItems = [
    { path: `/parent-portal/children/${childId}`, icon: IconUser, label: t("common:child_management.basic_info"), exact: true },
    { path: `/parent-portal/children/${childId}/tasks`, icon: IconChecklist, label: t("common:child_management.tasks") },
    { path: `/parent-portal/children/${childId}/analysis`, icon: IconChartBar, label: t("common:child_management.analysis") },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleBack = () => {
    navigate("/parent-portal");
  };

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">{t("common:loading")}</div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{t("common:child_not_found")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Child Info Header - Professional Style */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex-shrink-0 text-gray-600 hover:text-gray-900 transition-all p-2 hover:bg-gray-100 rounded-xl"
              aria-label={t("common:back")}
            >
              <IconArrowLeft size={22} />
            </button>

            {/* Child Avatar & Info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-lg">
                {child.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">{child.name}</h1>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <span>{child.date_of_birth ? new Date().getFullYear() - new Date(child.date_of_birth).getFullYear() : "N/A"} {t("common:child_info.years_old")}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <nav className="flex gap-2 -mb-px">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`flex items-center gap-2 px-5 py-3 border-b-3 transition-all font-medium ${
                    active
                      ? "border-blue-600 text-blue-700 bg-blue-50"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={20} stroke={2} />
                  <span className="text-sm md:text-base">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <Outlet />
      </div>
    </div>
  );
}
