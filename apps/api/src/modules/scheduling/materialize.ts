import { v7 as uuidv7 } from 'uuid';
import { and, eq } from 'drizzle-orm';
import {
  taskAssignments,
  taskInstances,
  taskTemplates,
  type Database_,
  type TaskInstanceRow,
} from '@kidsprogress/db';

/**
 * The chokepoint that turns a virtual occurrence into a real
 * `task_instances` row. Every code path that writes about an occurrence
 * — start, save-progress, complete, skip, parent override — calls this.
 *
 * Idempotency rests entirely on the `(assignment_id, original_date)`
 * uniqueIndex. The lookup-then-insert is wrapped in a `db.transaction()`
 * so two concurrent "first start" taps both end up with the same row
 * (one wins the insert; the other reads the now-present row).
 *
 * Effective-field snapshot: takes its values from the assignment at
 * materialize time. A later edit to the assignment will NOT retroactively
 * change already-materialized rows.
 */
export async function materialize(
  db: Database_,
  args: { assignmentId: string; originalDate: string; occurrenceDate?: string },
): Promise<TaskInstanceRow> {
  return db.transaction((tx) => {
    // Idempotency check: row already exists?
    const existing = tx
      .select()
      .from(taskInstances)
      .where(
        and(
          eq(taskInstances.assignmentId, args.assignmentId),
          eq(taskInstances.originalDate, args.originalDate),
        ),
      )
      .limit(1)
      .all();
    if (existing[0]) return existing[0];

    // Load the assignment + template for the effective-field snapshot.
    const [assignment] = tx
      .select()
      .from(taskAssignments)
      .where(eq(taskAssignments.id, args.assignmentId))
      .limit(1)
      .all();
    if (!assignment) {
      throw new Error(`materialize: assignment ${args.assignmentId} not found`);
    }
    const [template] = tx
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, assignment.templateId))
      .limit(1)
      .all();
    if (!template) {
      throw new Error(`materialize: template ${assignment.templateId} not found`);
    }

    const id = uuidv7();
    const occurrenceDate = args.occurrenceDate ?? args.originalDate;
    tx.insert(taskInstances)
      .values({
        id,
        assignmentId: assignment.id,
        templateId: template.id,
        childId: assignment.childId,
        occurrenceDate,
        originalDate: args.originalDate,
        effectiveTitle: template.name,
        ...(template.description !== null
          ? { effectiveDescription: template.description }
          : {}),
        ...(assignment.preferredStartTime !== null
          ? { effectivePreferredTime: assignment.preferredStartTime }
          : {}),
        ...(assignment.durationMinutes !== null
          ? { effectiveDurationMinutes: assignment.durationMinutes }
          : template.defaultDurationMinutes !== null
            ? { effectiveDurationMinutes: template.defaultDurationMinutes }
            : {}),
        effectiveSchedulingType: assignment.schedulingType,
        effectiveObligation: assignment.obligation,
        status: 'pending',
        attachedToolIds: [],
      })
      .run();

    const [inserted] = tx
      .select()
      .from(taskInstances)
      .where(eq(taskInstances.id, id))
      .limit(1)
      .all();
    if (!inserted) throw new Error('materialize: insert succeeded but row not found');
    return inserted;
  });
}
