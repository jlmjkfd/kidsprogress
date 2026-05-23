import { and, eq, inArray } from 'drizzle-orm';
import {
  completions,
  recurrenceExceptions,
  tasks,
  type Database_,
  type TaskRow,
} from '@kidsprogress/db';
import type { RecurrenceRule, TaskInstance } from '@kidsprogress/shared';
import { expandRecurrence } from '../../lib/recurrence.js';

/**
 * Build the virtual task instances for a child in [fromDate, toDate]:
 *  - one-off tasks scheduled in that range (always included)
 *  - every occurrence of each recurring task in that range, minus skipped
 *    exceptions, with a `isCompleted` flag if a completion row exists for that
 *    occurrence_date.
 */
export async function buildInstancesForChild(
  db: Database_,
  childId: string,
  fromDate: string,
  toDate: string,
): Promise<TaskInstance[]> {
  // Fetch all tasks assigned to this child.
  const childTasks = await db.select().from(tasks).where(eq(tasks.childId, childId));
  if (childTasks.length === 0) return [];

  const taskIds = childTasks.map((t) => t.id);
  const [exceptionRows, completionRows] = await Promise.all([
    db.select().from(recurrenceExceptions).where(inArray(recurrenceExceptions.taskId, taskIds)),
    db.select().from(completions).where(inArray(completions.taskId, taskIds)),
  ]);

  const skipKeys = new Set(
    exceptionRows
      .filter((e) => e.action === 'skip')
      .map((e) => `${e.taskId}|${e.occurrenceDate}`),
  );
  const completionKeys = new Set(
    completionRows
      .filter((c) => c.occurrenceDate)
      .map((c) => `${c.taskId}|${c.occurrenceDate}`),
  );

  const out: TaskInstance[] = [];

  for (const t of childTasks) {
    if (t.isRecurring) {
      const rule = t.recurrenceRule as RecurrenceRule | null;
      if (!rule) continue;
      const anchor = t.scheduledDate ?? t.createdAt.slice(0, 10);
      const dates = expandRecurrence(rule, fromDate, toDate, anchor);
      for (const d of dates) {
        const key = `${t.id}|${d}`;
        if (skipKeys.has(key)) {
          out.push(buildVirtual(t, d, false, true));
        } else {
          out.push(buildVirtual(t, d, completionKeys.has(key), false));
        }
      }
    } else if (t.scheduledDate && t.scheduledDate >= fromDate && t.scheduledDate <= toDate) {
      out.push(buildVirtual(t, t.scheduledDate, t.status === 'completed', t.status === 'skipped'));
    }
  }

  // Stable order: by date, then title
  out.sort((a, b) =>
    a.occurrenceDate === b.occurrenceDate ? a.title.localeCompare(b.title) : a.occurrenceDate.localeCompare(b.occurrenceDate),
  );
  return out;
}

function buildVirtual(
  t: TaskRow,
  date: string,
  isCompleted: boolean,
  isSkipped: boolean,
): TaskInstance {
  return {
    templateTaskId: t.id,
    occurrenceDate: date,
    childId: t.childId,
    title: t.title,
    durationMinutes: t.durationMinutes,
    kind: t.kind,
    isCompleted,
    isSkipped,
  };
}
