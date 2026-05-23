import { z } from 'zod';

export const taskSessionSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  childId: z.string().uuid(),
  occurrenceDate: z.string().date().nullable(),
  state: z.enum(['active', 'completed', 'abandoned']),
  payload: z.record(z.string(), z.unknown()).nullable(),
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
});
export type TaskSession = z.infer<typeof taskSessionSchema>;

export const startSessionRequestSchema = z.object({
  taskId: z.string().uuid(),
  occurrenceDate: z.string().date().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});
export type StartSessionRequest = z.infer<typeof startSessionRequestSchema>;

export const saveSessionRequestSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
});
export type SaveSessionRequest = z.infer<typeof saveSessionRequestSchema>;

export const sessionParamsSchema = z.object({ sessionId: z.string().uuid() });
