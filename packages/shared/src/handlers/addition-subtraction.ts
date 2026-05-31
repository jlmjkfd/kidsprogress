import { z } from 'zod';
import type { HandlerModule, HandlerVersion } from './types.js';

/**
 * Addition-subtraction drill. Parent sets the difficulty band; the
 * executor (Phase 12+) generates fresh problems on demand so the same
 * template can be assigned many times without duplicate question fatigue.
 *
 * Design notes:
 *   - We treat carry / borrow as a CHARACTERISTIC of generated problems,
 *     not a guarantee — the generator may emit a few "no-carry" problems
 *     even when carry is enabled to vary difficulty. Hard constraints
 *     stay on `maxValue` (the largest addend) and `operations`.
 *   - `questionsPerSlot` × `slotsPerSession` is the de-facto "task is done
 *     when the kid finishes a slot". `requiredSlots` lets the parent ask
 *     for more rounds.
 */

const operationSchema = z.enum(['addition', 'subtraction']);

export const additionSubtractionConfigV1Schema = z
  .object({
    /** Largest addend / minuend / subtrahend that may appear in a problem. */
    maxValue: z.number().int().gte(1).lte(1_000),
    operations: z.array(operationSchema).min(1),
    /** If false, every problem stays within no-carry / no-borrow bounds. */
    allowCarry: z.boolean(),
    /** Subtraction problems never go below this. Defaults to 0 (no negatives). */
    minResult: z.number().int().gte(-100).lte(100),
    /** Per-slot question count — one "round" the kid sees in one sitting. */
    questionsPerSlot: z.number().int().gte(1).lte(50),
    /** Number of slots that make up one task completion. */
    requiredSlots: z.number().int().gte(1).lte(20),
  })
  .refine((c) => !c.allowCarry || c.maxValue >= 10, {
    message: 'maxValue must be at least 10 when allowCarry is enabled',
    path: ['maxValue'],
  });

export type AdditionSubtractionConfigV1 = z.infer<
  typeof additionSubtractionConfigV1Schema
>;

const v1: HandlerVersion<AdditionSubtractionConfigV1> = {
  schemaVersion: 1,
  configSchema: additionSubtractionConfigV1Schema,
};

export const additionSubtractionHandler: HandlerModule<AdditionSubtractionConfigV1> = {
  handlerId: 'addition-subtraction',
  versions: [v1],
};

// ── pure generator (executable today; consumed by the runtime in Phase 11+) ──

interface MathProblem {
  readonly id: string;
  readonly op: 'addition' | 'subtraction';
  readonly lhs: number;
  readonly rhs: number;
  readonly answer: number;
}

/**
 * Deterministic problem generator. Pure — no Math.random — so handler
 * versioning + replay are testable. Caller supplies a uniform `rng()`
 * returning `[0, 1)`; we recommend mulberry32 seeded by `(childId, date,
 * slotIndex)` for replay-friendly streams.
 */
export function generateProblems(
  config: AdditionSubtractionConfigV1,
  rng: () => number,
  count: number,
): MathProblem[] {
  const out: MathProblem[] = [];
  const noCarryCap = Math.min(9, config.maxValue);

  let safety = 0;
  while (out.length < count && safety < count * 50) {
    safety += 1;
    const opIdx = Math.floor(rng() * config.operations.length);
    const op = config.operations[opIdx]!;

    const cap = config.allowCarry ? config.maxValue : noCarryCap;
    const lhs = Math.floor(rng() * cap) + 1;
    const rhs = Math.floor(rng() * cap) + 1;

    if (op === 'addition') {
      if (!config.allowCarry && lhs + rhs > 9) continue;
      out.push({
        id: `p${out.length + 1}`,
        op,
        lhs,
        rhs,
        answer: lhs + rhs,
      });
    } else {
      // subtraction: keep lhs >= rhs + minResult.
      const big = Math.max(lhs, rhs);
      const small = Math.min(lhs, rhs);
      const answer = big - small;
      if (answer < config.minResult) continue;
      if (!config.allowCarry && (big % 10) < (small % 10)) continue;
      out.push({
        id: `p${out.length + 1}`,
        op,
        lhs: big,
        rhs: small,
        answer,
      });
    }
  }
  return out;
}

/**
 * mulberry32 — tiny, deterministic, well-distributed for our purposes.
 * Pure; takes a 32-bit unsigned seed.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
