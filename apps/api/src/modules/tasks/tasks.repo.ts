import { and, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import {
  children,
  tasks,
  type Database_,
  type NewTaskRow,
  type TaskRow,
} from '@kidsprogress/db';

export interface ListFilters {
  childId?: string;
  collectionId?: string;
  status?: TaskRow['status'];
  fromDate?: string;
  toDate?: string;
}

export function createTasksRepo(db: Database_) {
  return {
    async listForParent(parentId: string, filters: ListFilters = {}): Promise<TaskRow[]> {
      const wheres: SQL[] = [eq(tasks.parentId, parentId)];
      if (filters.childId) wheres.push(eq(tasks.childId, filters.childId));
      if (filters.collectionId) wheres.push(eq(tasks.collectionId, filters.collectionId));
      if (filters.status) wheres.push(eq(tasks.status, filters.status));
      if (filters.fromDate) wheres.push(gte(tasks.scheduledDate, filters.fromDate));
      if (filters.toDate) wheres.push(lte(tasks.scheduledDate, filters.toDate));
      return db
        .select()
        .from(tasks)
        .where(and(...wheres))
        .orderBy(desc(tasks.createdAt));
    },

    async findByIdForParent(id: string, parentId: string): Promise<TaskRow | undefined> {
      const rows = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.parentId, parentId)))
        .limit(1);
      return rows[0];
    },

    /** Child portal: child can read tasks scoped to their own child id. */
    async findByIdForChild(id: string, childId: string): Promise<TaskRow | undefined> {
      const rows = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.childId, childId)))
        .limit(1);
      return rows[0];
    },

    async listForChild(childId: string, filters: ListFilters = {}): Promise<TaskRow[]> {
      const wheres: SQL[] = [eq(tasks.childId, childId)];
      if (filters.status) wheres.push(eq(tasks.status, filters.status));
      if (filters.fromDate) wheres.push(gte(tasks.scheduledDate, filters.fromDate));
      if (filters.toDate) wheres.push(lte(tasks.scheduledDate, filters.toDate));
      return db
        .select()
        .from(tasks)
        .where(and(...wheres))
        .orderBy(desc(tasks.createdAt));
    },

    async insert(row: NewTaskRow): Promise<TaskRow> {
      const [inserted] = await db.insert(tasks).values(row).returning();
      if (!inserted) throw new Error('failed to insert task');
      return inserted;
    },

    async update(
      id: string,
      parentId: string,
      patch: Partial<NewTaskRow>,
    ): Promise<TaskRow | undefined> {
      const [updated] = await db
        .update(tasks)
        .set({ ...patch, updatedAt: new Date().toISOString() })
        .where(and(eq(tasks.id, id), eq(tasks.parentId, parentId)))
        .returning();
      return updated;
    },

    async delete(id: string, parentId: string): Promise<boolean> {
      const r = await db
        .delete(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.parentId, parentId)))
        .returning({ id: tasks.id });
      return r.length > 0;
    },

    /** Sanity: the parent owns the child this task is being assigned to. */
    async parentOwnsChild(parentId: string, childId: string): Promise<boolean> {
      const rows = await db
        .select({ id: children.id })
        .from(children)
        .where(and(eq(children.id, childId), eq(children.parentId, parentId)))
        .limit(1);
      return rows.length > 0;
    },
  };
}

export type TasksRepo = ReturnType<typeof createTasksRepo>;
