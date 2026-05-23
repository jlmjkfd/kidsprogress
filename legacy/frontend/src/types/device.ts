/**
 * Device registration types
 */

export interface Device {
  _id: string;
  device_token: string;
  device_name: string;
  child_ids: string[];
  registered_at: string;
  last_used_at: string;
  is_active: boolean;
}

export interface DeviceRegistration {
  device_token: string;
  device_name: string;
  child_ids: string[];
}

export interface DeviceUpdate {
  device_name?: string;
  child_ids?: string[];
}
