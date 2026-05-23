import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// ── users ─────────────────────────────────────────────────────────────────
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    role: text('role', { enum: ['parent', 'child'] })
      .notNull()
      .default('parent'),
    pinHash: text('pin_hash'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
  }),
);
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

// ── children ─────────────────────────────────────────────────────────────
export const children = sqliteTable(
  'children',
  {
    id: text('id').primaryKey(),
    parentId: text('parent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    birthDate: text('birth_date'),
    grade: text('grade'),
    avatarUrl: text('avatar_url'),
    pinHash: text('pin_hash'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => ({
    parentIdIdx: index('children_parent_id_idx').on(table.parentId),
  }),
);
export type ChildRow = typeof children.$inferSelect;
export type NewChildRow = typeof children.$inferInsert;

// ── refresh_tokens ───────────────────────────────────────────────────────
// Stored as SHA-256 hash for O(1) lookup (audit fix #9). Family ID supports
// rotation + replay detection (audit fix #10).
export const refreshTokens = sqliteTable(
  'refresh_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    familyId: text('family_id').notNull(),
    issuedAt: text('issued_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
    replacedById: text('replaced_by_id'),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
  },
  (table) => ({
    tokenHashIdx: index('refresh_tokens_token_hash_idx').on(table.tokenHash),
    userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
    familyIdIdx: index('refresh_tokens_family_id_idx').on(table.familyId),
    expiresAtIdx: index('refresh_tokens_expires_at_idx').on(table.expiresAt),
  }),
);
export type RefreshTokenRow = typeof refreshTokens.$inferSelect;
export type NewRefreshTokenRow = typeof refreshTokens.$inferInsert;

// ── devices ──────────────────────────────────────────────────────────────
// A device is a tablet/phone that a child uses to log in without typing
// credentials. The device token is stored hashed; parents can revoke.
export const devices = sqliteTable(
  'devices',
  {
    id: text('id').primaryKey(),
    parentId: text('parent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    childId: text('child_id').references(() => children.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    pinRequired: integer('pin_required', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    lastSeenAt: text('last_seen_at'),
    revokedAt: text('revoked_at'),
  },
  (table) => ({
    parentIdIdx: index('devices_parent_id_idx').on(table.parentId),
    tokenHashIdx: index('devices_token_hash_idx').on(table.tokenHash),
  }),
);
export type DeviceRow = typeof devices.$inferSelect;
export type NewDeviceRow = typeof devices.$inferInsert;

// ── audit_logs ───────────────────────────────────────────────────────────
// Append-only audit log for security-relevant events. Never store secrets
// in `meta` — identifiers only.
export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    occurredAt: text('occurred_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    event: text('event').notNull(),
    actorUserId: text('actor_user_id'),
    actorEmail: text('actor_email'),
    targetUserId: text('target_user_id'),
    targetChildId: text('target_child_id'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    outcome: text('outcome', { enum: ['success', 'failure'] }).notNull(),
    meta: text('meta', { mode: 'json' }).$type<Record<string, unknown> | null>(),
  },
  (table) => ({
    occurredAtIdx: index('audit_logs_occurred_at_idx').on(table.occurredAt),
    eventIdx: index('audit_logs_event_idx').on(table.event),
    actorUserIdIdx: index('audit_logs_actor_user_id_idx').on(table.actorUserId),
  }),
);
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLogRow = typeof auditLogs.$inferInsert;

// ── task_collections ─────────────────────────────────────────────────────
// Optional groupings for tasks (Math practice, Reading, Chores). Owned by a parent.
export const taskCollections = sqliteTable(
  'task_collections',
  {
    id: text('id').primaryKey(),
    parentId: text('parent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color'),
    position: integer('position').notNull().default(0),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => ({
    parentIdIdx: index('task_collections_parent_id_idx').on(table.parentId),
  }),
);
export type TaskCollectionRow = typeof taskCollections.$inferSelect;
export type NewTaskCollectionRow = typeof taskCollections.$inferInsert;

// ── tasks ────────────────────────────────────────────────────────────────
// A task is either:
//   - A one-off scheduled task (is_recurring=false, scheduled_date set, status drives lifecycle)
//   - A recurring template (is_recurring=true, recurrence_rule set, no status)
// Recurring INSTANCES are materialized lazily ("virtual") for a given date
// range; they reference the template via parent_task_id when persisted on
// completion or override.
export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    parentId: text('parent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    childId: text('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    collectionId: text('collection_id').references(() => taskCollections.id, {
      onDelete: 'set null',
    }),

    title: text('title').notNull(),
    description: text('description'),
    kind: text('kind', { enum: ['generic', 'addition-subtraction', 'writing'] })
      .notNull()
      .default('generic'),
    // Kind-specific settings (JSON). Schema validation done at the route layer.
    settings: text('settings', { mode: 'json' }).$type<Record<string, unknown> | null>(),

    // For one-off tasks. ISO date (YYYY-MM-DD).
    scheduledDate: text('scheduled_date'),
    durationMinutes: integer('duration_minutes'),

    // Recurrence: rrule-like JSON. When recurring, scheduledDate/status are unused
    // and lifecycle moves to materialized completion rows.
    isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
    recurrenceRule: text('recurrence_rule', { mode: 'json' }).$type<Record<string, unknown> | null>(),

    // For materialized one-off tasks only.
    status: text('status', {
      enum: ['pending', 'in_progress', 'completed', 'skipped', 'abandoned'],
    })
      .notNull()
      .default('pending'),
    startedAt: text('started_at'),
    completedAt: text('completed_at'),

    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => ({
    parentChildIdx: index('tasks_parent_child_idx').on(table.parentId, table.childId),
    childScheduledIdx: index('tasks_child_scheduled_idx').on(table.childId, table.scheduledDate),
    isRecurringIdx: index('tasks_is_recurring_idx').on(table.isRecurring),
    collectionIdx: index('tasks_collection_idx').on(table.collectionId),
  }),
);
export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;

// ── subtasks ─────────────────────────────────────────────────────────────
export const subtasks = sqliteTable(
  'subtasks',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    position: integer('position').notNull().default(0),
    isDone: integer('is_done', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => ({
    taskIdIdx: index('subtasks_task_id_idx').on(table.taskId),
  }),
);
export type SubtaskRow = typeof subtasks.$inferSelect;
export type NewSubtaskRow = typeof subtasks.$inferInsert;

// ── completions ──────────────────────────────────────────────────────────
// One row per completion event. For recurring tasks the templateTaskId is the
// recurring task id and occurrenceDate is the date the instance was for.
export const completions = sqliteTable(
  'completions',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    childId: text('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    occurrenceDate: text('occurrence_date'), // YYYY-MM-DD; for recurring instances
    completedAt: text('completed_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    durationMinutes: integer('duration_minutes'),
    score: integer('score'),
    attempts: integer('attempts').notNull().default(1),
    notes: text('notes'),
    meta: text('meta', { mode: 'json' }).$type<Record<string, unknown> | null>(),
  },
  (table) => ({
    taskIdIdx: index('completions_task_id_idx').on(table.taskId),
    childIdIdx: index('completions_child_id_idx').on(table.childId),
    occurrenceIdx: index('completions_occurrence_idx').on(table.taskId, table.occurrenceDate),
  }),
);
export type CompletionRow = typeof completions.$inferSelect;
export type NewCompletionRow = typeof completions.$inferInsert;

// ── recurrence_exceptions ────────────────────────────────────────────────
// Skip a date or override fields for a single occurrence of a recurring task.
export const recurrenceExceptions = sqliteTable(
  'recurrence_exceptions',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    occurrenceDate: text('occurrence_date').notNull(),
    action: text('action', { enum: ['skip', 'override'] }).notNull(),
    overrides: text('overrides', { mode: 'json' }).$type<Record<string, unknown> | null>(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => ({
    taskDateIdx: index('recurrence_exceptions_task_date_idx').on(table.taskId, table.occurrenceDate),
  }),
);
export type RecurrenceExceptionRow = typeof recurrenceExceptions.$inferSelect;
export type NewRecurrenceExceptionRow = typeof recurrenceExceptions.$inferInsert;
