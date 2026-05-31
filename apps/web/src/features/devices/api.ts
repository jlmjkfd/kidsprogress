import { apiClient } from '@/lib/apiClient';
import type {
  Device,
  RegisterDeviceRequest,
  RegisterDeviceResponse,
} from '@kidsprogress/shared';

interface DevicesListResponse {
  devices: Device[];
}

export const devicesApi = {
  list: () => apiClient.get<DevicesListResponse>('/api/devices'),
  register: (req: RegisterDeviceRequest) =>
    apiClient.post<RegisterDeviceResponse>('/api/devices/register', req),
  revoke: (id: string) => apiClient.post(`/api/devices/${id}/revoke`),
  attachChild: (deviceId: string, childId: string) =>
    apiClient.post<Device>(`/api/devices/${deviceId}/children`, { childId }),
  detachChild: (deviceId: string, childId: string) =>
    apiClient.delete<Device>(`/api/devices/${deviceId}/children/${childId}`),
};
