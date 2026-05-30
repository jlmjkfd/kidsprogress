import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import {
  refreshTokens,
  users,
  type Database_,
  type NewRefreshTokenRow,
  type NewUserRow,
  type RefreshTokenRow,
  type UserRow,
} from '@kidsprogress/db';

export function createAuthRepo(db: Database_) {
  return {
    // ── users ─────────────────────────────────────────────────────────
    async findUserByEmail(email: string): Promise<UserRow | undefined> {
      const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return rows[0];
    },

    async findUserById(id: string): Promise<UserRow | undefined> {
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return rows[0];
    },

    async insertUser(row: NewUserRow): Promise<UserRow> {
      const [inserted] = await db.insert(users).values(row).returning();
      if (!inserted) throw new Error('failed to insert user');
      return inserted;
    },

    async setParentPortalPinHash(userId: string, pinHash: string | null): Promise<void> {
      await db
        .update(users)
        .set({ parentPortalPinHash: pinHash, updatedAt: new Date().toISOString() })
        .where(eq(users.id, userId));
    },

    // ── refresh tokens ────────────────────────────────────────────────
    async insertRefreshToken(row: NewRefreshTokenRow): Promise<void> {
      await db.insert(refreshTokens).values(row);
    },

    /**
     * Look up an unrevoked refresh-token row by its SHA-256 hash. Returns
     * undefined for unknown OR revoked tokens (caller distinguishes via a
     * separate lookup if needed).
     */
    async findActiveRefreshTokenByHash(
      tokenHash: string,
    ): Promise<RefreshTokenRow | undefined> {
      const rows = await db
        .select()
        .from(refreshTokens)
        .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
        .limit(1);
      return rows[0];
    },

    /** Look up any refresh-token row (including revoked) — used for replay detection. */
    async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRow | undefined> {
      const rows = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .limit(1);
      return rows[0];
    },

    async revokeRefreshToken(id: string, reason: string): Promise<void> {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date().toISOString(), revokedReason: reason })
        .where(eq(refreshTokens.id, id));
    },

    /**
     * Revoke EVERY active refresh token for a subject (e.g. on detected
     * replay or on parent password change). One write, broad blast radius.
     */
    async revokeAllForSubject(
      subjectKind: 'parent' | 'child',
      subjectId: string,
      reason: string,
    ): Promise<void> {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date().toISOString(), revokedReason: reason })
        .where(
          and(
            eq(refreshTokens.subjectKind, subjectKind),
            eq(refreshTokens.subjectId, subjectId),
            isNull(refreshTokens.revokedAt),
          ),
        );
    },

    /** Diagnostics: count how many refresh tokens were revoked by a given reason. */
    async countRevokedByReason(reason: string): Promise<number> {
      const rows = await db
        .select({ id: refreshTokens.id })
        .from(refreshTokens)
        .where(
          and(eq(refreshTokens.revokedReason, reason), isNotNull(refreshTokens.revokedAt)),
        );
      return rows.length;
    },
  };
}

export type AuthRepo = ReturnType<typeof createAuthRepo>;
