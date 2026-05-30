import { z } from 'zod';
import type { HandlerModule, HandlerVersion } from './types.js';

/**
 * The "generic" handler. The catch-all for parent-defined tasks that don't
 * need any specialised execution surface — chores, "read a book for 20
 * minutes", "tidy your desk". Always available; serves as the implicit
 * default when the parent picks "create my own".
 */

export const genericConfigV1Schema = z.object({
  /** Optional list of checklist items. Empty → simple complete-or-not. */
  steps: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        label: z.string().min(1).max(160),
      }),
    )
    .max(20),
  /** Free-form instructions shown to the kid above the steps. */
  instructions: z.string().max(2000).optional(),
});
export type GenericConfigV1 = z.infer<typeof genericConfigV1Schema>;

const v1: HandlerVersion<GenericConfigV1> = {
  schemaVersion: 1,
  configSchema: genericConfigV1Schema,
};

export const genericHandler: HandlerModule<GenericConfigV1> = {
  handlerId: 'generic',
  versions: [v1],
};
