/**
 * KidsProgress v2.5 — Drizzle schema.
 *
 * Phase 1 covers identity + auth. Templates / assignments / instances /
 * completions / sessions / attachments land later (Phase 4+) and will be
 * appended to this file as separate banded sections.
 *
 * Conventions:
 *   - All IDs are text (UUIDv7 / ULID-shaped — time-sortable).
 *   - All timestamps are text ISO 8601 with millisecond precision emitted
 *     via `strftime('%Y-%m-%dT%H:%M:%fZ','now')`.
 *   - All booleans are `integer(..., { mode: 'boolean' })`.
 *   - PIN / token hashes are argon2id / SHA-256 — never plaintext.
 *   - Family scoping: `users.id === users.familyId` at insert time; every
 *     identity row carries `familyId` for O(1) "is this in my family?" checks.
 */
import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const ISO_NOW = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

// ── identity ─────────────────────────────────────────────────────────────

/** A parent. Owns one family (denormalized — `familyId` mirrors `id` for now). */
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    familyId: text('family_id').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    /** Optional PIN that re-gates the parent portal from a trusted device. */
    parentPortalPinHash: text('parent_portal_pin_hash'),
    /** UI / i18n preference. 'en' | 'zh' at launch. */
    locale: text('locale').notNull().default('en'),
    createdAt: text('created_at').notNull().default(ISO_NOW),
    updatedAt: text('updated_at').notNull().default(ISO_NOW),
  },
  (t) => ({
    emailUnique: uniqueIndex('users_email_unique').on(t.email),
    familyIdx: index('users_family_idx').on(t.familyId),
  }),
);

/** A child profile under one family. NOT an account. */
export const children = sqliteTable(
  'children',
  {
    id: text('id').primaryKey(),
    /**
     * familyId scoping is enforced at the service layer (every read/write
     * checks `child.familyId === currentUser.familyId`). We don't declare a
     * FK to `users.familyId` here because that column isn't unique — SQLite
     * rejects FKs whose parent column isn't unique or a PK, and a unique
     * constraint would forbid future multi-parent families.
     */
    familyId: text('family_id').notNull(),
    displayName: text('display_name').notNull(),
    /** One of `avatar-01` … `avatar-12` (PII-light, no uploaded photo at launch). */
    avatarKey: text('avatar_key').notNull().default('avatar-01'),
    /**
     * Year-of-birth only — never full DOB. Used to bucket age (≤8 = younger,
     * ≥9 = older) and minimise PII flowing to the LLM wrapper.
     */
    birthYear: integer('birth_year'),

    // PIN gate for child-portal entry.
    pinRequired: integer('pin_required', { mode: 'boolean' }).notNull().default(false),
    pinHash: text('pin_hash'),
    failedPinAttempts: integer('failed_pin_attempts').notNull().default(0),
    /** When set + in the future, child cannot log in. Cleared on success or by parent. */
    lockedUntil: text('locked_until'),
    /** Parent-issued one-time reset code so they never learn the kid's PIN. */
    pinResetCodeHash: text('pin_reset_code_hash'),
    pinResetCodeExpiresAt: text('pin_reset_code_expires_at'),

    /** Per-child daily Gemini token cap. 0 = unlimited (don't ship that). */
    dailyAiTokenCap: integer('daily_ai_token_cap').notNull().default(5000),

    /** Opt-in only — drives the growing-plant streak glyph. */
    streakOptIn: integer('streak_opt_in', { mode: 'boolean' }).notNull().default(false),

    archivedAt: text('archived_at'),
    createdAt: text('created_at').notNull().default(ISO_NOW),
    updatedAt: text('updated_at').notNull().default(ISO_NOW),
  },
  (t) => ({
    familyIdx: index('children_family_idx').on(t.familyId),
  }),
);

// ── devices ──────────────────────────────────────────────────────────────

/**
 * A trusted family device (tablet / phone). The actual device token is a
 * server-minted UUID; only its SHA-256 hash is stored.
 *
 * NOT bound to a single child — see `device_children` for the family roster
 * subset that this device shows.
 */
export const devices = sqliteTable(
  'devices',
  {
    id: text('id').primaryKey(),
    familyId: text('family_id').notNull(),
    /** SHA-256 hex digest of the device-token UUID — never the plaintext token. */
    tokenHash: text('token_hash').notNull(),
    label: text('label').notNull(),
    registeredAt: text('registered_at').notNull().default(ISO_NOW),
    lastUsedAt: text('last_used_at'),
    revokedAt: text('revoked_at'),
  },
  (t) => ({
    tokenHashUnique: uniqueIndex('devices_token_hash_unique').on(t.tokenHash),
    familyIdx: index('devices_family_idx').on(t.familyId),
  }),
);

/**
 * Which children appear on which device. Lets a parent say "this iPad is
 * only for the younger two." `(deviceId, childId)` is the PK.
 */
export const deviceChildren = sqliteTable(
  'device_children',
  {
    deviceId: text('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    childId: text('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    attachedAt: text('attached_at').notNull().default(ISO_NOW),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.deviceId, t.childId] }),
    childIdx: index('device_children_child_idx').on(t.childId),
  }),
);

// ── refresh tokens ───────────────────────────────────────────────────────

/**
 * Polymorphic refresh tokens — work for parents AND children. `subjectKind`
 * + `subjectId` keeps the role tag baked into the row (no fk so children +
 * users tables stay decoupled). One row per active token; rotation flips
 * `revokedAt` on the old row and inserts a new one.
 */
export const refreshTokens = sqliteTable(
  'refresh_tokens',
  {
    id: text('id').primaryKey(),
    subjectKind: text('subject_kind', { enum: ['parent', 'child'] }).notNull(),
    subjectId: text('subject_id').notNull(),
    /** Optional — null on parent web-login, set for device-bound child sessions. */
    deviceId: text('device_id'),
    /** SHA-256 of the refresh token — O(1) lookup, no per-row bcrypt scan. */
    tokenHash: text('token_hash').notNull(),
    issuedAt: text('issued_at').notNull().default(ISO_NOW),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
    /** If revoked because of replay, links the family of compromised tokens. */
    revokedReason: text('revoked_reason'),
  },
  (t) => ({
    tokenHashUnique: uniqueIndex('refresh_tokens_token_hash_unique').on(t.tokenHash),
    subjectIdx: index('refresh_tokens_subject_idx').on(t.subjectKind, t.subjectId),
    deviceIdx: index('refresh_tokens_device_idx').on(t.deviceId),
  }),
);

// ── auth audit log ───────────────────────────────────────────────────────

/**
 * Append-only authentication-event log. Surfaces to the parent settings
 * page (Phase 3) as a "recent activity" feed. Audit-#1 fix: never log
 * passwords or PIN plaintexts here.
 */
export const authEvents = sqliteTable(
  'auth_events',
  {
    id: text('id').primaryKey(),
    at: text('at').notNull().default(ISO_NOW),
    familyId: text('family_id'),
    /** Free-form actor descriptor: `parent:<userId>` / `child:<childId>` / null. */
    actor: text('actor'),
    kind: text('kind', {
      enum: [
        'parent_login',
        'parent_logout',
        'parent_register',
        'parent_pin_set',
        'parent_pin_verify',
        'child_created',
        'child_updated',
        'child_archived',
        'child_restored',
        'child_pin_set',
        'child_pin_cleared',
        'child_login',
        'child_logout',
        'pin_failure',
        'pin_locked',
        'pin_reset_issued',
        'pin_reset_used',
        'device_register',
        'device_revoke',
        'device_child_attach',
        'device_child_detach',
        'view_as_child',
        'token_refresh',
        'token_replay_detected',
      ],
    }).notNull(),
    outcome: text('outcome', { enum: ['success', 'failure'] }).notNull(),
    reason: text('reason'),
    ip: text('ip'),
    userAgent: text('user_agent'),
  },
  (t) => ({
    atIdx: index('auth_events_at_idx').on(t.at),
    familyIdx: index('auth_events_family_idx').on(t.familyId),
    kindIdx: index('auth_events_kind_idx').on(t.kind),
  }),
);

// ── templates / assignments / instances (Phase 4) ────────────────────────

/**
 * The WHAT of a task. Owned by the parent, child-agnostic. `handlerId` +
 * `schemaVersion` together pin the validator that owns `config` — see
 * `packages/shared/src/handlers/` (lands in Phase 5).
 *
 * `config` is opaque JSON; nothing outside the handler registry should
 * read its shape. AI metadata (prompt template, response schema, budget
 * slot) lives in the handler version manifest — NOT on this row. The only
 * AI knob the parent sees per-template is `aiAssistEnabled`.
 */
export const taskTemplates = sqliteTable(
  'task_templates',
  {
    id: text('id').primaryKey(),
    parentId: text('parent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    handlerId: text('handler_id').notNull(),
    schemaVersion: integer('schema_version').notNull(),

    name: text('name').notNull(),
    description: text('description'),
    categoryPath: text('category_path'),
    tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default(sql`(json('[]'))`),

    /** Opaque, handler-validated. Hosts MUST NOT read fields directly. */
    config: text('config', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .notNull(),

    aiAssistEnabled: integer('ai_assist_enabled', { mode: 'boolean' })
      .notNull()
      .default(false),

    /** Bumped on breaking handler changes — drives targeted migration. */
    pluginVersion: integer('plugin_version').notNull().default(1),

    visibility: text('visibility', { enum: ['private', 'shared'] }).notNull().default('private'),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),

    /** Default duration when the parent hasn't overridden per-assignment. */
    defaultDurationMinutes: integer('default_duration_minutes'),
    /** Default rounds-required-to-complete; null = handler-decides. */
    defaultRequiredAttempts: integer('default_required_attempts'),

    createdAt: text('created_at').notNull().default(ISO_NOW),
    updatedAt: text('updated_at').notNull().default(ISO_NOW),
  },
  (t) => ({
    parentIdx: index('task_templates_parent_idx').on(t.parentId),
    handlerIdx: index('task_templates_handler_idx').on(t.handlerId, t.schemaVersion),
  }),
);

/**
 * The WHO / WHEN / HOW-OFTEN. Binds one template to one child for a date
 * range with an RRULE (or one-shot date). Append-only linked-list history
 * via `replacesAssignmentId` / `replacedByAssignmentId` so a past date's
 * effective rule can always be reconstructed without rewriting old rows.
 */
export const taskAssignments = sqliteTable(
  'task_assignments',
  {
    id: text('id').primaryKey(),
    templateId: text('template_id')
      .notNull()
      .references(() => taskTemplates.id, { onDelete: 'cascade' }),
    childId: text('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    /** Denormalised — every assignment scope-check goes through this. */
    parentId: text('parent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /** RFC 5545 subset parsed by rrule.js. Null means one-shot on `effectiveFrom`. */
    rrule: text('rrule'),
    /** IANA tz, e.g. 'Asia/Shanghai'. Drives DST + occurrence-date math. */
    timezone: text('timezone').notNull(),

    effectiveFrom: text('effective_from').notNull(),
    effectiveUntil: text('effective_until'),
    replacesAssignmentId: text('replaces_assignment_id'),
    replacedByAssignmentId: text('replaced_by_assignment_id'),

    schedulingType: text('scheduling_type', {
      enum: ['flexible', 'fixed_time', 'time_window', 'deadline'],
    })
      .notNull()
      .default('flexible'),
    preferredStartTime: text('preferred_start_time'),
    preferredEndTime: text('preferred_end_time'),
    obligation: text('obligation', { enum: ['required', 'optional'] })
      .notNull()
      .default('required'),
    durationMinutes: integer('duration_minutes'),
    requiredAttempts: integer('required_attempts'),
    maxAttemptsPerOccurrence: integer('max_attempts_per_occurrence'),

    createdAt: text('created_at').notNull().default(ISO_NOW),
  },
  (t) => ({
    templateIdx: index('task_assignments_template_idx').on(t.templateId),
    childIdx: index('task_assignments_child_idx').on(t.childId),
    parentIdx: index('task_assignments_parent_idx').on(t.parentId),
    historyIdx: index('task_assignments_history_idx').on(t.replacesAssignmentId),
  }),
);

/**
 * One row per occurrence that something has actually happened to. Lazy:
 * occurrences nothing has been done to don't exist as rows — the calendar
 * synthesizes them virtually from `(rrule × exceptions)`. The first write
 * (start / save-progress / complete / skip / override) goes through one
 * transactional `materialize()` chokepoint, using the
 * `(assignmentId, originalDate)` unique index as the idempotency primitive.
 *
 * The effective-field columns snapshot the assignment values at
 * materialize time so a later assignment edit doesn't retroactively change
 * past occurrences.
 */
export const taskInstances = sqliteTable(
  'task_instances',
  {
    id: text('id').primaryKey(),
    assignmentId: text('assignment_id')
      .notNull()
      .references(() => taskAssignments.id, { onDelete: 'cascade' }),
    templateId: text('template_id')
      .notNull()
      .references(() => taskTemplates.id, { onDelete: 'cascade' }),
    childId: text('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),

    /** Date the occurrence resolves to AFTER any reschedule. */
    occurrenceDate: text('occurrence_date').notNull(),
    /** Date as the RRULE originally emitted it — idempotency key. */
    originalDate: text('original_date').notNull(),

    effectiveTitle: text('effective_title').notNull(),
    effectiveDescription: text('effective_description'),
    effectivePreferredTime: text('effective_preferred_time'),
    effectiveDurationMinutes: integer('effective_duration_minutes'),
    effectiveSchedulingType: text('effective_scheduling_type', {
      enum: ['flexible', 'fixed_time', 'time_window', 'deadline'],
    }).notNull(),
    effectiveObligation: text('effective_obligation', {
      enum: ['required', 'optional'],
    }).notNull(),

    status: text('status', {
      enum: ['pending', 'in_progress', 'completed', 'skipped', 'abandoned'],
    })
      .notNull()
      .default('pending'),

    /** IDs of tools (Timer/Note/Calculator/…) the child has attached. */
    attachedToolIds: text('attached_tool_ids', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`(json('[]'))`),

    startedAt: text('started_at'),
    completedAt: text('completed_at'),
    createdAt: text('created_at').notNull().default(ISO_NOW),
    updatedAt: text('updated_at').notNull().default(ISO_NOW),
  },
  (t) => ({
    /** Load-bearing — every materialize() lookup uses this. */
    occurrenceUnique: uniqueIndex('task_instances_occurrence_unique').on(
      t.assignmentId,
      t.originalDate,
    ),
    childDateIdx: index('task_instances_child_date_idx').on(t.childId, t.occurrenceDate),
    statusIdx: index('task_instances_status_idx').on(t.status),
  }),
);

/**
 * Per-occurrence exceptions that aren't tied to a materialized instance.
 * Examples: parent skips next Tuesday (no execution, no row), parent moves
 * Wednesday to Thursday (the Wednesday emits a `reschedule` row). Kept as
 * a side table — not embedded in `task_assignments.rrule` — so the
 * expander can layer (rrule × exceptions) without rewriting the rule.
 */
export const recurrenceExceptions = sqliteTable(
  'recurrence_exceptions',
  {
    id: text('id').primaryKey(),
    assignmentId: text('assignment_id')
      .notNull()
      .references(() => taskAssignments.id, { onDelete: 'cascade' }),
    occurrenceDate: text('occurrence_date').notNull(),
    action: text('action', {
      enum: ['skip', 'reschedule', 'override', 'materialized'],
    }).notNull(),
    /** When action='reschedule', the date it moves to. */
    rescheduledTo: text('rescheduled_to'),
    /** When action='override', a JSON patch on the effective fields. */
    overridePatch: text('override_patch', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: text('created_at').notNull().default(ISO_NOW),
  },
  (t) => ({
    occurrenceUnique: uniqueIndex('recurrence_exceptions_unique').on(
      t.assignmentId,
      t.occurrenceDate,
    ),
  }),
);

/**
 * Active execution session for an instance. One row per (instance, child)
 * attempt; lives only while the child is actively executing. `progressState`
 * carries handler-owned `templateData` + host-owned `toolStates` so plugins
 * and tools can share one persistence chokepoint.
 */
export const taskSessions = sqliteTable(
  'task_sessions',
  {
    id: text('id').primaryKey(),
    instanceId: text('instance_id')
      .notNull()
      .references(() => taskInstances.id, { onDelete: 'cascade' }),
    childId: text('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    pluginVersion: integer('plugin_version').notNull(),
    /** `{ templateData: {...}, toolStates: {...} }` — both validated by the registry. */
    progressState: text('progress_state', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .notNull(),
    lastSavedAt: text('last_saved_at').notNull().default(ISO_NOW),
    completedAt: text('completed_at'),
    createdAt: text('created_at').notNull().default(ISO_NOW),
  },
  (t) => ({
    instanceIdx: index('task_sessions_instance_idx').on(t.instanceId),
    childIdx: index('task_sessions_child_idx').on(t.childId),
  }),
);

// ── row type exports ─────────────────────────────────────────────────────
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type ChildRow = typeof children.$inferSelect;
export type NewChildRow = typeof children.$inferInsert;
export type DeviceRow = typeof devices.$inferSelect;
export type NewDeviceRow = typeof devices.$inferInsert;
export type DeviceChildRow = typeof deviceChildren.$inferSelect;
export type NewDeviceChildRow = typeof deviceChildren.$inferInsert;
export type RefreshTokenRow = typeof refreshTokens.$inferSelect;
export type NewRefreshTokenRow = typeof refreshTokens.$inferInsert;
export type AuthEventRow = typeof authEvents.$inferSelect;
export type NewAuthEventRow = typeof authEvents.$inferInsert;
export type TaskTemplateRow = typeof taskTemplates.$inferSelect;
export type NewTaskTemplateRow = typeof taskTemplates.$inferInsert;
export type TaskAssignmentRow = typeof taskAssignments.$inferSelect;
export type NewTaskAssignmentRow = typeof taskAssignments.$inferInsert;
export type TaskInstanceRow = typeof taskInstances.$inferSelect;
export type NewTaskInstanceRow = typeof taskInstances.$inferInsert;
export type RecurrenceExceptionRow = typeof recurrenceExceptions.$inferSelect;
export type NewRecurrenceExceptionRow = typeof recurrenceExceptions.$inferInsert;
export type TaskSessionRow = typeof taskSessions.$inferSelect;
export type NewTaskSessionRow = typeof taskSessions.$inferInsert;
