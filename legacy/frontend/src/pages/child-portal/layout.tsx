/**
 * Child Portal Layout - For children to use
 * Sidebar navigation matching parent portal design
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
  IconStar,
  IconTrophy,
} from "@tabler/icons-react";
import { useChild } from "@/api/queries/useChild";
import { useTasksByChild } from "@/api/queries/useTasks";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { clearSelectedChild } from "@/store/slices/childSlice";

export default function ChildPortalLayout() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { childId } = useParams<{ childId: string }>();
  const { t } = useTranslation(["common", "tasks"]);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  // Only fetch child if authenticated (device token users won't have child details displayed)
  const { data: child } = useChild(childId || "", isAuthenticated);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true); // For lg breakpoint

  // Fetch tasks to calculate stats
  const isTasksPage = location.pathname.includes("/tasks");
  const selectedChildId = useAppSelector(
    (state) => state.child.selectedChildId
  );
  const { data: allTasks } = useTasksByChild(selectedChildId || "");

  // Calculate today's completed tasks and points
  const getLocalDateString = (date: Date = new Date()) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const completedToday =
    allTasks?.filter((t) => {
      const today = getLocalDateString();
      const completedDate = t.completed_at?.split("T")[0];
      return completedDate === today && t.status === "completed";
    }) || [];

  const totalPoints = completedToday.reduce(
    (sum, t) => sum + (t.points_earned || 0),
    0
  );

  const navItems = [
    {
      path: `/child-portal/${childId}/tasks`,
      icon: IconChecklist,
      label: t("common:navigation.my_tasks"),
    },
    {
      path: `/child-portal/${childId}/tools`,
      icon: IconSparkles,
      label: t("common:navigation.tools"),
    },
    {
      path: `/child-portal/${childId}/chat`,
      icon: IconMessageCircle,
      label: t("common:navigation.chat"),
    },
    {
      path: `/child-portal/${childId}/progress`,
      icon: IconChartBar,
      label: t("common:navigation.progress"),
    },
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
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Unified Header - All screen sizes (<1024px: with back button + menu, ≥1024px: no buttons) */}
      <div className="fixed top-0 right-0 left-0 z-50 bg-white shadow-md lg:hidden">
        <div className="flex w-full items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
          >
            <IconArrowLeft size={20} />
            <span className="text-sm font-medium">{t("common:back")}</span>
          </button>

          {child && (
            <div className="mx-4 flex-1 text-center min-w-0">
              <h1 className="truncate text-base font-bold text-gray-900">
                {child.name}
              </h1>
            </div>
          )}

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
          </button>
        </div>
      </div>

      {/* Desktop Header (≥1024px) - Full width with back button */}
      <div className="fixed top-0 right-0 left-0 z-50 hidden items-center border-b bg-white py-4 pr-6 shadow-sm lg:flex">
        {/* Back Button - Same width as sidebar, aligned with menu items */}
        <div
          className={`flex items-center border-r transition-all duration-300 ${
            isSidebarCollapsed
              ? "w-16 justify-center xl:w-64 xl:justify-start xl:px-4"
              : "w-64 justify-start px-4"
          }`}
        >
          <button
            onClick={handleBack}
            className={`flex items-center gap-2 rounded-lg text-gray-600 transition-colors hover:bg-gray-100 ${
              isSidebarCollapsed ? "p-2.5 xl:px-4 xl:py-2.5" : "px-4 py-2.5"
            }`}
          >
            <IconArrowLeft size={20} />
            <span
              className={`text-sm font-medium ${
                isSidebarCollapsed ? "hidden xl:inline" : ""
              }`}
            >
              {t("common:back")}
            </span>
          </button>
        </div>

        {/* Child name and stats */}
        {child && (
          <div className="flex flex-1 items-center justify-between pl-6">
            <h1 className="text-xl font-bold text-gray-900">{child.name}</h1>
            {isTasksPage && allTasks && (
              <div className="flex items-center gap-4 text-sm font-semibold text-gray-600">
                <div className="flex items-center gap-2">
                  <IconStar size={18} className="text-yellow-500" />
                  <span>{completedToday.length}</span>
                </div>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-2">
                  <IconTrophy size={18} className="text-purple-500" />
                  <span>{totalPoints}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Unified Sidebar (≥1024px) - Below header */}
      <aside
        className={`fixed bottom-0 left-0 z-40 hidden flex-col border-r bg-white shadow-lg transition-all duration-300 lg:flex ${
          isSidebarCollapsed ? "w-16 xl:w-64" : "w-64"
        }`}
        style={{ top: "73px" }}
      >
        {/* Toggle Button - Only visible on lg, hidden on xl+ */}
        <div className="border-b p-2 xl:hidden">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="flex w-full items-center justify-center rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
          >
            <IconMenu2 size={20} />
          </button>
        </div>

        {/* Navigation - Always rendered, spacing adjusts based on state */}
        <nav
          className={`flex-1 space-y-2 overflow-y-auto p-2 transition-all duration-300 ${
            isSidebarCollapsed ? "px-2 xl:px-4" : "px-4"
          }`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`flex w-full items-center rounded-xl font-medium transition-all duration-300 ${
                  isSidebarCollapsed
                    ? "justify-center p-3 xl:justify-start xl:gap-3 xl:px-4 xl:py-3"
                    : "gap-3 px-4 py-3"
                } ${
                  active
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <Icon size={20} stroke={2} />
                <span
                  className={`transition-opacity duration-300 ${
                    isSidebarCollapsed ? "hidden xl:inline" : ""
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Language Switcher - Hidden on lg when collapsed, always visible on xl+ */}
        <div
          className={`overflow-hidden border-t bg-gray-50 transition-all duration-300 ${
            isSidebarCollapsed ? "h-0 lg:h-0 xl:h-auto xl:p-4" : "h-auto p-4"
          }`}
        >
          <LanguageSwitcher />
        </div>
      </aside>

      {/* Desktop Sidebar Overlay (1024-1280px when expanded) */}
      {!isSidebarCollapsed && (
        <div
          className="fixed inset-0 z-30 hidden bg-black/15 lg:block xl:hidden"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      {/* Mobile Sidebar - Slide from right */}
      <RemoveScroll enabled={isMobileMenuOpen}>
        <div
          className={`fixed top-0 right-0 bottom-0 z-50 w-72 transform bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Mobile Sidebar Header - Stats only */}
          {child && isTasksPage && allTasks && (
            <div className="border-b bg-gradient-to-br from-purple-50 to-pink-50 p-6">
              <div className="flex items-center justify-center gap-3 text-sm font-semibold text-gray-600">
                <div className="flex items-center gap-1.5">
                  <IconStar size={16} className="text-yellow-500" />
                  <span>{completedToday.length}</span>
                </div>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-1.5">
                  <IconTrophy size={16} className="text-purple-500" />
                  <span>{totalPoints}</span>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Navigation */}
          <nav className="flex-1 space-y-2 overflow-y-auto p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all ${
                    active
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
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
          <div className="border-t bg-gray-50 p-4">
            <LanguageSwitcher />
          </div>
        </div>
      </RemoveScroll>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area - Fixed margin, sidebar overlays on expand */}
      <div className="flex flex-1 flex-col overflow-hidden transition-all duration-300 lg:ml-16 xl:ml-64">
        {/* Spacer for fixed header on mobile/tablet */}
        <div className="h-[60px] flex-shrink-0 lg:hidden" />

        {/* Spacer for fixed desktop header */}
        <div className="hidden h-[73px] flex-shrink-0 lg:block" />

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
