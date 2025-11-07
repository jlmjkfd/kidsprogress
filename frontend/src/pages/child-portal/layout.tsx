/**
 * Child Portal Layout - For children to use
 */
import { Outlet, useNavigate, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconChecklist,
  IconSparkles,
  IconMessageCircle,
  IconChartBar,
  IconLogout,
  IconArrowLeft,
} from "@tabler/icons-react";
import { useChild } from "@/api/queries/useChild";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function ChildPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { childId } = useParams<{ childId: string }>();
  const { t } = useTranslation(["common"]);
  const { data: child } = useChild(childId || "");

  const navItems = [
    { path: `/child-portal/${childId}/tasks`, icon: IconChecklist, label: "My Tasks" },
    { path: `/child-portal/${childId}/tools`, icon: IconSparkles, label: "Tools" },
    { path: `/child-portal/${childId}/chat`, icon: IconMessageCircle, label: "Chat with AI" },
    { path: `/child-portal/${childId}/progress`, icon: IconChartBar, label: "My Progress" },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleBack = () => {
    navigate("/child-selection");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white shadow-sm">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <IconArrowLeft size={20} />
            <span>Back</span>
          </button>

          {child && (
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">{child.name}'s Portal</h1>
              <p className="text-sm text-gray-600">Let's learn and play!</p>
            </div>
          )}

          <LanguageSwitcher />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-2 overflow-x-auto py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg whitespace-nowrap transition-colors ${
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

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
