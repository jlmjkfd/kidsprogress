/**
 * Device Remove Confirmation Modal
 */
import { useTranslation } from "react-i18next";
import { IconAlertCircle, IconX } from "@tabler/icons-react";
import { useRemoveDevice } from "@api/mutations/useRemoveDevice";

interface DeviceRemoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceToken: string;
  deviceName: string;
}

export default function DeviceRemoveModal({ isOpen, onClose, deviceToken, deviceName }: DeviceRemoveModalProps) {
  const { t } = useTranslation(["common"]);
  const removeDeviceMutation = useRemoveDevice();

  if (!isOpen) return null;

  const handleRemove = () => {
    removeDeviceMutation.mutate(deviceToken, {
      onSuccess: () => {
        removeDeviceMutation.reset();
        onClose();
      },
    });
  };

  const handleClose = () => {
    removeDeviceMutation.reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <IconAlertCircle className="text-red-600" size={32} />
            <h2 className="text-xl font-bold text-gray-900">
              {t("common:device_list.remove_device")}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Close"
          >
            <IconX size={24} />
          </button>
        </div>

        <p className="text-gray-700 mb-2">
          {t("common:device_list.remove_confirmation", { deviceName })}
        </p>
        <p className="text-sm text-gray-600 mb-6">
          {t("common:device_list.remove_warning")}
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            {t("common:buttons.cancel")}
          </button>
          <button
            onClick={handleRemove}
            disabled={removeDeviceMutation.isPending}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {removeDeviceMutation.isPending ? t("common:device_list.removing") : t("common:device_list.remove")}
          </button>
        </div>
      </div>
    </div>
  );
}
