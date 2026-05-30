import { describe, expect, it } from 'vitest';
import {
  ageDeltas,
  childTokens,
  flattenAgeDelta,
  flattenTokens,
  parentTokens,
  themes,
} from './tokens.js';

describe('KPDS tokens', () => {
  it('both themes are registered', () => {
    expect(themes.parent).toBe(parentTokens);
    expect(themes.child).toBe(childTokens);
  });

  it('palette key set is identical across themes', () => {
    const p = Object.keys(parentTokens.palette).sort();
    const c = Object.keys(childTokens.palette).sort();
    expect(c).toEqual(p);
  });

  it('type-scale key set is identical across themes', () => {
    const p = Object.keys(parentTokens.type).sort();
    const c = Object.keys(childTokens.type).sort();
    expect(c).toEqual(p);
  });

  it('motion / radius / spacing / shadow key sets are identical', () => {
    for (const group of ['motion', 'radius', 'spacing', 'shadow'] as const) {
      const p = Object.keys(parentTokens[group]).sort();
      const c = Object.keys(childTokens[group]).sort();
      expect(c).toEqual(p);
    }
  });

  it('parent emits NO gradients (design rule)', () => {
    expect(Object.keys(parentTokens.gradients)).toEqual([]);
  });

  it('child emits exactly five named gradients (design rule)', () => {
    const names = Object.keys(childTokens.gradients).sort();
    expect(names).toEqual(['berry', 'citrus', 'forest', 'ocean', 'sunrise']);
  });

  it('flattenTokens produces --kp-*-* keys with no collisions across groups', () => {
    const flat = flattenTokens(childTokens);
    const keys = Object.keys(flat);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((k) => k.startsWith('--kp-'))).toBe(true);
  });

  it('flattenTokens emits the same key shape for both themes', () => {
    const p = Object.keys(flattenTokens(parentTokens))
      .filter((k) => !k.startsWith('--kp-gradient-'))
      .sort();
    const c = Object.keys(flattenTokens(childTokens))
      .filter((k) => !k.startsWith('--kp-gradient-'))
      .sort();
    expect(c).toEqual(p);
  });

  it('age deltas only override known token keys', () => {
    const flat = flattenAgeDelta(ageDeltas.younger);
    for (const k of Object.keys(flat)) {
      expect(k).toMatch(/^--kp-(spacing|type|radius)-/);
    }
  });

  it('parent touch target is ≥44 px; child ≥48 px (a11y rule)', () => {
    expect(parentTokens.spacing.touch).toBe('2.75rem'); // 44 px
    expect(childTokens.spacing.touch).toBe('3rem'); // 48 px
  });
});
