import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { users } from './users.js';
import { children } from './children.js';

/**
 * A device is a tablet/phone that a child uses to log in without typing
 * credentials. The device token is high-entropy and is stored hashed.
 * Parents can revoke a device from the parent portal.
 */
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
      .default(sql`(CURRENT_TIMESTAMP)`),
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
