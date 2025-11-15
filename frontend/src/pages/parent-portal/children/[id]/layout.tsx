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
  IconRepeat,
  IconStar,
  IconCalendarEvent,
} from "@tabler/icons-react";
import { useChild } from "@/api/queries/useChild";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function ChildManagementLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { childId } = useParams<{ childId: string }>();
  const { t } = useTranslation(["common"]);
  const { data: child, isLoading } = useChild(childId || "");

  const navItems = [
    { path: `/parent-portal/children/${childId}`, icon: IconUser, label: t("common:child_management.basic_info"), exact: true },
    { path: `/parent-portal/children/${childId}/tasks`, icon: IconChecklist, label: t("common:child_management.tasks") },
    { path: `/parent-portal/children/${childId}/routines`, icon: IconRepeat, label: t("common:child_management.routines") },
    { path: `/parent-portal/children/${childId}/activities`, icon: IconStar, label: t("common:child_management.activities") },
    { path: `/parent-portal/children/${childId}/time-blocks`, icon: IconCalendarEvent, label: t("common:child_management.time_blocks") },
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors min-h-[44px]"
            >
              <IconArrowLeft size={20} />
              <span className="text-sm md:text-base">{t("common:back")}</span>
            </button>
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
          </div>

          <div className="mb-4">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">{child.name}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {t("common:child_management.subtitle", { age: child.date_of_birth ? new Date().getFullYear() - new Date(child.date_of_birth).getFullYear() : "N/A" })}
            </p>
          </div>

          {/* Tabs - Always visible (only 3 tabs, fits on mobile) */}
          <nav className="flex gap-2 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg whitespace-nowrap transition-colors min-h-[44px] text-sm md:text-base ${
                    active
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon size={18} stroke={2} />
                  <span>{item.label}</span>
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
