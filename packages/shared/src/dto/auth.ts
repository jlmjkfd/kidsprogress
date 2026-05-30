import { z } from 'zod';

// ── primitives ───────────────────────────────────────────────────────────
export const emailSchema = z.string().email().max(254).toLowerCase();
export const passwordSchema = z.string().min(8).max(128);

/** 4–6 digit numeric PIN (parent portal gate AND child portal gate). */
export const pinSchema = z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits');

/** One-time parent-issued PIN-reset code (6 digits, 24 h TTL on server). */
export const pinResetCodeSchema = z.string().regex(/^\d{6}$/, 'Reset code must be 6 digits');

export const localeSchema = z.enum(['en', 'zh']);

// ── parent auth: register / login ────────────────────────────────────────
export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().min(1).max(80),
  locale: localeSchema.optional(),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

// ── shared response shapes ───────────────────────────────────────────────
export const authTokensSchema = z.object({
  /** Short-lived (15 min) bearer JWT. */
  accessToken: z.string(),
  /** ISO 8601 timestamp at which the access token expires. */
  expiresAt: z.string().datetime(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

/** "Me" — parent perspective. Children get a different shape (childMeSchema). */
export const parentMeSchema = z.object({
  id: z.string().uuid(),
  familyId: z.string().uuid(),
  email: emailSchema,
  displayName: z.string(),
  locale: localeSchema,
  /** True when the parent has set a parent-portal PIN re-gate. */
  hasParentPortalPin: z.boolean(),
});
export type ParentMe = z.infer<typeof parentMeSchema>;

export const childMeSchema = z.object({
  id: z.string().uuid(),
  familyId: z.string().uuid(),
  displayName: z.string(),
  /** `avatar-01` … `avatar-12`. */
  avatarKey: z.string(),
  /** `younger` (≤ 8) or `older` (≥ 9). Computed from birthYear. */
  ageBand: z.enum(['younger', 'older']),
});
export type ChildMe = z.infer<typeof childMeSchema>;

export const loginResponseSchema = z.object({
  user: parentMeSchema,
  tokens: authTokensSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const refreshResponseSchema = authTokensSchema;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

// ── parent portal PIN ────────────────────────────────────────────────────
/** Set or change the parent's portal-gate PIN. */
export const setParentPinRequestSchema = z.object({
  pin: pinSchema,
});
export type SetParentPinRequest = z.infer<typeof setParentPinRequestSchema>;

/** Verify the parent portal PIN to enter a sensitive surface. */
export const verifyParentPinRequestSchema = z.object({
  pin: pinSchema,
});
export type VerifyParentPinRequest = z.infer<typeof verifyParentPinRequestSchema>;

// ── child auth: device-scoped login ──────────────────────────────────────
/**
 * Child portal login. Device-token + childId is the canonical shape; PIN is
 * required when EITHER the device's roster row mandates it OR the child has
 * one set. The device-lookup endpoint (devices.ts) tells the client which
 * is which before this request is made.
 */
export const childLoginRequestSchema = z.object({
  deviceToken: z.string().min(16).max(256),
  childId: z.string().uuid(),
  pin: pinSchema.optional(),
});
export type ChildLoginRequest = z.infer<typeof childLoginRequestSchema>;

export const childLoginResponseSchema = z.object({
  child: childMeSchema,
  tokens: authTokensSchema,
});
export type ChildLoginResponse = z.infer<typeof childLoginResponseSchema>;

// ── view-as-child (parent reads child surfaces in read-only mode) ────────
export const viewAsChildRequestSchema = z.object({
  childId: z.string().uuid(),
  /** Re-prove parent identity with the portal PIN before granting view-as. */
  parentPin: pinSchema,
});
export type ViewAsChildRequest = z.infer<typeof viewAsChildRequestSchema>;

export const viewAsChildResponseSchema = z.object({
  child: childMeSchema,
  tokens: authTokensSchema,
});
export type ViewAsChildResponse = z.infer<typeof viewAsChildResponseSchema>;
