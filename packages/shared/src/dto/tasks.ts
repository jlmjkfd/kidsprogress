import { z } from 'zod';
import { recurrenceRuleSchema, taskSchema, completionSchema, subtaskSchema, taskCollectionSchema } from '../domain/task.js';
import { TaskKind, TaskStatus } from '../enums/index.js';

// ── Create / Update task ─────────────────────────────────────────────────
export const createTaskRequestSchema = z
  .object({
    childId: z.string().uuid(),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    kind: z.enum([TaskKind.Generic, TaskKind.AdditionSubtraction, TaskKind.Writing]).default(TaskKind.Generic),
    settings: z.record(z.string(), z.unknown()).optional(),
    collectionId: z.string().uuid().optional(),
    durationMinutes: z.number().int().positive().max(480).optional(),

    // Either scheduledDate (one-off) OR isRecurring + recurrenceRule (template).
    scheduledDate: z.string().date().optional(),
    isRecurring: z.boolean().default(false),
    recurrenceRule: recurrenceRuleSchema.optional(),
  })
  .refine(
    (v) => (v.isRecurring ? !!v.recurrenceRule : !!v.scheduledDate),
    'recurring tasks need recurrenceRule, one-off tasks need scheduledDate',
  );
export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;

export const updateTaskRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  settings: z.record(z.string(), z.unknown()).nullable().optional(),
  collectionId: z.string().uuid().nullable().optional(),
  durationMinutes: z.number().int().positive().max(480).nullable().optional(),
  scheduledDate: z.string().date().nullable().optional(),
  recurrenceRule: recurrenceRuleSchema.nullable().optional(),
});
export type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>;

export const taskParamsSchema = z.object({ taskId: z.string().uuid() });
export type TaskParams = z.infer<typeof taskParamsSchema>;

export const taskListQuerySchema = z.object({
  childId: z.string().uuid().optional(),
  collectionId: z.string().uuid().optional(),
  status: z
    .enum([
      TaskStatus.Pending,
      TaskStatus.InProgress,
      TaskStatus.Completed,
      TaskStatus.Skipped,
      TaskStatus.Abandoned,
    ])
    .optional(),
  // ISO date range for one-off tasks
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional(),
});
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;

export const taskListResponseSchema = z.object({
  tasks: z.array(taskSchema),
});
export type TaskListResponse = z.infer<typeof taskListResponseSchema>;

// ── Lifecycle ────────────────────────────────────────────────────────────
export const completeTaskRequestSchema = z.object({
  durationMinutes: z.number().int().positive().max(480).optional(),
  score: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(1000).optional(),
  // For recurring tasks: which occurrence is being completed
  occurrenceDate: z.string().date().optional(),
});
export type CompleteTaskRequest = z.infer<typeof completeTaskRequestSchema>;

export const skipTaskRequestSchema = z.object({
  reason: z.string().max(500).optional(),
  occurrenceDate: z.string().date().optional(),
});
export type SkipTaskRequest = z.infer<typeof skipTaskRequestSchema>;

// ── Subtasks ─────────────────────────────────────────────────────────────
export const createSubtaskRequestSchema = z.object({
  title: z.string().min(1).max(200),
  position: z.number().int().min(0).max(1000).optional(),
});
export type CreateSubtaskRequest = z.infer<typeof createSubtaskRequestSchema>;

export const updateSubtaskRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  position: z.number().int().min(0).max(1000).optional(),
  isDone: z.boolean().optional(),
});
export type UpdateSubtaskRequest = z.infer<typeof updateSubtaskRequestSchema>;

export const subtaskParamsSchema = z.object({
  taskId: z.string().uuid(),
  subtaskId: z.string().uuid(),
});

export const subtaskListResponseSchema = z.object({
  subtasks: z.array(subtaskSchema),
});

// ── Completions ──────────────────────────────────────────────────────────
export const completionListQuerySchema = z.object({
  childId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional(),
  limit: z.coerce.number().int().positive().max(500).default(50),
});
export type CompletionListQuery = z.infer<typeof completionListQuerySchema>;

export const completionListResponseSchema = z.object({
  completions: z.array(completionSchema),
});

// ── Task collections ─────────────────────────────────────────────────────
export const createCollectionRequestSchema = z.object({
  name: z.string().min(1).max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  position: z.number().int().min(0).optional(),
});
export type CreateCollectionRequest = z.infer<typeof createCollectionRequestSchema>;

export const updateCollectionRequestSchema = createCollectionRequestSchema.partial();
export type UpdateCollectionRequest = z.infer<typeof updateCollectionRequestSchema>;

export const collectionParamsSchema = z.object({ collectionId: z.string().uuid() });

export const collectionListResponseSchema = z.object({
  collections: z.array(taskCollectionSchema),
});

// ── Recurring instances (virtual, computed on read) ──────────────────────
export const taskInstancesQuerySchema = z.object({
  childId: z.string().uuid(),
  fromDate: z.string().date(),
  toDate: z.string().date(),
});
export type TaskInstancesQuery = z.infer<typeof taskInstancesQuerySchema>;

export const taskInstanceSchema = z.object({
  templateTaskId: z.string().uuid(),
  occurrenceDate: z.string().date(),
  childId: z.string().uuid(),
  title: z.string(),
  durationMinutes: z.number().int().nullable(),
  kind: taskSchema.shape.kind,
  isCompleted: z.boolean(),
  isSkipped: z.boolean(),
});
export type TaskInstance = z.infer<typeof taskInstanceSchema>;

export const taskInstancesResponseSchema = z.object({
  instances: z.array(taskInstanceSchema),
});
