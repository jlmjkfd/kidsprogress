import { and, eq } from 'drizzle-orm';
import {
  taskTemplates,
  type Database_,
  type NewTaskTemplateRow,
  type TaskTemplateRow,
} from '@kidsprogress/db';

export function createTemplatesRepo(db: Database_) {
  return {
    async listByParent(parentId: string): Promise<TaskTemplateRow[]> {
      return db.select().from(taskTemplates).where(eq(taskTemplates.parentId, parentId));
    },

    async findByIdForParent(
      id: string,
      parentId: string,
    ): Promise<TaskTemplateRow | undefined> {
      const rows = await db
        .select()
        .from(taskTemplates)
        .where(and(eq(taskTemplates.id, id), eq(taskTemplates.parentId, parentId)))
        .limit(1);
      return rows[0];
    },

    async insert(row: NewTaskTemplateRow): Promise<TaskTemplateRow> {
      const [inserted] = await db.insert(taskTemplates).values(row).returning();
      if (!inserted) throw new Error('failed to insert task template');
      return inserted;
    },

    async update(
      id: string,
      patch: Partial<NewTaskTemplateRow>,
    ): Promise<TaskTemplateRow | undefined> {
      const [updated] = await db
        .update(taskTemplates)
        .set({ ...patch, updatedAt: new Date().toISOString() })
        .where(eq(taskTemplates.id, id))
        .returning();
      return updated;
    },

    /**
     * Distinct `(handlerId, schemaVersion)` pairs persisted in this DB.
     * Consumed by the boot-time `assertAllPersistedVersionsRegistered`
     * invariant so the API refuses to start if the registry has lost
     * coverage for a version still on disk.
     */
    async listPersistedHandlerVersions(): Promise<
      ReadonlyArray<{ handlerId: string; schemaVersion: number }>
    > {
      const rows = await db
        .selectDistinct({
          handlerId: taskTemplates.handlerId,
          schemaVersion: taskTemplates.schemaVersion,
        })
        .from(taskTemplates);
      return rows;
    },
  };
}

export type TemplatesRepo = ReturnType<typeof createTemplatesRepo>;
