import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import {
  recurrenceExceptions,
  type Database_,
  type NewRecurrenceExceptionRow,
  type RecurrenceExceptionRow,
} from '@kidsprogress/db';

export function createExceptionsRepo(db: Database_) {
  return {
    /** All exceptions for a set of assignments whose target date is in `[from,to]`. */
    async listForAssignments(
      assignmentIds: string[],
      from: string,
      to: string,
    ): Promise<RecurrenceExceptionRow[]> {
      if (assignmentIds.length === 0) return [];
      return db
        .select()
        .from(recurrenceExceptions)
        .where(
          and(
            inArray(recurrenceExceptions.assignmentId, assignmentIds),
            gte(recurrenceExceptions.occurrenceDate, from),
            lte(recurrenceExceptions.occurrenceDate, to),
          ),
        );
    },

    async findByKey(
      assignmentId: string,
      occurrenceDate: string,
    ): Promise<RecurrenceExceptionRow | undefined> {
      const rows = await db
        .select()
        .from(recurrenceExceptions)
        .where(
          and(
            eq(recurrenceExceptions.assignmentId, assignmentId),
            eq(recurrenceExceptions.occurrenceDate, occurrenceDate),
          ),
        )
        .limit(1);
      return rows[0];
    },

    /**
     * Upsert by (assignmentId, occurrenceDate). Re-applying an exception on
     * the same key overwrites the prior one — parents can change their mind
     * between skip and reschedule without us tracking history.
     */
    async upsert(row: NewRecurrenceExceptionRow): Promise<RecurrenceExceptionRow> {
      const existing = await this.findByKey(row.assignmentId, row.occurrenceDate);
      if (existing) {
        const [updated] = await db
          .update(recurrenceExceptions)
          .set({
            action: row.action,
            rescheduledTo: row.rescheduledTo ?? null,
            overridePatch: row.overridePatch ?? null,
          })
          .where(eq(recurrenceExceptions.id, existing.id))
          .returning();
        return updated!;
      }
      const [inserted] = await db
        .insert(recurrenceExceptions)
        .values(row)
        .returning();
      return inserted!;
    },

    async delete(assignmentId: string, occurrenceDate: string): Promise<void> {
      await db
        .delete(recurrenceExceptions)
        .where(
          and(
            eq(recurrenceExceptions.assignmentId, assignmentId),
            eq(recurrenceExceptions.occurrenceDate, occurrenceDate),
          ),
        );
    },
  };
}

export type ExceptionsRepo = ReturnType<typeof createExceptionsRepo>;
