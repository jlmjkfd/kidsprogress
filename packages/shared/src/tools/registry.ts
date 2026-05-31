import type { AnyToolManifest } from './types.js';
import { calculatorManifest } from './calculator.js';
import { noteManifest } from './note.js';
import { timerManifest } from './timer.js';

const REGISTRY: ReadonlyArray<AnyToolManifest> = [
  timerManifest as AnyToolManifest,
  noteManifest as AnyToolManifest,
  calculatorManifest as AnyToolManifest,
];

const byId: ReadonlyMap<string, AnyToolManifest> = new Map(
  REGISTRY.map((m) => [m.toolId, m] as const),
);

export function listToolIds(): readonly string[] {
  return REGISTRY.map((m) => m.toolId);
}

export function getTool(toolId: string): AnyToolManifest | undefined {
  return byId.get(toolId);
}

/**
 * Validate a tool-state blob from `task_sessions.progressState.toolStates`.
 * Throws ZodError on mismatch (mapped to 400 by the host route).
 */
export function validateToolState(toolId: string, raw: unknown): unknown {
  const manifest = getTool(toolId);
  if (!manifest) throw new Error(`Unknown tool: ${toolId}`);
  return manifest.stateSchema.parse(raw);
}
