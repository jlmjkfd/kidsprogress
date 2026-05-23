import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  uptime: z.number().nonnegative(),
  version: z.string(),
  db: z.enum(['ok', 'down']),
  timestamp: z.string().datetime(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
