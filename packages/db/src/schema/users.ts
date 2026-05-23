import { sql } from 'drizzle-orm';
import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

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
    // Parent PIN (argon2 hash). Used to re-confirm sensitive actions inside an active parent session.
    pinHash: text('pin_hash'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
