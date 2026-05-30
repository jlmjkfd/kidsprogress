import { z } from 'zod';
import { pinResetCodeSchema, pinSchema } from './auth.js';

/**
 * Avatar identifier — one of `avatar-01` … `avatar-12`. Backed by a static
 * SVG set in the web app; never an uploaded photo (PII-light policy).
 */
export const avatarKeySchema = z
  .string()
  .regex(/^avatar-(0[1-9]|1[0-2])$/, 'avatarKey must be avatar-01..avatar-12');

/**
 * Birth year (not full DOB). Used to compute age band and minimise PII
 * flowing to the LLM wrapper. Range gives some give without admitting
 * silly values; tighten if needed.
 */
export const birthYearSchema = z.number().int().gte(2000).lte(2030);

/** Server-side row shape returned to the parent. */
export const childSchema = z.object({
  id: z.string().uuid(),
  familyId: z.string().uuid(),
  displayName: z.string(),
  avatarKey: avatarKeySchema,
  birthYear: birthYearSchema.nullable(),
  pinRequired: z.boolean(),
  /** True when the child has a PIN set (we never return the hash). */
  hasPin: z.boolean(),
  /** Set when the child has tripped the lockout (5 failures in 15 min). */
  lockedUntil: z.string().datetime().nullable(),
  /** Set when the parent has an active reset code outstanding. */
  hasPinResetCode: z.boolean(),
  dailyAiTokenCap: z.number().int().nonnegative(),
  streakOptIn: z.boolean(),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Child = z.infer<typeof childSchema>;

// ── CRUD ─────────────────────────────────────────────────────────────────
export const createChildRequestSchema = z.object({
  displayName: z.string().min(1).max(80),
  avatarKey: avatarKeySchema.default('avatar-01'),
  birthYear: birthYearSchema.optional(),
  pinRequired: z.boolean().optional(),
  /** Optional initial PIN. Omit to leave PIN-less. */
  pin: pinSchema.optional(),
  dailyAiTokenCap: z.number().int().nonnegative().max(50_000).optional(),
  streakOptIn: z.boolean().optional(),
});
export type CreateChildRequest = z.infer<typeof createChildRequestSchema>;

/**
 * PATCH body. Deliberately drops `pin`, `pinRequired`, and `archivedAt` —
 * these are mutated only via the dedicated endpoints (`POST /:id/pin`,
 * `DELETE /:id/pin`, `POST /:id/archive`, `POST /:id/restore`). Funnelling
 * them through PATCH would (a) emit the wrong audit-event kind and (b)
 * allow `pinRequired=true && pinHash=null`, which soft-bricks the child.
 */
export const updateChildRequestSchema = createChildRequestSchema
  .omit({ pin: true, pinRequired: true })
  .partial();
export type UpdateChildRequest = z.infer<typeof updateChildRequestSchema>;

// ── PIN management ──────────────────────────────────────────────────────
/** Parent sets or rotates a child's PIN directly. */
export const setChildPinRequestSchema = z.object({
  pin: pinSchema,
});
export type SetChildPinRequest = z.infer<typeof setChildPinRequestSchema>;

/** Parent issues a one-time reset code. Server returns the code; never persisted in plaintext. */
export const issueChildPinResetResponseSchema = z.object({
  resetCode: pinResetCodeSchema,
  expiresAt: z.string().datetime(),
});
export type IssueChildPinResetResponse = z.infer<typeof issueChildPinResetResponseSchema>;

/** Kid uses the parent-issued code on the device to set a new PIN. */
export const useChildPinResetRequestSchema = z.object({
  childId: z.string().uuid(),
  resetCode: pinResetCodeSchema,
  newPin: pinSchema,
});
export type UseChildPinResetRequest = z.infer<typeof useChildPinResetRequestSchema>;

// ── list shapes ──────────────────────────────────────────────────────────
/** Parent-facing list — full row data. */
export const childrenListResponseSchema = z.object({
  children: z.array(childSchema),
});
export type ChildrenListResponse = z.infer<typeof childrenListResponseSchema>;

/**
 * Roster card shape (public-via-device-token).
 *
 * What the child-portal selection grid renders BEFORE login. Carries
 * everything the kid needs to identify themselves + understand whether a
 * PIN is required, and NOTHING more (no familyId leak, no lockedUntil
 * surfaced to non-authenticated callers).
 */
export const childRosterCardSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  avatarKey: avatarKeySchema,
  /** True when this child requires a PIN on this device. */
  pinRequired: z.boolean(),
  /**
   * True when the kid is in the lockout window. Surfaced so the device can
   * show "🔒 try again later" without leaking the exact lockedUntil time.
   */
  isLocked: z.boolean(),
});
export type ChildRosterCard = z.infer<typeof childRosterCardSchema>;
