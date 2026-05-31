import { describe, expect, it } from 'vitest';
import {
  assertAllPersistedVersionsRegistered,
  getHandler,
  getHandlerVersion,
  listHandlerIds,
  validateConfig,
} from './registry.js';

describe('handler registry', () => {
  it('lists at least the built-in handlers', () => {
    expect(listHandlerIds()).toContain('generic');
  });

  it('getHandler returns undefined for unknown ids', () => {
    expect(getHandler('nope')).toBeUndefined();
  });

  it('getHandlerVersion returns the right version', () => {
    expect(getHandlerVersion('generic', 1)).toBeDefined();
    expect(getHandlerVersion('generic', 999)).toBeUndefined();
  });

  it('validateConfig validates the generic handler shape', () => {
    const ok = validateConfig('generic', 1, { steps: [], instructions: 'do the thing' });
    expect(ok).toMatchObject({ steps: [], instructions: 'do the thing' });
  });

  it('validateConfig rejects unknown handler/version', () => {
    expect(() => validateConfig('does-not-exist', 1, {})).toThrow();
    expect(() => validateConfig('generic', 9, {})).toThrow();
  });

  it('assertAllPersistedVersionsRegistered passes for empty + known sets', () => {
    expect(() => assertAllPersistedVersionsRegistered([])).not.toThrow();
    expect(() =>
      assertAllPersistedVersionsRegistered([{ handlerId: 'generic', schemaVersion: 1 }]),
    ).not.toThrow();
  });

  it('assertAllPersistedVersionsRegistered throws on missing pair', () => {
    expect(() =>
      assertAllPersistedVersionsRegistered([
        { handlerId: 'generic', schemaVersion: 1 },
        { handlerId: 'totally-unknown-handler', schemaVersion: 1 },
      ]),
    ).toThrowError(/totally-unknown-handler@v1/);
  });
});
