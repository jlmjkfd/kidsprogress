import { z } from 'zod';
import { childRosterCardSchema } from './children.js';

/**
 * Parent-facing device row. Includes the IDs of children attached to this
 * device (via the `device_children` join table). Never includes the device
 * token plaintext — only `tokenHashPrefix` for human disambiguation.
 */
export const deviceSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  registeredAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
  /** First 8 chars of SHA-256(token) — for parent UI to distinguish devices visually. */
  tokenHashPrefix: z.string().length(8),
  /** IDs of the children this device shows on the profile-selection grid. */
  childIds: z.array(z.string().uuid()),
});
export type Device = z.infer<typeof deviceSchema>;

// ── registration (parent-only) ───────────────────────────────────────────
export const registerDeviceRequestSchema = z.object({
  label: z.string().min(1).max(80),
  /**
   * Subset of family children that should appear on this device. Empty array
   * means "all current + future children" (parent can refine later).
   */
  childIds: z.array(z.string().uuid()).max(50),
});
export type RegisterDeviceRequest = z.infer<typeof registerDeviceRequestSchema>;

export const registerDeviceResponseSchema = z.object({
  device: deviceSchema,
  /**
   * The newly-minted plaintext device token. Shown to the parent ONCE so they
   * can paste it on the kid's tablet. Server stores only the SHA-256 hash.
   */
  deviceToken: z.string(),
});
export type RegisterDeviceResponse = z.infer<typeof registerDeviceResponseSchema>;

// ── per-device child roster management (parent-only) ─────────────────────
export const attachChildRequestSchema = z.object({
  childId: z.string().uuid(),
});
export type AttachChildRequest = z.infer<typeof attachChildRequestSchema>;

export const devicesListResponseSchema = z.object({
  devices: z.array(deviceSchema),
});
export type DevicesListResponse = z.infer<typeof devicesListResponseSchema>;

// ── public lookup (no auth, just the device token) ───────────────────────
/**
 * Used by the child-portal SelectionPage to render the family roster from a
 * trusted device WITHOUT a parent login session — i.e. when only the kids
 * are around. Public route + rate-limited.
 */
export const deviceLookupRequestSchema = z.object({
  deviceToken: z.string().min(16).max(256),
});
export type DeviceLookupRequest = z.infer<typeof deviceLookupRequestSchema>;

export const deviceLookupResponseSchema = z.object({
  /** Family display name — derived from the parent's displayName. */
  familyDisplayName: z.string(),
  /** Roster cards for every child attached to this device. */
  children: z.array(childRosterCardSchema),
});
export type DeviceLookupResponse = z.infer<typeof deviceLookupResponseSchema>;
