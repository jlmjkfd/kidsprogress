import { z } from 'zod';

export const deviceSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  childId: z.string().uuid().nullable(),
  pinRequired: z.boolean(),
  createdAt: z.string().datetime(),
  lastSeenAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
});
export type Device = z.infer<typeof deviceSchema>;

export const registerDeviceRequestSchema = z.object({
  label: z.string().min(1).max(80),
  childId: z.string().uuid().optional(),
  pinRequired: z.boolean().default(true),
});
export type RegisterDeviceRequest = z.infer<typeof registerDeviceRequestSchema>;

export const registerDeviceResponseSchema = z.object({
  device: deviceSchema,
  // The plaintext device token. Returned ONCE at registration; not recoverable later.
  deviceToken: z.string(),
});
export type RegisterDeviceResponse = z.infer<typeof registerDeviceResponseSchema>;

export const deviceListResponseSchema = z.object({
  devices: z.array(deviceSchema),
});
export type DeviceListResponse = z.infer<typeof deviceListResponseSchema>;
