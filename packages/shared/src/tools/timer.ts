import { z } from 'zod';
import type { ToolManifest } from './types.js';

/**
 * Timer — counts up or down. State is the elapsed/remaining seconds plus
 * a flag for whether the timer is currently ticking. The UI layer (web)
 * derives the live display from `elapsedSeconds + (now - startedAt)`
 * while `running === true`, so the persisted state stays accurate even
 * across browser sessions.
 *
 * Audit fix (v1): never store a live `elapsedSeconds` ref-in-deps. The
 * single source of truth is `(elapsedSeconds at last pause) + (delta
 * since `startedAt`)`. UI just renders.
 */
export const timerStateV1Schema = z.object({
  mode: z.enum(['count_up', 'count_down']),
  /** Seconds — applies only when mode='count_down'. */
  targetSeconds: z.number().int().nonnegative(),
  /** Accumulated elapsed time as of the last pause (or 0 if never started). */
  elapsedSeconds: z.number().int().nonnegative(),
  /** True while the timer is ticking. */
  running: z.boolean(),
  /** ISO 8601 — set when `running` flips true; null when paused. */
  startedAt: z.string().datetime().nullable(),
});
export type TimerStateV1 = z.infer<typeof timerStateV1Schema>;

export const timerManifest: ToolManifest<TimerStateV1> = {
  toolId: 'timer',
  schemaVersion: 1,
  stateSchema: timerStateV1Schema,
  defaultState: {
    mode: 'count_up',
    targetSeconds: 0,
    elapsedSeconds: 0,
    running: false,
    startedAt: null,
  },
  defaultPlacement: 'sidebar',
};

/** Pure helper: compute live elapsed seconds from a state snapshot + now. */
export function liveElapsedSeconds(state: TimerStateV1, nowMs: number): number {
  if (!state.running || !state.startedAt) return state.elapsedSeconds;
  const delta = Math.floor((nowMs - new Date(state.startedAt).getTime()) / 1000);
  return state.elapsedSeconds + Math.max(0, delta);
}

/** Pure: emit a paused state from a possibly-running snapshot. */
export function pauseTimer(state: TimerStateV1, nowMs: number): TimerStateV1 {
  return {
    ...state,
    elapsedSeconds: liveElapsedSeconds(state, nowMs),
    running: false,
    startedAt: null,
  };
}

/** Pure: emit a running state from a possibly-paused snapshot. */
export function startTimer(state: TimerStateV1, nowIso: string): TimerStateV1 {
  if (state.running) return state;
  return { ...state, running: true, startedAt: nowIso };
}
