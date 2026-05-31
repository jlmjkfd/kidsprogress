import { describe, expect, it } from 'vitest';
import {
  additionSubtractionConfigV1Schema,
  generateProblems,
  mulberry32,
} from './addition-subtraction.js';
import { validateConfig } from './registry.js';

const VALID = {
  maxValue: 20,
  operations: ['addition' as const],
  allowCarry: true,
  minResult: 0,
  questionsPerSlot: 10,
  requiredSlots: 1,
};

describe('addition-subtraction config', () => {
  it('accepts a sensible config', () => {
    expect(additionSubtractionConfigV1Schema.safeParse(VALID).success).toBe(true);
  });

  it('rejects empty operations', () => {
    expect(
      additionSubtractionConfigV1Schema.safeParse({ ...VALID, operations: [] }).success,
    ).toBe(false);
  });

  it('rejects maxValue < 10 when allowCarry is true (refine)', () => {
    expect(
      additionSubtractionConfigV1Schema.safeParse({
        ...VALID,
        maxValue: 5,
        allowCarry: true,
      }).success,
    ).toBe(false);
  });

  it('registry validateConfig dispatches by handlerId + version', () => {
    const out = validateConfig('addition-subtraction', 1, VALID);
    expect(out).toMatchObject({ maxValue: 20 });
  });
});

describe('generateProblems', () => {
  it('produces the requested count with deterministic seed', () => {
    const a = generateProblems(VALID, mulberry32(42), 10);
    const b = generateProblems(VALID, mulberry32(42), 10);
    expect(a).toEqual(b);
    expect(a).toHaveLength(10);
  });

  it('no-carry mode keeps every addition under 10', () => {
    const cfg = {
      ...VALID,
      maxValue: 9,
      allowCarry: false,
      operations: ['addition' as const],
    };
    const out = generateProblems(cfg, mulberry32(7), 20);
    for (const p of out) {
      expect(p.lhs + p.rhs).toBeLessThanOrEqual(9);
    }
  });

  it('subtraction respects minResult', () => {
    const cfg = {
      maxValue: 20,
      operations: ['subtraction' as const],
      allowCarry: true,
      minResult: 0,
      questionsPerSlot: 10,
      requiredSlots: 1,
    };
    const out = generateProblems(cfg, mulberry32(99), 30);
    for (const p of out) {
      expect(p.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it('mixed operations cover both', () => {
    const cfg = {
      ...VALID,
      operations: ['addition' as const, 'subtraction' as const],
    };
    const out = generateProblems(cfg, mulberry32(123), 60);
    const ops = new Set(out.map((p) => p.op));
    expect(ops.has('addition')).toBe(true);
    expect(ops.has('subtraction')).toBe(true);
  });
});
