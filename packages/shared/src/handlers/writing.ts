import { z } from 'zod';
import type { HandlerModule, HandlerVersion } from './types.js';

/**
 * Writing handler. The kid sees a prompt + a free-form text area, types,
 * and submits. Word-count gates the Done button.
 *
 * `aiEvalEnabled` is a flag the eventual Gemini wrapper consults to
 * generate friendly feedback — the executor doesn't act on it directly;
 * it's read by `lib/gemini.ts` (Phase 12b) when present.
 */
export const writingConfigV1Schema = z
  .object({
    prompt: z.string().min(1).max(2000),
    minWords: z.number().int().nonnegative().max(2000),
    maxWords: z.number().int().positive().max(5000),
    /** When true + the family has a Gemini key, eval the submission. */
    aiEvalEnabled: z.boolean(),
    /**
     * Optional rubric the AI evaluator scores against. Free-form text so
     * the parent can shape feedback ("focus on grammar", "be encouraging").
     */
    rubric: z.string().max(1000).optional(),
  })
  .refine((c) => c.maxWords > c.minWords, {
    message: 'maxWords must be greater than minWords',
    path: ['maxWords'],
  });

export type WritingConfigV1 = z.infer<typeof writingConfigV1Schema>;

const v1: HandlerVersion<WritingConfigV1> = {
  schemaVersion: 1,
  configSchema: writingConfigV1Schema,
};

export const writingHandler: HandlerModule<WritingConfigV1> = {
  handlerId: 'writing',
  versions: [v1],
};

/** Pure word counter — splits on whitespace, ignores empty entries. */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
