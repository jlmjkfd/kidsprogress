import { and, eq, isNull } from 'drizzle-orm';
import {
  users,
  refreshTokens,
  type Database_,
  type NewRefreshTokenRow,
  type NewUserRow,
  type RefreshTokenRow,
  type UserRow,
} from '@kidsprogress/db';

export function createAuthRepo(db: Database_) {
  return {
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
    async setUserPinHash(userId: string, pinHash: string): Promise<void> {
      await db.update(users).set({ pinHash }).where(eq(users.id, userId));
    },
    async insertRefreshToken(row: NewRefreshTokenRow): Promise<void> {
      await db.insert(refreshTokens).values(row);
    },
    async findActiveRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRow | undefined> {
      const rows = await db
        .select()
        .from(refreshTokens)
        .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
        .limit(1);
      return rows[0];
    },
    /** Find any token by hash (used to detect replay of an already-rotated token). */
    async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRow | undefined> {
      const rows = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .limit(1);
      return rows[0];
    },
    async revokeRefreshToken(id: string, replacedById?: string): Promise<void> {
      await db
        .update(refreshTokens)
        .set({
          revokedAt: new Date().toISOString(),
          replacedById: replacedById ?? null,
        })
        .where(eq(refreshTokens.id, id));
    },
    /** Revoke every token in a family (used when replay is detected). */
    async revokeFamily(familyId: string): Promise<void> {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date().toISOString() })
        .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
    },
  };
}

export type AuthRepo = ReturnType<typeof createAuthRepo>;
