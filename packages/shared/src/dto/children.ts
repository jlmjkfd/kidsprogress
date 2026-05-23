import { z } from 'zod';
import { childSchema } from '../domain/child.js';

export const createChildRequestSchema = z.object({
  displayName: z.string().min(1).max(80),
  birthDate: z.string().date().optional(),
  grade: z.string().max(40).optional(),
  avatarUrl: z.string().url().optional(),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits').optional(),
});
export type CreateChildRequest = z.infer<typeof createChildRequestSchema>;

export const updateChildRequestSchema = createChildRequestSchema.partial();
export type UpdateChildRequest = z.infer<typeof updateChildRequestSchema>;

export const childParamsSchema = z.object({
  childId: z.string().uuid(),
});
export type ChildParams = z.infer<typeof childParamsSchema>;

export const childListResponseSchema = z.object({
  children: z.array(childSchema),
});
export type ChildListResponse = z.infer<typeof childListResponseSchema>;
