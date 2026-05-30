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
