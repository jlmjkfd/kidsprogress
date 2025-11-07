/**
 * Dashboard page with child selection
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconUser, IconPlus, IconLogout, IconLock } from "@tabler/icons-react";
import { useChildren } from "@api/queries/useChildren";
import { useAppSelector, useAppDispatch } from "@store/hooks";
import { logout } from "@store/slices/authSlice";
import { calculateAge } from "@/types/child";
import LanguageSwitcher from "@components/LanguageSwitcher";
import AddChildModal from "./components/AddChildModal";

function DashboardPage() {
  const { t } = useTranslation(["common", "auth"]);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { data: children, isLoading, isError } = useChildren();
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const handleSelectChild = (childId: string) => {
    navigate(`/child/${childId}`);
  };

  const handleAddChild = () => {
    setIsAddChildModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600">{t("common:loading")}</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-red-600">Failed to load children</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">KidsProgress</h1>
              <p className="text-sm text-gray-600">
                {t("auth:login.welcome")}, {user?.full_name}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <IconLogout className="h-4 w-4" />
                {t("common:logout")}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {t("common:select_child")}
          </h2>
          <button
            onClick={handleAddChild}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <IconPlus className="h-5 w-5" />
            {t("common:add_child")}
          </button>
        </div>

        {/* Children Grid */}
        {children && children.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <button
                key={child._id}
                onClick={() => handleSelectChild(child._id)}
                className="group relative overflow-hidden rounded-lg bg-white p-6 text-left shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-blue-500"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    {child.avatar_url ? (
                      <img
                        src={child.avatar_url}
                        alt={child.name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <IconUser className="h-8 w-8" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {child.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t("common:age")}: {calculateAge(child.date_of_birth)}
                    </p>
                    {child.pin_required && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <IconLock className="h-3 w-3" />
                        {t("common:pin_protected")}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <IconUser className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              {t("common:no_children")}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {t("common:no_children_description")}
            </p>
            <button
              onClick={handleAddChild}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <IconPlus className="h-5 w-5" />
              {t("common:add_first_child")}
            </button>
          </div>
        )}
      </main>

      {/* Add Child Modal */}
      <AddChildModal
        isOpen={isAddChildModalOpen}
        onClose={() => setIsAddChildModalOpen(false)}
      />
    </div>
  );
}

export default DashboardPage;
