import { z } from 'zod';

export const childSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid(),
  displayName: z.string().min(1).max(80),
  birthDate: z.string().date().nullable(),
  grade: z.string().max(40).nullable(),
  avatarUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Child = z.infer<typeof childSchema>;
