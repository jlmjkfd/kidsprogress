import { v7 as uuidv7 } from 'uuid';
import { authEvents, type Database_, type NewAuthEventRow } from '@kidsprogress/db';

/**
 * Append-only auth-event recorder. Surfaces to the parent settings page as a
 * "recent activity" feed (Phase 3) and to the security audit dashboard.
 *
 * NEVER pass plaintext passwords, PINs, or tokens through here — only ids,
 * outcomes, and short text reasons.
 */
export type AuthEventKind = NewAuthEventRow['kind'];

export interface AuthEventInput {
  kind: AuthEventKind;
  outcome: 'success' | 'failure';
  familyId?: string | null;
  actor?: string | null;
  reason?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export function createAuditLogger(db: Database_) {
  return {
    async write(entry: AuthEventInput): Promise<void> {
      const row: NewAuthEventRow = {
        id: uuidv7(),
        kind: entry.kind,
        outcome: entry.outcome,
        familyId: entry.familyId ?? null,
        actor: entry.actor ?? null,
        reason: entry.reason ?? null,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
      };
      await db.insert(authEvents).values(row);
    },
  };
}

export type AuditLogger = ReturnType<typeof createAuditLogger>;
