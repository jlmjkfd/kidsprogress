/**
 * Child Portal Layout - For children to use
 */
import { useState } from "react";
import { Outlet, useNavigate, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RemoveScroll } from "react-remove-scroll";
import {
  IconChecklist,
  IconSparkles,
  IconMessageCircle,
  IconChartBar,
  IconArrowLeft,
  IconMenu2,
  IconX,
} from "@tabler/icons-react";
import { useChild } from "@/api/queries/useChild";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { clearSelectedChild } from "@/store/slices/childSlice";

export default function ChildPortalLayout() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { childId } = useParams<{ childId: string }>();
  const { t } = useTranslation(["common"]);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  // Only fetch child if authenticated (device token users won't have child details displayed)
  const { data: child } = useChild(childId || "", isAuthenticated);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: `/child-portal/${childId}/tasks`, icon: IconChecklist, label: t("common:navigation.my_tasks") },
    { path: `/child-portal/${childId}/tools`, icon: IconSparkles, label: t("common:navigation.tools") },
    { path: `/child-portal/${childId}/chat`, icon: IconMessageCircle, label: t("common:navigation.chat") },
    { path: `/child-portal/${childId}/progress`, icon: IconChartBar, label: t("common:navigation.progress") },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleBack = () => {
    dispatch(clearSelectedChild());
    navigate("/child-selection");
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex flex-col">
      {/* Top Bar - Sticky */}
      <div className="sticky top-0 bg-white shadow-sm z-50">
        <div className="px-4 py-3 md:py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] min-w-[44px] justify-center md:justify-start"
          >
            <IconArrowLeft size={20} className="md:mr-0" />
            <span className="hidden sm:inline text-sm md:text-base">{t("common:back")}</span>
          </button>

          {child && (
            <div className="text-center flex-1 mx-2 md:mx-4">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate">
                {t("common:child_portal_page.welcome", { name: child.name })}
              </h1>
              <p className="hidden sm:block text-xs md:text-sm text-gray-600">{t("common:child_portal_page.subtitle")}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
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


      {/* Navigation Tabs - Desktop: Always visible, Mobile: Dropdown when open */}
      <RemoveScroll enabled={isMobileMenuOpen}>
        <div
          className={`
            ${isMobileMenuOpen ? 'block' : 'hidden'} md:block
            md:static fixed top-[60px] left-0 right-0 z-40
            bg-white border-b shadow-lg md:shadow-none
          `}
        >
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex flex-col md:flex-row gap-1 md:gap-2 py-2 md:overflow-x-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className={`flex items-center gap-3 px-4 md:px-6 py-3 rounded-lg whitespace-nowrap transition-colors min-h-[44px] text-sm md:text-base ${
                      active
                        ? "bg-purple-100 text-purple-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={20} stroke={2} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </div>
    </div>
  );
}
