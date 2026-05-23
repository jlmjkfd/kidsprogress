import { v7 as uuidv7 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import {
  completions,
  recurrenceExceptions,
  tasks,
  type Database_,
  type TaskRow,
} from '@kidsprogress/db';

/**
 * Allowed transitions for one-off task status.
 *
 *   pending     ─start→   in_progress
 *   in_progress ─complete→ completed
 *   pending     ─complete→ completed   (skip-progress shortcut)
 *   pending|in_progress ─skip→ skipped
 *   any ─abandon→ abandoned                                     (out of scope here)
 *
 * Recurring tasks ignore the column-level status; lifecycle for them runs
 * through completion rows + recurrence_exceptions per occurrence_date.
 */
export class TaskLifecycleError extends Error {
  constructor(public readonly code: 'IllegalTransition' | 'RecurringNeedsOccurrence' | 'NotFound') {
    super(code);
  }
}

export function createTasksLifecycle(db: Database_) {
  async function loadOwn(taskId: string, parentOrChildId: string): Promise<TaskRow | undefined> {
    const rows = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.parentId, parentOrChildId)))
      .limit(1);
    if (rows[0]) return rows[0];
    // child path
    const rows2 = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.childId, parentOrChildId)))
      .limit(1);
    return rows2[0];
  }

  return {
    async start(taskId: string, requesterId: string): Promise<TaskRow> {
      const task = await loadOwn(taskId, requesterId);
      if (!task) throw new TaskLifecycleError('NotFound');
      if (task.isRecurring) throw new TaskLifecycleError('RecurringNeedsOccurrence');
      if (task.status !== 'pending') throw new TaskLifecycleError('IllegalTransition');

      const now = new Date().toISOString();
      const [updated] = await db
        .update(tasks)
        .set({ status: 'in_progress', startedAt: now, updatedAt: now })
        .where(eq(tasks.id, taskId))
        .returning();
      if (!updated) throw new TaskLifecycleError('NotFound');
      return updated;
    },

    async complete(
      taskId: string,
      requesterId: string,
      input: { durationMinutes?: number; score?: number; notes?: string; occurrenceDate?: string },
    ): Promise<{ task: TaskRow; completionId: string }> {
      const task = await loadOwn(taskId, requesterId);
      if (!task) throw new TaskLifecycleError('NotFound');

      const now = new Date().toISOString();

      if (task.isRecurring) {
        if (!input.occurrenceDate) throw new TaskLifecycleError('RecurringNeedsOccurrence');
        // Recurring: only insert a completion row; don't touch task.status.
        const completionId = uuidv7();
        await db.insert(completions).values({
          id: completionId,
          taskId,
          childId: task.childId,
          occurrenceDate: input.occurrenceDate,
          completedAt: now,
          durationMinutes: input.durationMinutes ?? null,
          score: input.score ?? null,
          attempts: 1,
          notes: input.notes ?? null,
        });
        return { task, completionId };
      }

      if (task.status === 'completed' || task.status === 'abandoned' || task.status === 'skipped') {
        throw new TaskLifecycleError('IllegalTransition');
      }

      const completionId = uuidv7();
      await db.insert(completions).values({
        id: completionId,
        taskId,
        childId: task.childId,
        occurrenceDate: task.scheduledDate ?? null,
        completedAt: now,
        durationMinutes: input.durationMinutes ?? task.durationMinutes ?? null,
        score: input.score ?? null,
        attempts: 1,
        notes: input.notes ?? null,
      });

      const [updated] = await db
        .update(tasks)
        .set({ status: 'completed', completedAt: now, updatedAt: now })
        .where(eq(tasks.id, taskId))
        .returning();
      if (!updated) throw new TaskLifecycleError('NotFound');
      return { task: updated, completionId };
    },

    async skip(
      taskId: string,
      requesterId: string,
      input: { reason?: string; occurrenceDate?: string },
    ): Promise<TaskRow> {
      const task = await loadOwn(taskId, requesterId);
      if (!task) throw new TaskLifecycleError('NotFound');

      const now = new Date().toISOString();
      if (task.isRecurring) {
        if (!input.occurrenceDate) throw new TaskLifecycleError('RecurringNeedsOccurrence');
        await db.insert(recurrenceExceptions).values({
          id: uuidv7(),
          taskId,
          occurrenceDate: input.occurrenceDate,
          action: 'skip',
          overrides: input.reason ? { reason: input.reason } : null,
        });
        return task;
      }

      if (task.status === 'completed' || task.status === 'skipped' || task.status === 'abandoned') {
        throw new TaskLifecycleError('IllegalTransition');
      }
      const [updated] = await db
        .update(tasks)
        .set({ status: 'skipped', updatedAt: now })
        .where(eq(tasks.id, taskId))
        .returning();
      if (!updated) throw new TaskLifecycleError('NotFound');
      return updated;
    },
  };
}

export type TasksLifecycle = ReturnType<typeof createTasksLifecycle>;
