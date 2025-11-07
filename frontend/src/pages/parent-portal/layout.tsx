/**
 * Parent Portal Layout with navigation
 */
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconUsers,
  IconChecklist,
  IconChartBar,
  IconSettings,
  IconLogout,
  IconHome,
} from "@tabler/icons-react";

export default function ParentPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(["common"]);

  const navItems = [
    { path: "/parent-portal", icon: IconUsers, label: "Children", exact: true },
    { path: "/parent-portal/tasks", icon: IconChecklist, label: "Tasks" },
    { path: "/parent-portal/analytics", icon: IconChartBar, label: "Analytics" },
    { path: "/parent-portal/settings", icon: IconSettings, label: "Settings" },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
        {/* Logo/Header */}
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">Parent Portal</h1>
          <p className="text-sm text-gray-600 mt-1">Manage & Monitor</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon size={20} stroke={2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t space-y-2">
          <button
            onClick={() => navigate("/portal-selection")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <IconHome size={20} />
            <span>Portal Selection</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <IconLogout size={20} />
            <span>{t("common:logout")}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
