import { z } from 'zod';

export const emailSchema = z.string().email().max(254).toLowerCase();
export const passwordSchema = z.string().min(8).max(128);
export const pinSchema = z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits');

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().min(1).max(80),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const childLoginRequestSchema = z.object({
  deviceToken: z.string().min(16).max(256),
  childId: z.string().uuid(),
  pin: pinSchema.optional(),
});
export type ChildLoginRequest = z.infer<typeof childLoginRequestSchema>;

export const parentPinVerifyRequestSchema = z.object({
  pin: pinSchema,
});
export type ParentPinVerifyRequest = z.infer<typeof parentPinVerifyRequestSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  expiresAt: z.string().datetime(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;
