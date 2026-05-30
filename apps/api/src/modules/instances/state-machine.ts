import type { TaskInstanceRow } from '@kidsprogress/db';

/**
 * Task-instance lifecycle. Single source of truth used by the transition
 * service AND any future UI code that needs to know "what can I do here?".
 *
 * Transitions in alphabetical order:
 *   - `abandon`: in_progress → abandoned
 *   - `complete`: in_progress → completed
 *   - `skip`: pending | in_progress → skipped
 *   - `start`: pending → in_progress
 */
export type InstanceAction = 'start' | 'complete' | 'skip' | 'abandon';
export type InstanceStatus = TaskInstanceRow['status'];

interface TransitionEffect {
  /** New status after the action. */
  readonly nextStatus: InstanceStatus;
  /** Mutations on the timestamp columns. `undefined` = leave alone. */
  readonly timestamps: {
    readonly startedAt?: 'set' | 'leave';
    readonly completedAt?: 'set' | 'leave';
  };
}

const TABLE: Readonly<
  Record<InstanceStatus, Partial<Record<InstanceAction, TransitionEffect>>>
> = {
  pending: {
    start: { nextStatus: 'in_progress', timestamps: { startedAt: 'set' } },
    skip: { nextStatus: 'skipped', timestamps: {} },
  },
  in_progress: {
    complete: {
      nextStatus: 'completed',
      timestamps: { completedAt: 'set' },
    },
    skip: { nextStatus: 'skipped', timestamps: {} },
    abandon: { nextStatus: 'abandoned', timestamps: {} },
  },
  completed: {},
  skipped: {},
  abandoned: {},
};

export function nextEffectOrNull(
  current: InstanceStatus,
  action: InstanceAction,
): TransitionEffect | null {
  return TABLE[current][action] ?? null;
}

export function applyTransition(
  current: TaskInstanceRow,
  effect: TransitionEffect,
): Partial<TaskInstanceRow> {
  const patch: Partial<TaskInstanceRow> = { status: effect.nextStatus };
  const nowIso = new Date().toISOString();
  if (effect.timestamps.startedAt === 'set') patch.startedAt = nowIso;
  if (effect.timestamps.completedAt === 'set') patch.completedAt = nowIso;
  return patch;
}
