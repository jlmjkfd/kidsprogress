/**
 * Device Token Management
 *
 * Generates and manages UUID for device identification.
 * Used for device registration to allow children passwordless access.
 */

const DEVICE_TOKEN_KEY = 'device_token';

/**
 * Get existing device token or generate new one
 */
export function getOrCreateDeviceToken(): string {
  let deviceToken = localStorage.getItem(DEVICE_TOKEN_KEY);

  if (!deviceToken) {
    // Generate UUID v4
    deviceToken = crypto.randomUUID();
    localStorage.setItem(DEVICE_TOKEN_KEY, deviceToken);
  }

  return deviceToken;
}

/**
 * Get device token without creating new one
 */
export function getDeviceToken(): string | null {
  return localStorage.getItem(DEVICE_TOKEN_KEY);
}

/**
 * Clear device token (for testing/unregistering)
 */
export function clearDeviceToken(): void {
  localStorage.removeItem(DEVICE_TOKEN_KEY);
}

/**
 * Check if device is registered
 */
export function hasDeviceToken(): boolean {
  return !!localStorage.getItem(DEVICE_TOKEN_KEY);
}
