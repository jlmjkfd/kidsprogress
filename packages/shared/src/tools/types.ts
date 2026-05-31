import type { z } from 'zod';

/**
 * KidsProgress Tools registry. Tools are kid-side micro-apps (Timer, Note,
 * Calculator) attachable to any task instance. Unlike handlers — which own
 * the WHAT of a task — tools own a generic execution affordance.
 *
 * Architecture: each tool exports an immutable state schema; the host
 * persists tool state in `task_sessions.progressState.toolStates[toolId]`.
 * Tools NEVER read/write storage directly; they receive a `ToolContext`
 * bus (defined in apps/web; not part of the schema layer here).
 *
 * Placement is declarative on the manifest — `main` (full panel) vs.
 * `sidebar` (collapsed). No hardcoded `tool.id === 'note'` placement, per
 * v2.5 audit fix.
 */

export type ToolPlacement = 'main' | 'sidebar';

export interface ToolManifest<State> {
  readonly toolId: string;
  /** Versioned the same way handlers are — bump on breaking state shape. */
  readonly schemaVersion: number;
  /** Validated whenever the host reads `toolStates[toolId]`. */
  readonly stateSchema: z.ZodType<State>;
  /** Initial state used when the kid first attaches the tool. */
  readonly defaultState: State;
  /** Default placement; the kid can override per-instance. */
  readonly defaultPlacement: ToolPlacement;
}

export type AnyToolManifest = ToolManifest<unknown>;
