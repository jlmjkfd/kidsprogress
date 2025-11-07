/**
 * Parent Portal Layout with navigation
 */
import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconUsers,
  IconChecklist,
  IconChartBar,
  IconSettings,
  IconLogout,
  IconHome,
  IconMenu2,
  IconX,
} from "@tabler/icons-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function ParentPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(["common"]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/parent-portal", icon: IconUsers, label: t("common:navigation.children"), exact: true },
    { path: "/parent-portal/tasks", icon: IconChecklist, label: t("common:navigation.tasks") },
    { path: "/parent-portal/analytics", icon: IconChartBar, label: t("common:navigation.analytics") },
    { path: "/parent-portal/settings", icon: IconSettings, label: t("common:navigation.settings") },
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

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">{t("common:portals.parent_portal")}</h1>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar - Desktop: Always visible, Mobile: Overlay when open */}
      <div
        className={`
          ${isMobileMenuOpen ? 'block' : 'hidden'} md:block
          fixed md:static inset-0 z-40 md:z-auto
          w-full md:w-64 bg-white shadow-lg flex flex-col
          md:min-h-screen
        `}
      >
        {/* Desktop Header */}
        <div className="hidden md:block p-4 lg:p-6 border-b">
          <h1 className="text-lg lg:text-xl font-bold text-gray-900">{t("common:portals.parent_portal")}</h1>
          <p className="text-xs lg:text-sm text-gray-600 mt-1">{t("common:portals.parent_portal_description")}</p>
        </div>

        {/* Mobile Close Button */}
        <div className="md:hidden flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">{t("common:navigation.children")}</h2>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close menu"
          >
            <IconX size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[44px] text-sm md:text-base ${
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
          <div className="flex justify-center mb-2">
            <LanguageSwitcher />
          </div>
          <button
            onClick={() => handleNavClick("/portal-selection")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors min-h-[44px] text-sm md:text-base"
          >
            <IconHome size={20} />
            <span>{t("common:navigation.portal_selection")}</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors min-h-[44px] text-sm md:text-base"
          >
            <IconLogout size={20} />
            <span>{t("common:logout")}</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
