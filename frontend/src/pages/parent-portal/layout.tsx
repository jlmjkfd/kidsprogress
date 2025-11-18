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
  IconHome,
  IconMenu2,
  IconX,
  IconSparkles,
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Fixed at top */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
        <div className="flex items-center justify-between px-4 py-3 md:py-4">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => handleNavClick("/portal-selection")}
              className="text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={t("common:navigation.portal_selection")}
            >
              <IconHome size={20} />
            </button>
            <button
              onClick={() => handleNavClick("/child-selection")}
              className="flex items-center gap-1 md:gap-2 text-purple-600 hover:text-purple-700 transition-colors min-h-[44px] px-2 md:px-3"
              aria-label={t("common:child_portal")}
            >
              <IconSparkles size={20} />
              <span className="hidden sm:inline text-sm md:text-base">{t("common:child")}</span>
            </button>
            <h1 className="text-lg md:text-xl font-bold text-gray-900">{t("common:portals.parent_portal")}</h1>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {/* Desktop logout button */}
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-sm min-h-[44px]"
            >
              <IconLogout size={18} />
              <span>{t("common:logout")}</span>
            </button>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Header Spacer */}
      <div className="h-[60px] md:h-[68px]" />

      {/* Navigation Tabs - Desktop: Always visible, Mobile: Dropdown when open */}
      <RemoveScroll enabled={isMobileMenuOpen}>
        <div
          className={`
            ${isMobileMenuOpen ? 'block' : 'hidden'} md:block
            md:static fixed top-[60px] md:top-[68px] left-0 right-0 z-40
            bg-white border-b shadow-lg md:shadow-none
          `}
        >
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex flex-col md:flex-row gap-1 md:gap-2 py-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path, item.exact);
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className={`flex items-center gap-3 px-4 md:px-6 py-3 rounded-lg whitespace-nowrap transition-colors min-h-[44px] text-sm md:text-base ${
                      active
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={20} stroke={2} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              {/* Mobile-only actions */}
              <div className="md:hidden border-t pt-2 mt-2 space-y-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors min-h-[44px] text-sm"
                >
                  <IconLogout size={20} />
                  <span>{t("common:logout")}</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      </RemoveScroll>

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
