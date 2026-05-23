import { sql } from 'drizzle-orm';
import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { users } from './users.js';

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
    // Optional child-specific PIN (separate from parent PIN) for the child-portal flow.
    pinHash: text('pin_hash'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    parentIdIdx: index('children_parent_id_idx').on(table.parentId),
  }),
);

export type ChildRow = typeof children.$inferSelect;
export type NewChildRow = typeof children.$inferInsert;
