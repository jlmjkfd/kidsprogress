// rrule@2.x ships a CJS bundle with no `exports` map, so Node 22's
// ESM-from-CJS interop can't find the named exports. Default-import the
// whole module + destructure at runtime — the only shape that works
// across both `tsx watch` (dev) and `node` (built).
import rrulePkg from 'rrule';
import type { RRule as RRuleType, RRuleSet as RRuleSetType } from 'rrule';
import type {
  RecurrenceExceptionRow,
  TaskAssignmentRow,
} from '@kidsprogress/db';
import type { InstanceKey } from '@kidsprogress/shared';

const { rrulestr } = rrulePkg as unknown as {
  rrulestr: (s: string, opts?: { dtstart?: Date; cache?: boolean }) => RRuleType | RRuleSetType;
};

interface VirtualKey {
  kind: 'virtual';
  assignmentId: string;
  originalDate: string;
  /** When this occurrence has been rescheduled, the new render date. */
  effectiveDate: string;
}

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
  exceptions: ReadonlyArray<
    Pick<RecurrenceExceptionRow, 'occurrenceDate' | 'action' | 'rescheduledTo'>
  > = [],
): InstanceKey[] {
  const fromDate = new Date(range.from);
  const toDate = new Date(range.to);
  if (fromDate > toDate) return [];

  // Build raw virtuals first; we layer exceptions on top.
  const raw: VirtualKey[] = [];

  // One-shot case — no rule string.
  if (!assignment.rrule) {
    const at = new Date(assignment.effectiveFrom);
    const iso = at.toISOString();
    raw.push({
      kind: 'virtual',
      assignmentId: assignment.id,
      originalDate: iso,
      effectiveDate: iso,
    });
  } else {
    // Recurring case.
    const dtStart = new Date(assignment.effectiveFrom);
    const until = assignment.effectiveUntil
      ? new Date(assignment.effectiveUntil)
      : undefined;

    let rule: RRuleType | RRuleSetType;
    try {
      rule = rrulestr(assignment.rrule, { dtstart: dtStart, cache: true });
    } catch {
      return [];
    }

    // Widen the rrule scan so a reschedule that pulls an occurrence INTO the
    // range from outside is still visible, and trim the post-exception result
    // to the requested range at the end.
    const scanLo = new Date(fromDate);
    scanLo.setDate(scanLo.getDate() - 14);
    const scanHi = new Date(toDate);
    scanHi.setDate(scanHi.getDate() + 14);
    const lo = scanLo > dtStart ? scanLo : dtStart;
    const hi = until && scanHi > until ? until : scanHi;
    if (lo > hi) return [];

    for (const d of rule.between(lo, hi, true)) {
      const iso = d.toISOString();
      raw.push({
        kind: 'virtual',
        assignmentId: assignment.id,
        originalDate: iso,
        effectiveDate: iso,
      });
    }
  }

  // Apply exceptions by (originalDate). Exception originalDate is stored as
  // a date-with-time ISO string; we match on the exact UTC instant.
  const byOriginal = new Map(exceptions.map((e) => [e.occurrenceDate, e]));
  const afterExceptions: VirtualKey[] = [];
  for (const v of raw) {
    const ex = byOriginal.get(v.originalDate);
    if (!ex) {
      afterExceptions.push(v);
      continue;
    }
    if (ex.action === 'skip') continue;
    if (ex.action === 'reschedule' && ex.rescheduledTo) {
      afterExceptions.push({ ...v, effectiveDate: ex.rescheduledTo });
      continue;
    }
    if (ex.action === 'override') {
      afterExceptions.push(v);
      continue;
    }
    // 'materialized' — caller layer handles via `task_instances` join.
    afterExceptions.push(v);
  }

  // Trim to the originally-requested range (effectiveDate, since a reschedule
  // can carry an occurrence into or out of the visible window).
  return afterExceptions
    .filter((v) => {
      const e = new Date(v.effectiveDate);
      return e >= fromDate && e <= toDate;
    })
    .map(({ kind, assignmentId, originalDate, effectiveDate }): InstanceKey => ({
      kind,
      assignmentId,
      originalDate,
      ...(effectiveDate !== originalDate ? { rescheduledTo: effectiveDate } : {}),
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
