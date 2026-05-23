import { z } from 'zod';
import { UserRole } from '../enums/index.js';

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  role: z.enum([UserRole.Parent, UserRole.Child]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type User = z.infer<typeof userSchema>;
