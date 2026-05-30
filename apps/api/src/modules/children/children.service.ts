import { randomInt } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import {
  children as childrenTable,
  type ChildRow,
  type Database_,
} from '@kidsprogress/db';
import type { AppConfig } from '../../config.js';
import { makeHasher, type Hasher } from '../../lib/argon2.js';
import { createAuditLogger, type AuditLogger } from '../../lib/audit.js';
import type {
  Child,
  CreateChildRequest,
  IssueChildPinResetResponse,
  UpdateChildRequest,
} from '@kidsprogress/shared';
import { createChildrenRepo, type ChildrenRepo } from './children.repo.js';
import {
  ChildLockedError,
  ChildNotFoundError,
  ChildPinNotSetError,
  InvalidChildPinError,
  InvalidPinResetCodeError,
} from './children.errors.js';

/** 5 consecutive PIN failures trip the lockout. */
const LOCKOUT_THRESHOLD = 5;
/** Lock for this long once the threshold is hit. */
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
/** Reset code is valid for 24 hours from issue. */
const RESET_CODE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Constant dummy argon2id hash used to equalise timing on miss paths in
 * usePinReset (no-such-child, no-active-code). Mirrors the pattern in
 * auth.service.login. Not a secret; never matches any plaintext.
 */
const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXk$cElxRkRMQzVCb2J2YkRlYW9aSEZ4UQ';

export interface AuthContext {
  ip?: string;
  userAgent?: string;
}

/** Serialise a DB row to the DTO shape, hiding hash material. */
export function toChildDto(row: ChildRow): Child {
  return {
    id: row.id,
    familyId: row.familyId,
    displayName: row.displayName,
    avatarKey: row.avatarKey,
    birthYear: row.birthYear,
    pinRequired: row.pinRequired,
    hasPin: row.pinHash !== null,
    lockedUntil: row.lockedUntil,
    hasPinResetCode:
      row.pinResetCodeHash !== null &&
      row.pinResetCodeExpiresAt !== null &&
      new Date(row.pinResetCodeExpiresAt) > new Date(),
    dailyAiTokenCap: row.dailyAiTokenCap,
    streakOptIn: row.streakOptIn,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Six-digit reset code, zero-padded, drawn from a cryptographic RNG. */
function generateResetCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function createChildrenService(opts: {
  db: Database_;
  config: AppConfig;
  hasher?: Hasher;
  repo?: ChildrenRepo;
  audit?: AuditLogger;
}) {
  const hasher = opts.hasher ?? makeHasher(opts.config);
  const repo = opts.repo ?? createChildrenRepo(opts.db);
  const audit = opts.audit ?? createAuditLogger(opts.db);

  /** Family-scoped fetch — throws ChildNotFoundError on miss. */
  async function loadInFamily(childId: string, familyId: string): Promise<ChildRow> {
    const row = await repo.findByIdInFamily(childId, familyId);
    if (!row) throw new ChildNotFoundError('Child not found');
    return row;
  }

  return {
    async list(familyId: string): Promise<Child[]> {
      const rows = await repo.listByFamily(familyId);
      return rows.map(toChildDto);
    },

    async get(childId: string, familyId: string): Promise<Child> {
      const row = await loadInFamily(childId, familyId);
      return toChildDto(row);
    },

    async create(
      familyId: string,
      params: CreateChildRequest,
      actorUserId: string,
      ctx: AuthContext,
    ): Promise<Child> {
      const id = uuidv7();
      const pinHash = params.pin ? await hasher.hash(params.pin) : null;
      const pinRequired = params.pinRequired ?? params.pin !== undefined;
      const row = await repo.insert({
        id,
        familyId,
        displayName: params.displayName,
        avatarKey: params.avatarKey ?? 'avatar-01',
        ...(params.birthYear !== undefined ? { birthYear: params.birthYear } : {}),
        pinRequired,
        pinHash,
        ...(params.dailyAiTokenCap !== undefined
          ? { dailyAiTokenCap: params.dailyAiTokenCap }
          : {}),
        ...(params.streakOptIn !== undefined ? { streakOptIn: params.streakOptIn } : {}),
      });
      await audit.write({
        kind: 'child_created',
        outcome: 'success',
        familyId,
        actor: `parent:${actorUserId}`,
        reason: `child:${id}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return toChildDto(row);
    },

    async update(
      childId: string,
      familyId: string,
      patch: UpdateChildRequest,
      actorUserId: string,
      ctx: AuthContext,
    ): Promise<Child> {
      // Family-scope check before mutation.
      await loadInFamily(childId, familyId);
      // Build the patch with only present keys — drizzle treats `undefined`
      // values as "set to NULL" which would clobber e.g. `birthYear`.
      // Deliberately does NOT accept pinRequired or archivedAt — those flow
      // through dedicated endpoints to preserve the (pinRequired, pinHash)
      // dual invariant and emit the correct audit-event kind.
      const fields: Partial<{
        displayName: string;
        avatarKey: string;
        birthYear: number;
        dailyAiTokenCap: number;
        streakOptIn: boolean;
      }> = {};
      if (patch.displayName !== undefined) fields.displayName = patch.displayName;
      if (patch.avatarKey !== undefined) fields.avatarKey = patch.avatarKey;
      if (patch.birthYear !== undefined) fields.birthYear = patch.birthYear;
      if (patch.dailyAiTokenCap !== undefined) fields.dailyAiTokenCap = patch.dailyAiTokenCap;
      if (patch.streakOptIn !== undefined) fields.streakOptIn = patch.streakOptIn;
      const updated = await repo.update(childId, fields);
      if (!updated) throw new ChildNotFoundError('Child not found');
      await audit.write({
        kind: 'child_updated',
        outcome: 'success',
        familyId,
        actor: `parent:${actorUserId}`,
        reason: `child:${childId}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return toChildDto(updated);
    },

    async archive(
      childId: string,
      familyId: string,
      actorUserId: string,
      ctx: AuthContext,
    ): Promise<Child> {
      const row = await loadInFamily(childId, familyId);
      // Idempotent — preserves the original archive timestamp and audit row.
      if (row.archivedAt !== null) return toChildDto(row);
      const updated = await repo.update(childId, { archivedAt: new Date().toISOString() });
      if (!updated) throw new ChildNotFoundError('Child not found');
      await audit.write({
        kind: 'child_archived',
        outcome: 'success',
        familyId,
        actor: `parent:${actorUserId}`,
        reason: `child:${childId}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return toChildDto(updated);
    },

    async restore(
      childId: string,
      familyId: string,
      actorUserId: string,
      ctx: AuthContext,
    ): Promise<Child> {
      const row = await loadInFamily(childId, familyId);
      if (row.archivedAt === null) return toChildDto(row);
      const updated = await repo.update(childId, { archivedAt: null });
      if (!updated) throw new ChildNotFoundError('Child not found');
      await audit.write({
        kind: 'child_restored',
        outcome: 'success',
        familyId,
        actor: `parent:${actorUserId}`,
        reason: `child:${childId}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return toChildDto(updated);
    },

    /** Set or rotate the child's PIN. Clears any active lockout + reset code. */
    async setPin(
      childId: string,
      familyId: string,
      pin: string,
      actorUserId: string,
      ctx: AuthContext,
    ): Promise<Child> {
      await loadInFamily(childId, familyId);
      const pinHash = await hasher.hash(pin);
      const updated = await repo.update(childId, {
        pinHash,
        pinRequired: true,
        failedPinAttempts: 0,
        lockedUntil: null,
        pinResetCodeHash: null,
        pinResetCodeExpiresAt: null,
      });
      if (!updated) throw new ChildNotFoundError('Child not found');
      await audit.write({
        kind: 'child_pin_set',
        outcome: 'success',
        familyId,
        actor: `parent:${actorUserId}`,
        reason: `child:${childId}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return toChildDto(updated);
    },

    /** Clear the child's PIN (parent decided no gate). */
    async clearPin(
      childId: string,
      familyId: string,
      actorUserId: string,
      ctx: AuthContext,
    ): Promise<Child> {
      await loadInFamily(childId, familyId);
      const updated = await repo.update(childId, {
        pinHash: null,
        pinRequired: false,
        failedPinAttempts: 0,
        lockedUntil: null,
        pinResetCodeHash: null,
        pinResetCodeExpiresAt: null,
      });
      if (!updated) throw new ChildNotFoundError('Child not found');
      await audit.write({
        kind: 'child_pin_cleared',
        outcome: 'success',
        familyId,
        actor: `parent:${actorUserId}`,
        reason: `child:${childId}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return toChildDto(updated);
    },

    /**
     * Generate a one-time reset code. Server returns the plaintext code to
     * the parent ONCE; only the argon2id hash is persisted. Code is valid
     * for 24 hours; any prior outstanding code is overwritten.
     */
    async issuePinReset(
      childId: string,
      familyId: string,
      actorUserId: string,
      ctx: AuthContext,
    ): Promise<IssueChildPinResetResponse> {
      await loadInFamily(childId, familyId);
      const code = generateResetCode();
      const resetCodeHash = await hasher.hash(code);
      const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS).toISOString();
      const updated = await repo.update(childId, {
        pinResetCodeHash: resetCodeHash,
        pinResetCodeExpiresAt: expiresAt,
      });
      if (!updated) throw new ChildNotFoundError('Child not found');
      await audit.write({
        kind: 'pin_reset_issued',
        outcome: 'success',
        familyId,
        actor: `parent:${actorUserId}`,
        reason: `child:${childId}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return { resetCode: code, expiresAt };
    },

    /**
     * Public-ish: the child (or whoever is at the device) presents the
     * one-time reset code + a new PIN.
     *
     * Hardened against two oracles:
     *  - **Existence oracle**: every miss path throws the SAME
     *    `InvalidPinResetCodeError` (401); we never throw 404 from this
     *    public endpoint, so an attacker can't distinguish "no such child"
     *    from "wrong code".
     *  - **Timing oracle**: every miss path performs a constant-cost
     *    argon2id verify against a dummy hash so wall-clock duration is
     *    constant across (no-such-child / no-active-code / bad-code).
     *
     * **Deliberately does NOT enforce the PIN lockout.** The reset code IS
     * the recovery path out of a lockout; gating it on the same lockout
     * would brick the child. Brute-force defense for reset codes is the
     * per-IP rate limit (10 / 15 min on the route), 24 h TTL, and 10^6
     * entropy. If that proves inadequate against a botnet-class attacker
     * rotating IPs, the right next step is a SEPARATE reset-attempt counter
     * (not coupling to `failedPinAttempts`).
     *
     * On success: PIN replaced, attempt counter + any stale lockout
     * cleared, reset code burned.
     */
    async usePinReset(
      childId: string,
      resetCode: string,
      newPin: string,
      ctx: AuthContext,
    ): Promise<void> {
      const row = await repo.findById(childId);

      // Miss path 1: child does not exist. Equalise timing with a dummy
      // verify, then throw the SAME error as the bad-code path.
      if (!row) {
        await hasher.verify(DUMMY_ARGON2_HASH, resetCode);
        await audit.write({
          kind: 'pin_reset_used',
          outcome: 'failure',
          familyId: null,
          actor: `child:${childId}`,
          reason: 'no_such_child',
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        throw new InvalidPinResetCodeError('Invalid or expired reset code');
      }

      const hash = row.pinResetCodeHash;
      const expiresAt = row.pinResetCodeExpiresAt;
      const codeMissingOrExpired =
        !hash || !expiresAt || new Date(expiresAt) <= new Date();

      // Miss path 2: no outstanding code (or expired). Dummy verify for
      // timing equality, then the SAME error as miss path 1.
      if (codeMissingOrExpired || !hash) {
        await hasher.verify(DUMMY_ARGON2_HASH, resetCode);
        await audit.write({
          kind: 'pin_reset_used',
          outcome: 'failure',
          familyId: row.familyId,
          actor: `child:${childId}`,
          reason: 'expired_or_missing',
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        throw new InvalidPinResetCodeError('Invalid or expired reset code');
      }

      const ok = await hasher.verify(hash, resetCode);
      if (!ok) {
        await audit.write({
          kind: 'pin_reset_used',
          outcome: 'failure',
          familyId: row.familyId,
          actor: `child:${childId}`,
          reason: 'bad_code',
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        throw new InvalidPinResetCodeError('Invalid or expired reset code');
      }

      // Success path.
      const pinHash = await hasher.hash(newPin);
      const updated = await repo.update(childId, {
        pinHash,
        pinRequired: true,
        failedPinAttempts: 0,
        lockedUntil: null,
        pinResetCodeHash: null,
        pinResetCodeExpiresAt: null,
      });
      if (!updated) {
        // Row vanished between the findById and the update — refuse to
        // emit a success audit row that lies.
        throw new InvalidPinResetCodeError('Invalid or expired reset code');
      }
      await audit.write({
        kind: 'pin_reset_used',
        outcome: 'success',
        familyId: row.familyId,
        actor: `child:${childId}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    },

    /**
     * Verify the child's PIN. Called from the device-login flow (Phase 1f).
     *
     * Lockout policy (5 consecutive failures → 15-minute lock):
     *
     *  - **Pre-increment under a transaction** before doing the slow argon2
     *    verify. This closes a TOCTOU race: N concurrent wrong-PIN requests
     *    against the same child would otherwise all read the same baseline
     *    counter, decide the same `nextAttempts`, and write the same value
     *    — letting an attacker get N free guesses per lockout-window tick.
     *    Pre-increment inside `db.transaction` serialises the counter bump
     *    so every concurrent request bumps it exactly once.
     *  - On verify failure: nothing further to write — the pre-increment
     *    already stuck.
     *  - On verify success: clear the counter + any stale lockout.
     *  - `pin_locked` audit kind is reserved for the **transition** (the
     *    request that trips the threshold). Subsequent attempts while
     *    already locked emit `pin_failure / reason: already_locked` so the
     *    dashboard counts lockouts, not taps.
     */
    async verifyPin(
      childId: string,
      pin: string,
      ctx: AuthContext,
    ): Promise<ChildRow> {
      type PreFlight =
        | { kind: 'not_found' }
        | { kind: 'no_pin'; row: ChildRow }
        | { kind: 'locked'; row: ChildRow; lockedUntil: string }
        | { kind: 'pre_incremented'; row: ChildRow; willLock: boolean };

      const preFlight: PreFlight = await opts.db.transaction((tx) => {
        const rows = tx
          .select()
          .from(childrenTable)
          .where(eq(childrenTable.id, childId))
          .limit(1)
          .all();
        const r = rows[0];
        if (!r) return { kind: 'not_found' };
        if (!r.pinRequired || !r.pinHash) return { kind: 'no_pin', row: r };
        if (r.lockedUntil && new Date(r.lockedUntil) > new Date()) {
          return { kind: 'locked', row: r, lockedUntil: r.lockedUntil };
        }
        const nextAttempts = r.failedPinAttempts + 1;
        const willLock = nextAttempts >= LOCKOUT_THRESHOLD;
        const newLockedUntil = willLock
          ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()
          : null;
        tx.update(childrenTable)
          .set({
            failedPinAttempts: willLock ? 0 : nextAttempts,
            lockedUntil: newLockedUntil,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(childrenTable.id, childId))
          .run();
        return { kind: 'pre_incremented', row: r, willLock };
      });

      if (preFlight.kind === 'not_found') {
        throw new ChildNotFoundError('Child not found');
      }
      if (preFlight.kind === 'no_pin') {
        throw new ChildPinNotSetError('Child has no PIN set');
      }
      if (preFlight.kind === 'locked') {
        const retryAfterSeconds = Math.ceil(
          (new Date(preFlight.lockedUntil).getTime() - Date.now()) / 1000,
        );
        await audit.write({
          kind: 'pin_failure',
          outcome: 'failure',
          familyId: preFlight.row.familyId,
          actor: `child:${childId}`,
          reason: 'already_locked',
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        throw new ChildLockedError('Child PIN is locked', retryAfterSeconds);
      }

      const { row, willLock } = preFlight;
      // pinHash is guaranteed non-null by the no_pin check inside the txn.
      const ok = await hasher.verify(row.pinHash!, pin);
      if (!ok) {
        await audit.write({
          kind: willLock ? 'pin_locked' : 'pin_failure',
          outcome: 'failure',
          familyId: row.familyId,
          actor: `child:${childId}`,
          reason: willLock
            ? 'threshold_reached'
            : `attempt:${row.failedPinAttempts + 1}`,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        if (willLock) {
          throw new ChildLockedError(
            'Child PIN is locked',
            Math.ceil(LOCKOUT_DURATION_MS / 1000),
          );
        }
        throw new InvalidChildPinError('Invalid PIN');
      }

      // Success — clear the pre-increment + any stale lockout.
      await repo.update(childId, { failedPinAttempts: 0, lockedUntil: null });
      return { ...row, failedPinAttempts: 0, lockedUntil: null };
    },
  };
}


export type ChildrenService = ReturnType<typeof createChildrenService>;

export const LOCKOUT_CONSTANTS = {
  LOCKOUT_THRESHOLD,
  LOCKOUT_DURATION_MS,
  RESET_CODE_TTL_MS,
} as const;
