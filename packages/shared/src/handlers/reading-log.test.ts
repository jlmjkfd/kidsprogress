import { describe, expect, it } from 'vitest';
import { readingLogConfigV1Schema } from './reading-log.js';
import { validateConfig } from './registry.js';

describe('reading-log handler', () => {
  it('accepts a valid config', () => {
    const ok = readingLogConfigV1Schema.safeParse({
      minMinutes: 15,
      requireSummary: false,
    });
    expect(ok.success).toBe(true);
  });

  it('rejects minutes > 240', () => {
    expect(
      readingLogConfigV1Schema.safeParse({
        minMinutes: 600,
        requireSummary: false,
      }).success,
    ).toBe(false);
  });

  it('registry dispatch returns the typed config', () => {
    const out = validateConfig('reading-log', 1, {
      minMinutes: 20,
      requireSummary: true,
      suggestions: ['The BFG', 'Charlotte’s Web'],
    });
    expect(out).toMatchObject({ minMinutes: 20 });
  });
});
