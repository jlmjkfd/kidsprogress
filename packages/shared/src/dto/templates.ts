import { z } from 'zod';

/**
 * Built-in handler identifiers. Free `text` in the DB but constrained in
 * Zod so the parent UI doesn't accidentally write `'unknown'`. Adding a
 * new handler is a code change in two places: this enum and a new module
 * under `packages/shared/src/handlers/`.
 */
export const handlerIdSchema = z.enum([
  'generic',
  'addition-subtraction',
  'writing',
  'reading-log',
]);
export type HandlerId = z.infer<typeof handlerIdSchema>;

export const visibilitySchema = z.enum(['private', 'shared']);
export type TemplateVisibility = z.infer<typeof visibilitySchema>;

export const schedulingTypeSchema = z.enum(['flexible', 'fixed_time', 'time_window', 'deadline']);
export type SchedulingType = z.infer<typeof schedulingTypeSchema>;

export const obligationSchema = z.enum(['required', 'optional']);
export type Obligation = z.infer<typeof obligationSchema>;

export const instanceStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'skipped',
  'abandoned',
]);
export type InstanceStatus = z.infer<typeof instanceStatusSchema>;

// ── task templates ───────────────────────────────────────────────────────
export const taskTemplateSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid(),
  handlerId: handlerIdSchema,
  schemaVersion: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  categoryPath: z.string().max(200).nullable(),
  tags: z.array(z.string().min(1).max(40)).max(20),
  /** Opaque to all consumers except the handler registry. */
  config: z.record(z.unknown()),
  aiAssistEnabled: z.boolean(),
  pluginVersion: z.number().int().positive(),
  visibility: visibilitySchema,
  isArchived: z.boolean(),
  defaultDurationMinutes: z.number().int().positive().nullable(),
  defaultRequiredAttempts: z.number().int().positive().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TaskTemplate = z.infer<typeof taskTemplateSchema>;

export const createTaskTemplateRequestSchema = z.object({
  handlerId: handlerIdSchema,
  schemaVersion: z.number().int().positive().default(1),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  categoryPath: z.string().max(200).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  config: z.record(z.unknown()),
  aiAssistEnabled: z.boolean().optional(),
  defaultDurationMinutes: z.number().int().positive().optional(),
  defaultRequiredAttempts: z.number().int().positive().optional(),
});
export type CreateTaskTemplateRequest = z.infer<typeof createTaskTemplateRequestSchema>;

export const updateTaskTemplateRequestSchema = createTaskTemplateRequestSchema
  .omit({ handlerId: true, schemaVersion: true })
  .partial();
export type UpdateTaskTemplateRequest = z.infer<typeof updateTaskTemplateRequestSchema>;

// ── task assignments ─────────────────────────────────────────────────────
export const taskAssignmentSchema = z.object({
  id: z.string().uuid(),
  templateId: z.string().uuid(),
  childId: z.string().uuid(),
  parentId: z.string().uuid(),
  rrule: z.string().nullable(),
  timezone: z.string(),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().nullable(),
  replacesAssignmentId: z.string().uuid().nullable(),
  replacedByAssignmentId: z.string().uuid().nullable(),
  schedulingType: schedulingTypeSchema,
  preferredStartTime: z.string().nullable(),
  preferredEndTime: z.string().nullable(),
  obligation: obligationSchema,
  durationMinutes: z.number().int().positive().nullable(),
  requiredAttempts: z.number().int().positive().nullable(),
  maxAttemptsPerOccurrence: z.number().int().positive().nullable(),
  createdAt: z.string().datetime(),
});
export type TaskAssignment = z.infer<typeof taskAssignmentSchema>;

export const createTaskAssignmentRequestSchema = z.object({
  templateId: z.string().uuid(),
  childId: z.string().uuid(),
  rrule: z.string().optional(),
  timezone: z.string().min(1).max(64),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().optional(),
  schedulingType: schedulingTypeSchema.default('flexible'),
  preferredStartTime: z.string().optional(),
  preferredEndTime: z.string().optional(),
  obligation: obligationSchema.default('required'),
  durationMinutes: z.number().int().positive().optional(),
  requiredAttempts: z.number().int().positive().optional(),
  maxAttemptsPerOccurrence: z.number().int().positive().optional(),
});
export type CreateTaskAssignmentRequest = z.infer<typeof createTaskAssignmentRequestSchema>;

// ── task instances (per-occurrence row) ──────────────────────────────────
export const taskInstanceSchema = z.object({
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
  templateId: z.string().uuid(),
  childId: z.string().uuid(),
  occurrenceDate: z.string(),
  originalDate: z.string(),
  effectiveTitle: z.string(),
  effectiveDescription: z.string().nullable(),
  effectivePreferredTime: z.string().nullable(),
  effectiveDurationMinutes: z.number().int().positive().nullable(),
  effectiveSchedulingType: schedulingTypeSchema,
  effectiveObligation: obligationSchema,
  status: instanceStatusSchema,
  attachedToolIds: z.array(z.string()),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TaskInstance = z.infer<typeof taskInstanceSchema>;

/**
 * The virtual-or-materialized key the calendar uses. When `kind='virtual'`
 * there is no row in `task_instances` yet — `materialize()` will create
 * one on first child write.
 */
export const instanceKeySchema = z.union([
  z.object({
    kind: z.literal('materialized'),
    instanceId: z.string().uuid(),
    assignmentId: z.string().uuid(),
    originalDate: z.string(),
  }),
  z.object({
    kind: z.literal('virtual'),
    assignmentId: z.string().uuid(),
    originalDate: z.string(),
  }),
]);
export type InstanceKey = z.infer<typeof instanceKeySchema>;
