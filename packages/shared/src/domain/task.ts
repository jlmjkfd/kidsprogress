import { z } from 'zod';
import { TaskKind, TaskStatus } from '../enums/index.js';

/**
 * Recurrence rule (minimal subset). Phase 2 supports:
 *   daily       — every N days
 *   weekly      — selected days-of-week, every N weeks
 *   monthly     — by month-day, every N months
 * `until` ends the series on/after a date (inclusive); `count` limits total
 * occurrences. Use either, not both.
 */
export const recurrenceRuleSchema = z.union([
  z.object({
    freq: z.literal('daily'),
    interval: z.number().int().positive().max(365).default(1),
    until: z.string().date().optional(),
    count: z.number().int().positive().max(1000).optional(),
  }),
  z.object({
    freq: z.literal('weekly'),
    interval: z.number().int().positive().max(52).default(1),
    byWeekday: z.array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).min(1),
    until: z.string().date().optional(),
    count: z.number().int().positive().max(1000).optional(),
  }),
  z.object({
    freq: z.literal('monthly'),
    interval: z.number().int().positive().max(12).default(1),
    byMonthday: z.array(z.number().int().min(1).max(31)).min(1),
    until: z.string().date().optional(),
    count: z.number().int().positive().max(1000).optional(),
  }),
]);
export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;

export const taskSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid(),
  childId: z.string().uuid(),
  collectionId: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  kind: z.enum([TaskKind.Generic, TaskKind.AdditionSubtraction, TaskKind.Writing]),
  settings: z.record(z.string(), z.unknown()).nullable(),
  scheduledDate: z.string().date().nullable(),
  durationMinutes: z.number().int().nullable(),
  isRecurring: z.boolean(),
  recurrenceRule: recurrenceRuleSchema.nullable(),
  status: z.enum([
    TaskStatus.Pending,
    TaskStatus.InProgress,
    TaskStatus.Completed,
    TaskStatus.Skipped,
    TaskStatus.Abandoned,
  ]),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Task = z.infer<typeof taskSchema>;

export const subtaskSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  title: z.string(),
  position: z.number().int(),
  isDone: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Subtask = z.infer<typeof subtaskSchema>;

export const completionSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  childId: z.string().uuid(),
  occurrenceDate: z.string().date().nullable(),
  completedAt: z.string().datetime(),
  durationMinutes: z.number().int().nullable(),
  score: z.number().int().nullable(),
  attempts: z.number().int(),
  notes: z.string().nullable(),
  meta: z.record(z.string(), z.unknown()).nullable(),
});
export type Completion = z.infer<typeof completionSchema>;

export const taskCollectionSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid(),
  name: z.string(),
  color: z.string().nullable(),
  position: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TaskCollection = z.infer<typeof taskCollectionSchema>;
