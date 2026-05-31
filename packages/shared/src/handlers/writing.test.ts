import { describe, expect, it } from 'vitest';
import { countWords, writingConfigV1Schema } from './writing.js';
import { validateConfig } from './registry.js';

const VALID = {
  prompt: 'Tell me about your weekend.',
  minWords: 30,
  maxWords: 150,
  aiEvalEnabled: false,
};

describe('writing handler', () => {
  it('accepts sensible config', () => {
    expect(writingConfigV1Schema.safeParse(VALID).success).toBe(true);
  });

  it('rejects when maxWords ≤ minWords', () => {
    expect(
      writingConfigV1Schema.safeParse({ ...VALID, minWords: 200, maxWords: 100 }).success,
    ).toBe(false);
  });

  it('registry dispatches by id + version', () => {
    expect(validateConfig('writing', 1, VALID)).toMatchObject({ minWords: 30 });
  });
});

describe('countWords', () => {
  it('counts whitespace-delimited words', () => {
    expect(countWords('hello world')).toBe(2);
    expect(countWords('  the   quick brown  fox   ')).toBe(4);
  });

  it('returns 0 for empty / whitespace-only', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n\t  ')).toBe(0);
  });

  it('treats newlines and tabs as separators', () => {
    expect(countWords('one\ntwo\tthree')).toBe(3);
  });
});
