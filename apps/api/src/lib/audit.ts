import { v7 as uuidv7 } from 'uuid';
import { auditLogs, type NewAuditLogRow } from '@kidsprogress/db';
import type { Database_ } from '@kidsprogress/db';

export type AuditEvent =
  | 'auth.register'
  | 'auth.login'
  | 'auth.refresh'
  | 'auth.logout'
  | 'auth.parent_pin_verify'
  | 'auth.child_login'
  | 'auth.device_register'
  | 'auth.device_revoke';

export interface AuditEntry {
  event: AuditEvent;
  outcome: 'success' | 'failure';
  actorUserId?: string;
  actorEmail?: string;
  targetUserId?: string;
  targetChildId?: string;
  ipAddress?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}

export function createAuditLogger(db: Database_) {
  return {
    async write(entry: AuditEntry): Promise<void> {
      const row: NewAuditLogRow = {
        id: uuidv7(),
        event: entry.event,
        outcome: entry.outcome,
        actorUserId: entry.actorUserId ?? null,
        actorEmail: entry.actorEmail ?? null,
        targetUserId: entry.targetUserId ?? null,
        targetChildId: entry.targetChildId ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        meta: entry.meta ?? null,
      };
      await db.insert(auditLogs).values(row);
    },
  };
}

export type AuditLogger = ReturnType<typeof createAuditLogger>;
