import { and, eq } from 'drizzle-orm';
import {
  children,
  type ChildRow,
  type Database_,
  type NewChildRow,
} from '@kidsprogress/db';

export function createChildrenRepo(db: Database_) {
  return {
    async listByFamily(familyId: string): Promise<ChildRow[]> {
      return db.select().from(children).where(eq(children.familyId, familyId));
    },

    async findById(id: string): Promise<ChildRow | undefined> {
      const rows = await db.select().from(children).where(eq(children.id, id)).limit(1);
      return rows[0];
    },

    /** Family-scoped lookup — refuses to return a child outside the caller's family. */
    async findByIdInFamily(id: string, familyId: string): Promise<ChildRow | undefined> {
      const rows = await db
        .select()
        .from(children)
        .where(and(eq(children.id, id), eq(children.familyId, familyId)))
        .limit(1);
      return rows[0];
    },

    async insert(row: NewChildRow): Promise<ChildRow> {
      const [inserted] = await db.insert(children).values(row).returning();
      if (!inserted) throw new Error('failed to insert child');
      return inserted;
    },

    /**
     * Generic partial update — fields not present in `patch` are untouched.
     * Always bumps `updatedAt`.
     */
    async update(id: string, patch: Partial<NewChildRow>): Promise<ChildRow | undefined> {
      const [updated] = await db
        .update(children)
        .set({ ...patch, updatedAt: new Date().toISOString() })
        .where(eq(children.id, id))
        .returning();
      return updated;
    },
  };
}

export type ChildrenRepo = ReturnType<typeof createChildrenRepo>;
