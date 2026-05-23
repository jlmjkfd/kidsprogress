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
