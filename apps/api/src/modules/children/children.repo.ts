import { and, eq, desc } from 'drizzle-orm';
import {
  children,
  type ChildRow,
  type Database_,
  type NewChildRow,
} from '@kidsprogress/db';

export function createChildrenRepo(db: Database_) {
  return {
    async listByParent(parentId: string): Promise<ChildRow[]> {
      return db.select().from(children).where(eq(children.parentId, parentId)).orderBy(desc(children.createdAt));
    },
    async findByIdForParent(id: string, parentId: string): Promise<ChildRow | undefined> {
      const rows = await db
        .select()
        .from(children)
        .where(and(eq(children.id, id), eq(children.parentId, parentId)))
        .limit(1);
      return rows[0];
    },
    async insert(row: NewChildRow): Promise<ChildRow> {
      const [inserted] = await db.insert(children).values(row).returning();
      if (!inserted) throw new Error('failed to insert child');
      return inserted;
    },
    async update(
      id: string,
      parentId: string,
      patch: Partial<NewChildRow>,
    ): Promise<ChildRow | undefined> {
      const [updated] = await db
        .update(children)
        .set({ ...patch, updatedAt: new Date().toISOString() })
        .where(and(eq(children.id, id), eq(children.parentId, parentId)))
        .returning();
      return updated;
    },
    async delete(id: string, parentId: string): Promise<boolean> {
      const result = await db
        .delete(children)
        .where(and(eq(children.id, id), eq(children.parentId, parentId)))
        .returning({ id: children.id });
      return result.length > 0;
    },
  };
}

export type ChildrenRepo = ReturnType<typeof createChildrenRepo>;
