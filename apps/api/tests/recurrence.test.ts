import { describe, expect, it } from 'vitest';
import { expandRecurrence } from '../src/lib/recurrence.js';

describe('expandRecurrence', () => {
  it('daily: every day in range', () => {
    const out = expandRecurrence(
      { freq: 'daily', interval: 1 },
      '2026-06-01',
      '2026-06-05',
      '2026-06-01',
    );
    expect(out).toEqual(['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05']);
  });

  it('daily: interval 2', () => {
    const out = expandRecurrence(
      { freq: 'daily', interval: 2 },
      '2026-06-01',
      '2026-06-10',
      '2026-06-01',
    );
    expect(out).toEqual(['2026-06-01', '2026-06-03', '2026-06-05', '2026-06-07', '2026-06-09']);
  });

  it('daily: respects `count`', () => {
    const out = expandRecurrence(
      { freq: 'daily', interval: 1, count: 3 },
      '2026-06-01',
      '2026-12-31',
      '2026-06-01',
    );
    expect(out).toHaveLength(3);
  });

  it('daily: respects `until`', () => {
    const out = expandRecurrence(
      { freq: 'daily', interval: 1, until: '2026-06-03' },
      '2026-06-01',
      '2026-06-10',
      '2026-06-01',
    );
    expect(out).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
  });

  it('weekly MO/WE/FR', () => {
    // 2026-06-01 is a Monday.
    const out = expandRecurrence(
      { freq: 'weekly', interval: 1, byWeekday: ['MO', 'WE', 'FR'] },
      '2026-06-01',
      '2026-06-14',
      '2026-06-01',
    );
    expect(out).toEqual([
      '2026-06-01', // Mon
      '2026-06-03', // Wed
      '2026-06-05', // Fri
      '2026-06-08', // Mon
      '2026-06-10', // Wed
      '2026-06-12', // Fri
    ]);
  });

  it('weekly with interval 2 (biweekly)', () => {
    const out = expandRecurrence(
      { freq: 'weekly', interval: 2, byWeekday: ['MO'] },
      '2026-06-01',
      '2026-06-30',
      '2026-06-01',
    );
    expect(out).toEqual(['2026-06-01', '2026-06-15', '2026-06-29']);
  });

  it('monthly by month-day', () => {
    const out = expandRecurrence(
      { freq: 'monthly', interval: 1, byMonthday: [1, 15] },
      '2026-06-01',
      '2026-08-31',
      '2026-06-01',
    );
    expect(out).toEqual([
      '2026-06-01',
      '2026-06-15',
      '2026-07-01',
      '2026-07-15',
      '2026-08-01',
      '2026-08-15',
    ]);
  });

  it('monthly: skips invalid day (Feb 31)', () => {
    const out = expandRecurrence(
      { freq: 'monthly', interval: 1, byMonthday: [31] },
      '2026-01-01',
      '2026-04-30',
      '2026-01-31',
    );
    expect(out).toEqual(['2026-01-31', '2026-03-31']); // Feb + Apr have no 31
  });

  it('returns empty when range is before anchor', () => {
    const out = expandRecurrence(
      { freq: 'daily', interval: 1 },
      '2025-01-01',
      '2025-01-05',
      '2026-06-01',
    );
    expect(out).toEqual([]);
  });
});
