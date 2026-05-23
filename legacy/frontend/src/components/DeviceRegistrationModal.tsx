/**
 * Device Registration Modal - Prompts to register device for child access
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { IconDevices, IconX, IconAlertCircle } from "@tabler/icons-react";
import { useChildren } from "@api/queries/useChildren";
import { getOrCreateDeviceToken } from "@/utils/deviceToken";
import { useRegisterDevice } from "@api/mutations/useRegisterDevice";

interface DeviceRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isTrustedDevice: boolean;
  showConfirmation?: boolean;
}

export default function DeviceRegistrationModal({
  isOpen,
  onClose,
  isTrustedDevice,
  showConfirmation = false,
}: DeviceRegistrationModalProps) {
  const { t } = useTranslation(["auth"]);
  const { data: children } = useChildren();
  const registerDeviceMutation = useRegisterDevice();
  const [deviceName, setDeviceName] = useState("");
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(showConfirmation);

  useEffect(() => {
    // Auto-select all children by default
    if (children && children.length > 0) {
      setSelectedChildren(children.map((child) => child._id));
    }
  }, [children]);

  if (!isOpen) return null;

  const handleRegister = () => {
    // If not trusted device and not confirmed yet, show confirmation
    if (!isTrustedDevice && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    const deviceToken = getOrCreateDeviceToken();

    registerDeviceMutation.mutate(
      {
        device_token: deviceToken,
        device_name: deviceName || "My Device",
        child_ids: selectedChildren,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const handleSkip = () => {
    onClose();
  };

  const toggleChild = (childId: string) => {
    setSelectedChildren((prev) =>
      prev.includes(childId) ? prev.filter((id) => id !== childId) : [...prev, childId]
    );
  };

  // Confirmation dialog for untrusted device
  if (showConfirm && !isTrustedDevice) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <IconAlertCircle className="text-amber-600 flex-shrink-0" size={32} />
            <h2 className="text-xl font-bold text-gray-900">
              {t("auth:device.registration_confirmation_title")}
            </h2>
          </div>

          <p className="text-gray-700 mb-6">{t("auth:device.registration_confirmation_message")}</p>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowConfirm(false);
                onClose();
              }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              {t("auth:device.confirm_no")}
            </button>
            <button
              onClick={handleRegister}
              disabled={registerDeviceMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {registerDeviceMutation.isPending ? t("auth:device.registering") : t("auth:device.confirm_yes")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main registration form
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <IconDevices className="text-blue-600" size={24} />
            {t("auth:device.register_prompt_title")}
          </h2>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Close"
          >
            <IconX size={24} />
          </button>
        </div>

        <p className="text-gray-600 mb-4">{t("auth:device.register_prompt_description")}</p>

        <div className="space-y-4">
          {/* Device Name */}
          <div>
            <label htmlFor="deviceName" className="block text-sm font-medium text-gray-700 mb-2">
              {t("auth:device.device_name_label")}
            </label>
            <input
              id="deviceName"
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder={t("auth:device.device_name_placeholder")}
            />
          </div>

          {/* Child Selection */}
          {children && children.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("auth:device.select_children")}
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {children.map((child) => (
                  <label
                    key={child._id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedChildren.includes(child._id)}
                      onChange={() => toggleChild(child._id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-900">{child.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div className="bg-blue-50 rounded-md p-3">
            <p className="text-sm text-blue-800">{t("auth:device.register_prompt_note")}</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              {t("auth:device.skip_button")}
            </button>
            <button
              onClick={handleRegister}
              disabled={registerDeviceMutation.isPending || selectedChildren.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {registerDeviceMutation.isPending ? t("auth:device.registering") : t("auth:device.register_button")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
