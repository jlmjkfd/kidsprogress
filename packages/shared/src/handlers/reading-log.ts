import { z } from 'zod';
import type { HandlerModule, HandlerVersion } from './types.js';

/**
 * Reading log. The kid records what they read and for how long. No AI
 * eval — this handler is the "minimal viable plugin" that proves the
 * contract works for a third concrete handler.
 */
export const readingLogConfigV1Schema = z
  .object({
    /** Minimum minutes the kid must log to mark the task complete. */
    minMinutes: z.number().int().nonnegative().max(240),
    /** Optional list of suggested book titles to nudge the kid toward. */
    suggestions: z.array(z.string().min(1).max(160)).max(20).optional(),
    /**
     * If true, the kid types a short summary; else just minutes + title.
     * Default false — keeps younger-kid friction low.
     */
    requireSummary: z.boolean(),
  });

export type ReadingLogConfigV1 = z.infer<typeof readingLogConfigV1Schema>;

const v1: HandlerVersion<ReadingLogConfigV1> = {
  schemaVersion: 1,
  configSchema: readingLogConfigV1Schema,
};

export const readingLogHandler: HandlerModule<ReadingLogConfigV1> = {
  handlerId: 'reading-log',
  versions: [v1],
};
