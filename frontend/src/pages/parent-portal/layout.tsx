/**
 * Parent Portal Layout - Tab-based navigation
 */
import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RemoveScroll } from "react-remove-scroll";
import {
  IconUsers,
  IconSettings,
  IconLogout,
  IconMenu2,
  IconX,
  IconSparkles,
  IconTemplate,
} from "@tabler/icons-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLogout } from "@api/mutations/useLogout";
import { useAppDispatch } from "@store/hooks";
import { logout } from "@store/slices/authSlice";
import { clearSelectedChild } from "@store/slices/childSlice";
import { getDeviceToken } from "@/utils/deviceToken";

export default function ParentPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(["common"]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dispatch = useAppDispatch();
  const logoutMutation = useLogout();

  const navItems = [
    { path: "/parent-portal", icon: IconUsers, label: t("common:navigation.children"), exact: true },
    { path: "/parent-portal/templates", icon: IconTemplate, label: t("common:navigation.templates") },
    { path: "/parent-portal/settings", icon: IconSettings, label: t("common:navigation.settings") },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        dispatch(logout());
        dispatch(clearSelectedChild());
        const deviceToken = getDeviceToken();
        if (deviceToken) {
          navigate("/child-selection");
        } else {
          navigate("/login");
        }
      },
    });
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop - Fixed height to viewport */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r fixed left-0 top-0 bottom-0 shadow-lg">
        {/* Sidebar Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <IconUsers size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{t("common:portals.parent_portal")}</h1>
              <p className="text-xs text-gray-500">Management Console</p>
            </div>
          </div>
          <button
            onClick={() => handleNavClick("/child-selection")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all shadow-sm hover:shadow-md text-sm font-medium"
          >
            <IconSparkles size={18} />
            <span>{t("common:child_portal")}</span>
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                  active
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon size={20} stroke={2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t space-y-2 bg-gray-50">
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-medium"
          >
            <IconLogout size={20} />
            <span>{t("common:logout")}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white shadow-md z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <IconUsers size={16} className="text-white" />
            </div>
            <h1 className="text-base font-bold text-gray-900">{t("common:portals.parent_portal")}</h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar - Slide from right */}
      <RemoveScroll enabled={isMobileMenuOpen}>
        <div
          className={`md:hidden fixed top-0 right-0 bottom-0 w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Mobile Sidebar Header */}
          <div className="p-6 border-b bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                  <IconUsers size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">{t("common:portals.parent_portal")}</h2>
                  <p className="text-xs text-gray-600">Management</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleNavClick("/child-selection")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all shadow-sm text-sm font-medium"
            >
              <IconSparkles size={18} />
              <span>{t("common:child_portal")}</span>
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                    active
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon size={20} stroke={2} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile Footer */}
          <div className="p-4 border-t bg-gray-50 space-y-2">
            <LanguageSwitcher />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-medium"
            >
              <IconLogout size={20} />
              <span>{t("common:logout")}</span>
            </button>
          </div>
        </div>
      </RemoveScroll>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-60 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64">
        <div className="md:hidden h-[60px]" />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
