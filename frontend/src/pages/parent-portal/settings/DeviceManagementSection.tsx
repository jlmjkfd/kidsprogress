/**
 * Device Management Section - Shows list of registered devices
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconDevices, IconEdit, IconTrash, IconAlertCircle } from "@tabler/icons-react";
import { useDevices } from "@api/queries/useDevices";
import { useChildren } from "@api/queries/useChildren";
import { useRemoveDevice } from "@api/mutations/useRemoveDevice";
import { getDeviceToken } from "@/utils/deviceToken";
import DeviceEditModal from "./DeviceEditModal";
import DeviceRemoveModal from "./DeviceRemoveModal";

export default function DeviceManagementSection() {
  const { t } = useTranslation(["common"]);
  const { data: devices, isLoading } = useDevices();
  const { data: children } = useChildren();
  const currentDeviceToken = getDeviceToken();

  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [removingDevice, setRemovingDevice] = useState<string | null>(null);

  const getChildrenNames = (childIds: string[]) => {
    if (!children) return "";
    const names = childIds
      .map((id) => children.find((child) => child._id === id)?.name)
      .filter(Boolean);
    return names.join(", ") || t("common:device_list.no_children");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <IconDevices className="text-blue-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">{t("common:settings.device_management")}</h2>
        </div>
        <p className="text-gray-600">{t("common:loading")}</p>
      </div>
    );
  }

  const activeDevices = devices?.filter((device) => device.is_active) || [];

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <IconDevices className="text-blue-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">{t("common:settings.device_management")}</h2>
        </div>
        <p className="text-gray-600 mb-4">
          {t("common:settings.device_management_description")}
        </p>

        {activeDevices.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-500 py-4">
            <IconAlertCircle size={20} />
            <span>{t("common:device_list.no_devices")}</span>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDevices.map((device) => (
              <div
                key={device._id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{device.device_name}</h3>
                      {device.device_token === currentDeviceToken && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {t("common:device_list.current_device")}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">{t("common:device_list.registered")}:</span>{" "}
                        {formatDate(device.registered_at)}
                      </p>
                      <p>
                        <span className="font-medium">{t("common:device_list.last_used")}:</span>{" "}
                        {formatDate(device.last_used_at)}
                      </p>
                      <p>
                        <span className="font-medium">{t("common:device_list.children_access")}:</span>{" "}
                        {getChildrenNames(device.child_ids)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => setEditingDevice(device.device_token)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title={t("common:device_list.edit")}
                    >
                      <IconEdit size={20} />
                    </button>
                    <button
                      onClick={() => setRemovingDevice(device.device_token)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title={t("common:device_list.remove")}
                    >
                      <IconTrash size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Device Modal */}
      {editingDevice && (
        <DeviceEditModal
          isOpen={!!editingDevice}
          onClose={() => setEditingDevice(null)}
          device={devices?.find((d) => d.device_token === editingDevice)!}
        />
      )}

      {/* Remove Device Modal */}
      {removingDevice && (
        <DeviceRemoveModal
          isOpen={!!removingDevice}
          onClose={() => setRemovingDevice(null)}
          deviceToken={removingDevice}
          deviceName={devices?.find((d) => d.device_token === removingDevice)?.device_name || ""}
        />
      )}
    </>
  );
}
