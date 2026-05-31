import { z } from 'zod';
import type { ToolManifest } from './types.js';

/**
 * Note — a scratchpad. State is the markdown-ish body + a single
 * `updatedAt` for ordering. Body is capped at 8 KB; the kid is unlikely
 * to exceed this for any single task.
 */
export const noteStateV1Schema = z.object({
  body: z.string().max(8192),
  updatedAt: z.string().datetime(),
});
export type NoteStateV1 = z.infer<typeof noteStateV1Schema>;

export const noteManifest: ToolManifest<NoteStateV1> = {
  toolId: 'note',
  schemaVersion: 1,
  stateSchema: noteStateV1Schema,
  defaultState: { body: '', updatedAt: new Date(0).toISOString() },
  defaultPlacement: 'main',
};
