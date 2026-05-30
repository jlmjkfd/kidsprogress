import { and, eq } from 'drizzle-orm';
import {
  taskAssignments,
  type Database_,
  type NewTaskAssignmentRow,
  type TaskAssignmentRow,
} from '@kidsprogress/db';

export function createAssignmentsRepo(db: Database_) {
  return {
    async listByParent(parentId: string): Promise<TaskAssignmentRow[]> {
      return db
        .select()
        .from(taskAssignments)
        .where(eq(taskAssignments.parentId, parentId));
    },

    async listByChild(childId: string): Promise<TaskAssignmentRow[]> {
      return db
        .select()
        .from(taskAssignments)
        .where(eq(taskAssignments.childId, childId));
    },

    async findByIdForParent(
      id: string,
      parentId: string,
    ): Promise<TaskAssignmentRow | undefined> {
      const rows = await db
        .select()
        .from(taskAssignments)
        .where(and(eq(taskAssignments.id, id), eq(taskAssignments.parentId, parentId)))
        .limit(1);
      return rows[0];
    },

    async insert(row: NewTaskAssignmentRow): Promise<TaskAssignmentRow> {
      const [inserted] = await db.insert(taskAssignments).values(row).returning();
      if (!inserted) throw new Error('failed to insert assignment');
      return inserted;
    },

    async update(
      id: string,
      patch: Partial<NewTaskAssignmentRow>,
    ): Promise<TaskAssignmentRow | undefined> {
      const [updated] = await db
        .update(taskAssignments)
        .set(patch)
        .where(eq(taskAssignments.id, id))
        .returning();
      return updated;
    },

    async delete(id: string): Promise<void> {
      await db.delete(taskAssignments).where(eq(taskAssignments.id, id));
    },
  };
}

export type AssignmentsRepo = ReturnType<typeof createAssignmentsRepo>;
