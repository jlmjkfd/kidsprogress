import { v7 as uuidv7 } from 'uuid';
import type { FastifyInstance } from 'fastify';
import type { ChildRow, Database_, DeviceRow, UserRow } from '@kidsprogress/db';
import { children as childrenTable, users as usersTable } from '@kidsprogress/db';
import { eq } from 'drizzle-orm';
import type { AppConfig } from '../../config.js';
import {
  generateRefreshToken,
  hashToken,
  parseDurationSeconds,
} from '../../lib/tokens.js';
import { createAuditLogger, type AuditLogger } from '../../lib/audit.js';
import type { AccessTokenPayload } from '../../plugins/auth.js';
import {
  createChildrenService,
  toChildDto,
  type ChildrenService,
} from '../children/children.service.js';
import type { ChildRosterCard, Device } from '@kidsprogress/shared';
import { createAuthRepo, type AuthRepo } from '../auth/auth.repo.js';
import { createDevicesRepo, type DevicesRepo } from './devices.repo.js';
import {
  ChildNotAttachedError,
  DeviceNotFoundError,
  DeviceRevokedError,
  InvalidDeviceTokenError,
} from './devices.errors.js';
import { ChildNotFoundError } from '../children/children.errors.js';

export interface AuthContext {
  ip?: string;
  userAgent?: string;
}

export interface IssuedChildTokens {
  accessToken: string;
  accessExpiresAt: string;
  refreshToken: string;
  refreshExpiresAt: string;
}

/** Convert a device row + roster ids to the parent-facing DTO. */
function toDeviceDto(row: DeviceRow, childIds: string[]): Device {
  return {
    id: row.id,
    label: row.label,
    registeredAt: row.registeredAt,
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
    tokenHashPrefix: row.tokenHash.slice(0, 8),
    childIds,
  };
}

function ageBandFromBirthYear(birthYear: number | null): 'younger' | 'older' {
  if (!birthYear) return 'younger';
  const age = new Date().getUTCFullYear() - birthYear;
  return age <= 8 ? 'younger' : 'older';
}

export function createDevicesService(opts: {
  db: Database_;
  jwt: FastifyInstance['jwt'];
  config: AppConfig;
  repo?: DevicesRepo;
  authRepo?: AuthRepo;
  childrenService?: ChildrenService;
  audit?: AuditLogger;
}) {
  const repo = opts.repo ?? createDevicesRepo(opts.db);
  const authRepo = opts.authRepo ?? createAuthRepo(opts.db);
  const childrenService =
    opts.childrenService ?? createChildrenService({ db: opts.db, config: opts.config });
  const audit = opts.audit ?? createAuditLogger(opts.db);

  /** Family-scoped device lookup. Throws DeviceNotFoundError on miss. */
  async function loadDeviceInFamily(deviceId: string, familyId: string): Promise<DeviceRow> {
    const row = await repo.findByIdInFamily(deviceId, familyId);
    if (!row) throw new DeviceNotFoundError('Device not found');
    return row;
  }

  /**
   * Issue child access + refresh tokens. Refresh token is hashed & inserted
   * into the polymorphic `refresh_tokens` table with subjectKind='child'
   * and the bound deviceId.
   */
  async function issueChildTokens(
    child: ChildRow,
    deviceId: string,
  ): Promise<IssuedChildTokens> {
    const payload: AccessTokenPayload = {
      type: 'access',
      role: 'child',
      sub: child.id,
      family: child.familyId,
    };
    const accessToken = opts.jwt.sign(payload, { expiresIn: opts.config.JWT_ACCESS_TTL });
    const accessExpiresAt = new Date(
      Date.now() + parseDurationSeconds(opts.config.JWT_ACCESS_TTL) * 1000,
    ).toISOString();

    const { token: refreshToken, tokenHash: refreshHash } = generateRefreshToken();
    const refreshExpiresAt = new Date(
      Date.now() + parseDurationSeconds(opts.config.JWT_REFRESH_TTL) * 1000,
    ).toISOString();
    await authRepo.insertRefreshToken({
      id: uuidv7(),
      subjectKind: 'child',
      subjectId: child.id,
      deviceId,
      tokenHash: refreshHash,
      expiresAt: refreshExpiresAt,
    });
    return { accessToken, accessExpiresAt, refreshToken, refreshExpiresAt };
  }

  return {
    /**
     * Register a new family device. Returns the parent-facing DTO + the
     * plaintext device token (server stores only its SHA-256 hash).
     *
     * If `childIds` is empty, attach every current family child to the
     * device automatically — the common "trusted family tablet" case.
     */
    async register(
      familyId: string,
      actorUserId: string,
      params: { label: string; childIds: string[] },
      ctx: AuthContext,
    ): Promise<{ device: Device; deviceToken: string }> {
      // Confirm any requested childIds belong to the caller's family.
      const familyChildren = await opts.db
        .select()
        .from(childrenTable)
        .where(eq(childrenTable.familyId, familyId));
      const familyChildIds = new Set(familyChildren.map((c) => c.id));
      for (const cid of params.childIds) {
        if (!familyChildIds.has(cid)) {
          throw new ChildNotFoundError(`Child ${cid} not in family`);
        }
      }

      const { token: deviceToken, tokenHash } = generateRefreshToken();
      const deviceId = uuidv7();
      const deviceRow = await repo.insertDevice({
        id: deviceId,
        familyId,
        tokenHash,
        label: params.label,
      });

      const attachIds = params.childIds.length > 0
        ? params.childIds
        : familyChildren.map((c) => c.id);
      for (const cid of attachIds) {
        await repo.attachChild({ deviceId, childId: cid });
      }

      await audit.write({
        kind: 'device_register',
        outcome: 'success',
        familyId,
        actor: `parent:${actorUserId}`,
        reason: `device:${deviceId}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return { device: toDeviceDto(deviceRow, attachIds), deviceToken };
    },

    async list(familyId: string): Promise<Device[]> {
      const rows = await repo.listByFamily(familyId);
      const out: Device[] = [];
      for (const r of rows) {
        const links = await repo.listChildrenForDevice(r.id);
        out.push(toDeviceDto(r, links.map((l) => l.childId)));
      }
      return out;
    },

    async revoke(
      deviceId: string,
      familyId: string,
      actorUserId: string,
      ctx: AuthContext,
    ): Promise<void> {
      const row = await loadDeviceInFamily(deviceId, familyId);
      if (row.revokedAt) return; // idempotent
      await repo.markRevoked(deviceId);
      // Burn every refresh token bound to this device.
      // (No dedicated repo helper yet; inline the update.)
      const { refreshTokens } = await import('@kidsprogress/db');
      await opts.db
        .update(refreshTokens)
        .set({ revokedAt: new Date().toISOString(), revokedReason: 'device_revoked' })
        .where(eq(refreshTokens.deviceId, deviceId));
      await audit.write({
        kind: 'device_revoke',
        outcome: 'success',
        familyId,
        actor: `parent:${actorUserId}`,
        reason: `device:${deviceId}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    },

    async attachChild(
      deviceId: string,
      childId: string,
      familyId: string,
      actorUserId: string,
      ctx: AuthContext,
    ): Promise<Device> {
      const device = await loadDeviceInFamily(deviceId, familyId);
      // Confirm child belongs to family.
      const [child] = await opts.db
        .select()
        .from(childrenTable)
        .where(eq(childrenTable.id, childId))
        .limit(1);
      if (!child || child.familyId !== familyId) {
        throw new ChildNotFoundError('Child not found');
      }
      await repo.attachChild({ deviceId, childId });
      await audit.write({
        kind: 'device_child_attach',
        outcome: 'success',
        familyId,
        actor: `parent:${actorUserId}`,
        reason: `device:${deviceId} child:${childId}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      const links = await repo.listChildrenForDevice(device.id);
      return toDeviceDto(device, links.map((l) => l.childId));
    },

    async detachChild(
      deviceId: string,
      childId: string,
      familyId: string,
      actorUserId: string,
      ctx: AuthContext,
    ): Promise<Device> {
      const device = await loadDeviceInFamily(deviceId, familyId);
      await repo.detachChild(deviceId, childId);
      await audit.write({
        kind: 'device_child_detach',
        outcome: 'success',
        familyId,
        actor: `parent:${actorUserId}`,
        reason: `device:${deviceId} child:${childId}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      const links = await repo.listChildrenForDevice(device.id);
      return toDeviceDto(device, links.map((l) => l.childId));
    },

    /**
     * Public roster lookup by device token. Returns familyDisplayName + the
     * roster of children this device shows. Revoked device → 410. Unknown
     * token → 401.
     */
    async lookupByToken(
      deviceToken: string,
      ctx: AuthContext,
    ): Promise<{ familyDisplayName: string; children: ChildRosterCard[] }> {
      const tokenHash = hashToken(deviceToken);
      const device = await repo.findByTokenHash(tokenHash);
      if (!device) throw new InvalidDeviceTokenError('Invalid device token');
      if (device.revokedAt) throw new DeviceRevokedError('Device revoked');

      await repo.touchLastUsed(device.id);

      const [parent] = await opts.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.familyId, device.familyId))
        .limit(1);
      const familyDisplayName = parent?.displayName ?? 'Family';

      const links = await repo.listChildrenForDevice(device.id);
      const cards: ChildRosterCard[] = [];
      for (const l of links) {
        const [child] = await opts.db
          .select()
          .from(childrenTable)
          .where(eq(childrenTable.id, l.childId))
          .limit(1);
        if (!child || child.archivedAt) continue;
        cards.push({
          id: child.id,
          displayName: child.displayName,
          avatarKey: child.avatarKey,
          pinRequired: child.pinRequired,
          isLocked: child.lockedUntil ? new Date(child.lockedUntil) > new Date() : false,
        });
      }

      // Do not audit this — it's a high-frequency public endpoint.
      void ctx;
      return { familyDisplayName, children: cards };
    },

    /**
     * Device-bound child login. Verifies device + roster membership + PIN
     * (if required), then issues child access + refresh tokens.
     */
    async childLogin(
      params: { deviceToken: string; childId: string; pin?: string },
      ctx: AuthContext,
    ): Promise<{
      child: { id: string; familyId: string; displayName: string; avatarKey: string; ageBand: 'younger' | 'older' };
      tokens: IssuedChildTokens;
    }> {
      const tokenHash = hashToken(params.deviceToken);
      const device = await repo.findByTokenHash(tokenHash);
      if (!device) throw new InvalidDeviceTokenError('Invalid device token');
      if (device.revokedAt) throw new DeviceRevokedError('Device revoked');

      const attached = await repo.isChildAttached(device.id, params.childId);
      if (!attached) {
        throw new ChildNotAttachedError('Child not on this device');
      }

      let child: ChildRow;
      if (params.pin) {
        child = await childrenService.verifyPin(params.childId, params.pin, ctx);
      } else {
        const row = await childrenService.get(params.childId, device.familyId);
        // get returns a DTO — refetch the row for token issuance.
        const [r] = await opts.db
          .select()
          .from(childrenTable)
          .where(eq(childrenTable.id, params.childId))
          .limit(1);
        if (!r) throw new ChildNotFoundError('Child not found');
        if (r.pinRequired) {
          // PIN required but client omitted it.
          throw new ChildNotAttachedError('PIN required for this child');
        }
        if (r.archivedAt) throw new ChildNotFoundError('Child not found');
        void row;
        child = r;
      }

      const tokens = await issueChildTokens(child, device.id);
      await repo.touchLastUsed(device.id);
      await audit.write({
        kind: 'child_login',
        outcome: 'success',
        familyId: device.familyId,
        actor: `child:${child.id}`,
        reason: `device:${device.id}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return {
        child: {
          id: child.id,
          familyId: child.familyId,
          displayName: child.displayName,
          avatarKey: child.avatarKey,
          ageBand: ageBandFromBirthYear(child.birthYear),
        },
        tokens,
      };
    },

    /** Used by tests + future code to convert a row → DTO without re-querying. */
    toDto: toChildDto,
  };
}

export type DevicesService = ReturnType<typeof createDevicesService>;
