import { sql } from 'drizzle-orm';
import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { users } from './users.js';

/**
 * Refresh tokens are stored as SHA-256 hashes for O(1) lookup, NOT as bcrypt
 * hashes (v1's pattern that caused an O(n·bcrypt) brute force on every refresh).
 * The token itself is a high-entropy random string; SHA-256 is sufficient
 * because the token has full key strength on its own.
 */
export const refreshTokens = sqliteTable(
  'refresh_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    // Family ID lets us detect token replay: if a rotated token is reused,
    // revoke the entire family.
    familyId: text('family_id').notNull(),
    issuedAt: text('issued_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
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
