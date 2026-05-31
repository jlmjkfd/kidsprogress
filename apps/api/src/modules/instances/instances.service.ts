import { and, eq } from 'drizzle-orm';
import {
  taskAssignments,
  taskInstances,
  taskSessions,
  type Database_,
  type TaskInstanceRow,
} from '@kidsprogress/db';
import { materialize } from '../scheduling/materialize.js';
import {
  InstanceNotFoundError,
  InvalidTransitionError,
} from './instances.errors.js';
import {
  applyTransition,
  nextEffectOrNull,
  type InstanceAction,
} from './state-machine.js';

interface TransitionParams {
  assignmentId: string;
  originalDate: string;
  occurrenceDate?: string;
  action: InstanceAction;
  /** Family-id of the caller (used for cross-family rejection). */
  callerFamilyId: string;
  /** Role of the caller — child can only act on their own assignments. */
  callerRole: 'parent' | 'child' | 'child-readonly';
  callerSubjectId: string;
}

export function createInstancesService(opts: { db: Database_ }) {
  return {
    /**
     * The single mutation chokepoint for the instance lifecycle. Takes an
     * InstanceKey (materialized or virtual) + an action; ensures the row
     * exists via `materialize()`, then applies the transition. All in one
     * SQLite transaction so a concurrent "two taps on start" race ends
     * with one materialised row + one transition.
     */
    async transition(params: TransitionParams): Promise<TaskInstanceRow> {
      // First load the assignment + check family scope.
      const [assignment] = await opts.db
        .select()
        .from(taskAssignments)
        .where(eq(taskAssignments.id, params.assignmentId))
        .limit(1);
      if (!assignment) throw new InstanceNotFoundError('Assignment not found');
      if (assignment.parentId !== params.callerFamilyId) {
        throw new InstanceNotFoundError('Assignment not found');
      }
      if (
        (params.callerRole === 'child' || params.callerRole === 'child-readonly') &&
        params.callerSubjectId !== assignment.childId
      ) {
        throw new InstanceNotFoundError('Assignment not found');
      }
      if (params.callerRole === 'child-readonly') {
        throw new InvalidTransitionError('Read-only token cannot mutate');
      }

      // Materialize-if-virtual + apply transition in one transactional flow.
      const row = await materialize(opts.db, {
        assignmentId: params.assignmentId,
        originalDate: params.originalDate,
        ...(params.occurrenceDate ? { occurrenceDate: params.occurrenceDate } : {}),
      });

      const effect = nextEffectOrNull(row.status, params.action);
      if (!effect) {
        throw new InvalidTransitionError(
          `Cannot ${params.action} from ${row.status}`,
        );
      }
      const patch = applyTransition(row, effect);

      const [updated] = await opts.db
        .update(taskInstances)
        .set({ ...patch, updatedAt: new Date().toISOString() })
        .where(eq(taskInstances.id, row.id))
        .returning();
      if (!updated) throw new InstanceNotFoundError('Instance vanished mid-update');

      // Burn any active session when the instance reaches a terminal state.
      // The session blob stays on disk for history (`task_sessions` is not
      // deleted), just flagged completed.
      if (
        updated.status === 'completed' ||
        updated.status === 'skipped' ||
        updated.status === 'abandoned'
      ) {
        await opts.db
          .update(taskSessions)
          .set({ completedAt: new Date().toISOString() })
          .where(
            and(
              eq(taskSessions.instanceId, updated.id),
              eq(taskSessions.childId, updated.childId),
            ),
          );
      }
      return updated;
    },

    /** Read one instance with family-scope check. */
    async getInstance(
      instanceId: string,
      callerFamilyId: string,
    ): Promise<TaskInstanceRow> {
      const [row] = await opts.db
        .select()
        .from(taskInstances)
        .innerJoin(taskAssignments, eq(taskAssignments.id, taskInstances.assignmentId))
        .where(
          and(
            eq(taskInstances.id, instanceId),
            eq(taskAssignments.parentId, callerFamilyId),
          ),
        )
        .limit(1);
      if (!row) throw new InstanceNotFoundError('Instance not found');
      return row.task_instances;
    },
  };
}

export type InstancesService = ReturnType<typeof createInstancesService>;
