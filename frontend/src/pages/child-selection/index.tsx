/**
 * Child Selection Page - Children select themselves to enter child portal
 */
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconUser, IconArrowLeft, IconLock } from "@tabler/icons-react";
import { useChildren } from "@/api/queries/useChildren";
import { calculateAge } from "@/types/child";

export default function ChildSelectionPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(["common"]);
  const { data: children, isLoading, isError } = useChildren();

  const handleSelectChild = (childId: string) => {
    navigate(`/child-portal/${childId}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-gray-600">{t("common:loading")}</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-red-600">Failed to load children</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/portal-selection")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <IconArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Who are you?</h1>
            <div className="w-20"></div> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Child Selection */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Select Your Profile
          </h2>
          <p className="text-lg text-gray-600">
            Choose your name to start learning and playing
          </p>
        </div>

        {children && children.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <button
                key={child._id}
                onClick={() => handleSelectChild(child._id)}
                className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-4 border-transparent hover:border-purple-400"
              >
                {/* Avatar */}
                <div className="mb-6">
                  <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-4xl font-bold group-hover:scale-110 transition-transform">
                    {child.avatar_url ? (
                      <img
                        src={child.avatar_url}
                        alt={child.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <IconUser size={64} stroke={2} />
                    )}
                  </div>
                </div>

                {/* Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {child.name}
                </h3>

                {/* Age */}
                <p className="text-gray-600 mb-3">
                  {calculateAge(child.date_of_birth)} {t("common:years_old")}
                </p>

                {/* PIN Badge */}
                {child.pin_required && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    <IconLock size={14} />
                    <span>PIN Required</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-3xl shadow-lg">
            <IconUser className="mx-auto h-24 w-24 text-gray-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No children found
            </h3>
            <p className="text-gray-600 mb-6">
              Ask your parent to add your profile first
            </p>
            <button
              onClick={() => navigate("/portal-selection")}
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <IconArrowLeft size={20} />
              <span>Go Back</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
