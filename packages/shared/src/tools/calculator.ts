import { z } from 'zod';
import { evaluate } from 'mathjs';
import type { ToolManifest } from './types.js';

/**
 * Calculator — a tape-style four-banger. Uses **mathjs** for evaluation,
 * never `new Function` / `eval` (audit fix: arbitrary JS execution from a
 * kid-typed string is unacceptable). mathjs has a strict expression
 * parser, no I/O, no globals.
 *
 * State carries the running tape (last N entries) + the current input.
 * Evaluation happens via the pure `tryEvaluate` helper — UI calls it
 * and either appends a tape entry or surfaces the error.
 */
export const calculatorEntrySchema = z.object({
  expression: z.string(),
  result: z.string(),
  at: z.string().datetime(),
});
export type CalculatorEntry = z.infer<typeof calculatorEntrySchema>;

export const calculatorStateV1Schema = z.object({
  /** Most recent tape entries first. Capped at 50. */
  tape: z.array(calculatorEntrySchema).max(50),
  /** What the kid is currently typing — survives a save-progress. */
  input: z.string().max(200),
});
export type CalculatorStateV1 = z.infer<typeof calculatorStateV1Schema>;

export const calculatorManifest: ToolManifest<CalculatorStateV1> = {
  toolId: 'calculator',
  schemaVersion: 1,
  stateSchema: calculatorStateV1Schema,
  defaultState: { tape: [], input: '' },
  defaultPlacement: 'sidebar',
};

/**
 * Safe expression evaluator. Returns either `{ ok: true, result }` or
 * `{ ok: false, error }`. Caps input to mathjs's default + rejects empty
 * strings.
 */
export function tryEvaluate(
  expression: string,
): { ok: true; result: string } | { ok: false; error: string } {
  const trimmed = expression.trim();
  if (trimmed.length === 0) return { ok: false, error: 'empty expression' };
  if (trimmed.length > 200) return { ok: false, error: 'expression too long' };
  try {
    const raw = evaluate(trimmed);
    // mathjs returns numbers/BigNumbers/units — coerce to string for
    // persistence. Reject NaN / Infinity so the tape doesn't capture nonsense.
    if (typeof raw === 'number' && !Number.isFinite(raw)) {
      return { ok: false, error: 'not a finite number' };
    }
    return { ok: true, result: String(raw) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'invalid expression' };
  }
}
