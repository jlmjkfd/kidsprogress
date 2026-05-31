import { describe, expect, it } from 'vitest';
import {
  getTool,
  listToolIds,
  validateToolState,
} from './registry.js';
import {
  liveElapsedSeconds,
  pauseTimer,
  startTimer,
} from './timer.js';
import { tryEvaluate } from './calculator.js';

describe('tools registry', () => {
  it('exposes built-in tool ids', () => {
    expect(listToolIds()).toEqual(
      expect.arrayContaining(['timer', 'note', 'calculator']),
    );
  });

  it('getTool returns undefined for unknown id', () => {
    expect(getTool('rocketship')).toBeUndefined();
  });

  it('validateToolState accepts the manifest default', () => {
    for (const id of listToolIds()) {
      const tool = getTool(id);
      expect(tool).toBeDefined();
      expect(() => validateToolState(id, tool!.defaultState)).not.toThrow();
    }
  });

  it('validateToolState rejects an out-of-shape state', () => {
    expect(() =>
      validateToolState('timer', { mode: 'broken', elapsedSeconds: 'no' }),
    ).toThrow();
  });
});

describe('timer pure helpers', () => {
  const now = new Date('2026-06-01T10:00:00.000Z').getTime();

  it('liveElapsedSeconds returns elapsed when paused', () => {
    expect(
      liveElapsedSeconds(
        {
          mode: 'count_up',
          targetSeconds: 0,
          elapsedSeconds: 30,
          running: false,
          startedAt: null,
        },
        now,
      ),
    ).toBe(30);
  });

  it('liveElapsedSeconds adds delta while running', () => {
    const startedAt = new Date(now - 5_000).toISOString();
    expect(
      liveElapsedSeconds(
        {
          mode: 'count_up',
          targetSeconds: 0,
          elapsedSeconds: 30,
          running: true,
          startedAt,
        },
        now,
      ),
    ).toBe(35);
  });

  it('pauseTimer captures live elapsed + clears startedAt', () => {
    const startedAt = new Date(now - 12_000).toISOString();
    const paused = pauseTimer(
      {
        mode: 'count_up',
        targetSeconds: 0,
        elapsedSeconds: 8,
        running: true,
        startedAt,
      },
      now,
    );
    expect(paused.running).toBe(false);
    expect(paused.startedAt).toBeNull();
    expect(paused.elapsedSeconds).toBe(20);
  });

  it('startTimer is no-op when already running', () => {
    const started = startTimer(
      {
        mode: 'count_up',
        targetSeconds: 0,
        elapsedSeconds: 5,
        running: true,
        startedAt: '2026-06-01T09:59:59.000Z',
      },
      new Date(now).toISOString(),
    );
    expect(started.startedAt).toBe('2026-06-01T09:59:59.000Z');
  });
});

describe('calculator tryEvaluate', () => {
  it('handles simple arithmetic', () => {
    expect(tryEvaluate('2 + 3')).toEqual({ ok: true, result: '5' });
    expect(tryEvaluate('10 / 4')).toEqual({ ok: true, result: '2.5' });
    expect(tryEvaluate('2 ^ 8')).toEqual({ ok: true, result: '256' });
  });

  it('rejects empty + too long', () => {
    expect(tryEvaluate('').ok).toBe(false);
    expect(tryEvaluate(' '.repeat(2)).ok).toBe(false);
    expect(tryEvaluate('1+'.repeat(300)).ok).toBe(false);
  });

  it('rejects division by zero', () => {
    const r = tryEvaluate('1/0');
    expect(r.ok).toBe(false);
  });

  it('does NOT execute arbitrary JS via mathjs (no globalThis access)', () => {
    // mathjs doesn't expose JS globals — any attempt to reach them is a
    // parse error or unknown symbol.
    const r = tryEvaluate('process.exit(1)');
    expect(r.ok).toBe(false);
  });
});
