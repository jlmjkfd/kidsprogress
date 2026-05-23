/**
 * Device Edit Modal - Edit device name and child access
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { IconDevices, IconX, IconAlertCircle } from "@tabler/icons-react";
import { useChildren } from "@api/queries/useChildren";
import { useUpdateDevice } from "@api/mutations/useUpdateDevice";
import { Device } from "@/types/device";

interface DeviceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: Device;
}

export default function DeviceEditModal({ isOpen, onClose, device }: DeviceEditModalProps) {
  const { t } = useTranslation(["common"]);
  const { data: children } = useChildren();
  const updateDeviceMutation = useUpdateDevice();

  const [deviceName, setDeviceName] = useState(device.device_name);
  const [selectedChildren, setSelectedChildren] = useState<string[]>(device.child_ids);

  useEffect(() => {
    setDeviceName(device.device_name);
    setSelectedChildren(device.child_ids);
  }, [device]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateDeviceMutation.mutate(
      {
        device_token: device.device_token,
        updates: {
          device_name: deviceName,
          child_ids: selectedChildren,
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const handleClose = () => {
    updateDeviceMutation.reset();
    onClose();
  };

  const toggleChild = (childId: string) => {
    setSelectedChildren((prev) =>
      prev.includes(childId) ? prev.filter((id) => id !== childId) : [...prev, childId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <IconDevices className="text-blue-600" size={24} />
            {t("common:device_list.edit_device")}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Close"
          >
            <IconX size={24} />
          </button>
        </div>

        {updateDeviceMutation.isError && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
            <IconAlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{t("common:device_list.update_error")}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Device Name */}
          <div>
            <label htmlFor="deviceName" className="block text-sm font-medium text-gray-700 mb-2">
              {t("common:device_list.device_name")}
            </label>
            <input
              id="deviceName"
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              required
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

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              {t("common:buttons.cancel")}
            </button>
            <button
              type="submit"
              disabled={updateDeviceMutation.isPending || selectedChildren.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateDeviceMutation.isPending ? t("common:buttons.submitting") : t("common:buttons.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
