import type { RecurrenceRule } from '@kidsprogress/shared';

/**
 * Pure recurrence-rule expander. Given a rule + a date range, returns every
 * occurrence date (inclusive of both ends) as ISO YYYY-MM-DD strings.
 *
 * No dependency on a calendar lib — the rule subset (daily/weekly/monthly)
 * is small enough to expand by hand. Tested by tests/recurrence.test.ts.
 */
export function expandRecurrence(
  rule: RecurrenceRule,
  fromDate: string,
  toDate: string,
  anchorDate: string,
): string[] {
  const from = parseDate(fromDate);
  const to = parseDate(toDate);
  const anchor = parseDate(anchorDate);
  if (to < from) return [];

  const limit = rule.count ?? Infinity;
  const until = rule.until ? parseDate(rule.until) : null;

  const out: string[] = [];
  let total = 0;

  if (rule.freq === 'daily') {
    const interval = Math.max(1, rule.interval);
    const startDiff = daysBetween(anchor, from);
    // Step back to the first occurrence within or before `from`
    const stepIndex = Math.max(0, Math.ceil(startDiff / interval));
    let day = addDays(anchor, stepIndex * interval);
    while (day <= to) {
      if (until && day > until) break;
      if (day >= from) {
        if (total >= limit) break;
        out.push(formatDate(day));
        total++;
      }
      day = addDays(day, interval);
    }
    return out;
  }

  if (rule.freq === 'weekly') {
    const interval = Math.max(1, rule.interval);
    // Find each Monday on/after `from`, then walk weeks by interval.
    const weekdayMap: Record<string, number> = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 0 };
    const selected = new Set(rule.byWeekday.map((w) => weekdayMap[w]).filter((n): n is number => n !== undefined));

    // anchor week: the Monday of the anchor's week (or anchor itself if Monday).
    const anchorWeekStart = startOfWeekMonday(anchor);
    let weekStart = anchorWeekStart;
    // Advance week-by-interval until we're at or just before `from`.
    while (weekStart < from && daysBetween(weekStart, from) > 7) {
      weekStart = addDays(weekStart, 7 * interval);
    }
    // It's possible weekStart jumped past `from` by less than 7 days; back up if needed.
    while (weekStart > from && daysBetween(anchorWeekStart, weekStart) >= 7 * interval) {
      weekStart = addDays(weekStart, -7 * interval);
    }

    while (weekStart <= to) {
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        const dow = d.getUTCDay();
        if (!selected.has(dow)) continue;
        if (d < from || d > to) continue;
        if (until && d > until) return out;
        if (total >= limit) return out;
        out.push(formatDate(d));
        total++;
      }
      weekStart = addDays(weekStart, 7 * interval);
    }
    return out;
  }

  if (rule.freq === 'monthly') {
    const interval = Math.max(1, rule.interval);
    // Walk months from the anchor's month forward.
    let y = anchor.getUTCFullYear();
    let m = anchor.getUTCMonth(); // 0-11
    // Fast-forward to the month of `from`.
    while (y < from.getUTCFullYear() || (y === from.getUTCFullYear() && m < from.getUTCMonth())) {
      m += interval;
      while (m > 11) {
        m -= 12;
        y++;
      }
    }

    while (true) {
      const monthEnd = new Date(Date.UTC(y, m + 1, 0));
      if (monthEnd < from) {
        m += interval;
        while (m > 11) {
          m -= 12;
          y++;
        }
        continue;
      }
      const monthStart = new Date(Date.UTC(y, m, 1));
      if (monthStart > to) break;

      for (const md of rule.byMonthday) {
        const day = new Date(Date.UTC(y, m, md));
        if (day.getUTCMonth() !== m) continue; // e.g. Feb 31 → skip
        if (day < from || day > to) continue;
        if (until && day > until) return out;
        if (total >= limit) return out;
        out.push(formatDate(day));
        total++;
      }

      m += interval;
      while (m > 11) {
        m -= 12;
        y++;
      }
    }
    return out;
  }

  return out;
}

// ── helpers ──────────────────────────────────────────────────────────────
function parseDate(s: string): Date {
  // Accept YYYY-MM-DD only.
  const [y, m, d] = s.split('-').map((n) => Number.parseInt(n, 10));
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}
function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
function startOfWeekMonday(d: Date): Date {
  const dow = d.getUTCDay(); // Sun=0..Sat=6
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(d, -back);
}
