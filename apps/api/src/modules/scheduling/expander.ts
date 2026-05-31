// rrule@2.x ships a CJS bundle with no `exports` map, so Node 22's
// ESM-from-CJS interop can't find the named exports. Default-import the
// whole module + destructure at runtime — the only shape that works
// across both `tsx watch` (dev) and `node` (built).
import rrulePkg from 'rrule';
import type { RRule as RRuleType, RRuleSet as RRuleSetType } from 'rrule';
import type { TaskAssignmentRow } from '@kidsprogress/db';
import type { InstanceKey } from '@kidsprogress/shared';

const { rrulestr } = rrulePkg as unknown as {
  rrulestr: (s: string, opts?: { dtstart?: Date; cache?: boolean }) => RRuleType | RRuleSetType;
};

/**
 * Expand an assignment into virtual instance keys for a given date range.
 *
 * - **One-shot** (no `rrule`): emits exactly one key at `effectiveFrom` if
 *   it falls inside `[from, to]`.
 * - **Recurring**: parses `rrule` via rrule.js, clamped to the
 *   `effectiveFrom`/`effectiveUntil` window, intersected with `[from, to]`.
 *
 * Returned keys are `kind: 'virtual'` — the calendar reader is expected to
 * join them against materialised rows separately (Phase 7c).
 *
 * `from`/`to` are ISO-8601 strings. The expander treats them as inclusive.
 * Timezone math lives inside rrule.js — the assignment carries an IANA
 * `timezone` string that this expander does NOT yet apply (rrule.js can
 * accept TZID in the rule string itself). Date-of-occurrence is returned
 * as a UTC ISO string and the UI applies `assignment.timezone` for display.
 */
export function expandOccurrences(
  assignment: Pick<
    TaskAssignmentRow,
    'id' | 'rrule' | 'effectiveFrom' | 'effectiveUntil'
  >,
  range: { from: string; to: string },
): InstanceKey[] {
  const fromDate = new Date(range.from);
  const toDate = new Date(range.to);
  if (fromDate > toDate) return [];

  // One-shot case — no rule string.
  if (!assignment.rrule) {
    const at = new Date(assignment.effectiveFrom);
    if (at >= fromDate && at <= toDate) {
      return [
        {
          kind: 'virtual',
          assignmentId: assignment.id,
          originalDate: at.toISOString(),
        },
      ];
    }
    return [];
  }

  // Recurring case. Build a RRuleSet so we can layer DTSTART + UNTIL on
  // top of the user-supplied rule. rrule.js's `between()` is inclusive at
  // both ends when the third arg is true.
  const dtStart = new Date(assignment.effectiveFrom);
  const until = assignment.effectiveUntil ? new Date(assignment.effectiveUntil) : undefined;

  let rule: RRuleType | RRuleSetType;
  try {
    // Accept either bare RRULE or full ICS-shaped strings (`DTSTART...\nRRULE...`).
    rule = rrulestr(assignment.rrule, { dtstart: dtStart, cache: true });
  } catch {
    return [];
  }

  // Intersect the user range with the assignment's own window.
  const lo = fromDate > dtStart ? fromDate : dtStart;
  const hi = until && toDate > until ? until : toDate;
  if (lo > hi) return [];

  const dates = rule.between(lo, hi, true);
  return dates.map((d) => ({
    kind: 'virtual',
    assignmentId: assignment.id,
    originalDate: d.toISOString(),
  }));
}

/**
 * Validate that an `rrule` string parses. Used by the assignments service
 * before persisting so the parent gets a fast 400 instead of a runtime
 * surprise on the kid's calendar.
 */
export function tryParseRrule(rrule: string): { ok: true } | { ok: false; error: string } {
  try {
    const r = rrulestr(rrule, { dtstart: new Date('2026-01-01T00:00:00Z') });
    // Defensive smoke — confirm `between` doesn't throw on a short range.
    r.between(
      new Date('2026-01-01T00:00:00Z'),
      new Date('2026-01-02T00:00:00Z'),
      true,
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'invalid rrule' };
  }
}
