import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconLock, IconChecklist } from "@tabler/icons-react";
import { useChild } from "@/api/queries/useChild";
import { useVerifyChildPin } from "@/api/mutations/useVerifyChildPin";
import { calculateAge } from "@/types/child";
import PinVerificationModal from "./components/PinVerificationModal";

function ChildProfilePage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(["common", "errors", "tasks"]);
  const { data: child, isLoading, error } = useChild(childId || "");
  const verifyPinMutation = useVerifyChildPin();
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    if (child && child.pin_required && !isPinVerified) {
      setShowPinModal(true);
    }
  }, [child, isPinVerified]);

  const handleVerifyPin = async (pin: string): Promise<boolean> => {
    try {
      const isValid = await verifyPinMutation.mutateAsync({
        childId: childId || "",
        pin,
      });
      if (isValid) {
        setIsPinVerified(true);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const handleClosePinModal = () => {
    setShowPinModal(false);
    navigate("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600">{t("common:loading")}</div>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="mb-4 text-red-600">
          {t("errors:failed_to_load_child")}
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {t("common:back_to_dashboard")}
        </button>
      </div>
    );
  }

  // Show PIN modal for protected children
  if (child?.pin_required && !isPinVerified) {
    return (
      <PinVerificationModal
        isOpen={showPinModal}
        childName={child.name}
        onVerify={handleVerifyPin}
        onClose={handleClosePinModal}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <span className="mr-2">←</span>
            {t("common:back")}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{child.name}</h1>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
      </header>

      {/* Profile Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-6 shadow">
          {/* Avatar and Basic Info */}
          <div className="mb-8 flex items-center space-x-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-3xl font-bold text-white">
              {child.avatar_url ? (
                <img
                  src={child.avatar_url}
                  alt={child.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                child.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{child.name}</h2>
              <p className="mt-1 text-gray-600">
                {t("common:age")}: {calculateAge(child.date_of_birth)} {t("common:years_old")}
              </p>
              {child.pin_required && (
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <IconLock className="mr-1 h-4 w-4" />
                  {t("common:pin_protected")}
                </div>
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-medium text-gray-500">
                {t("common:profile.member_since")}
              </h3>
              <p className="text-lg text-gray-900">
                {new Date(child.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-medium text-gray-500">
                {t("common:profile.last_updated")}
              </h3>
              <p className="text-lg text-gray-900">
                {new Date(child.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">{t("tasks:quick_actions")}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                onClick={() => navigate(`/child/${childId}/tasks`)}
                className="flex items-center gap-3 rounded-lg border-2 border-blue-200 bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
                  <IconChecklist className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{t("tasks:view_tasks")}</div>
                  <div className="text-sm text-gray-600">{t("tasks:manage_tasks")}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ChildProfilePage;
