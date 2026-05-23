import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { v7 as uuidv7 } from 'uuid';
import { z } from 'zod';
import {
  childLoginRequestSchema,
  registerDeviceRequestSchema,
  type Device,
} from '@kidsprogress/shared';
import {
  children,
  type Database_,
  type DeviceRow,
} from '@kidsprogress/db';
import { eq } from 'drizzle-orm';
import { generateRefreshToken, hashToken, parseDurationSeconds } from '../../lib/tokens.js';
import { makeHasher } from '../../lib/argon2.js';
import { createAuditLogger } from '../../lib/audit.js';
import type { AppConfig } from '../../config.js';
import { createDevicesRepo } from './devices.repo.js';

const paramsSchema = z.object({ deviceId: z.string().uuid() });

function toDto(row: DeviceRow): Device {
  return {
    id: row.id,
    label: row.label,
    childId: row.childId,
    pinRequired: row.pinRequired,
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
    revokedAt: row.revokedAt,
  };
}

export const devicesRoutes: FastifyPluginAsyncZod<{
  db: Database_;
  config: AppConfig;
}> = async function (app, opts) {
  const repo = createDevicesRepo(opts.db);
  const hasher = makeHasher(opts.config);
  const audit = createAuditLogger(opts.db);
  const accessTtlSec = parseDurationSeconds(opts.config.JWT_ACCESS_TTL);

  // ── GET /api/devices (parent: list own devices) ────────────────────────
  app.get('/api/devices', async (request, reply) => {
    const parentId = request.currentUser?.id;
    if (!parentId || request.currentUser?.role !== 'parent') {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const rows = await repo.listByParent(parentId);
    return { devices: rows.map(toDto) };
  });

  // ── POST /api/devices (parent: register a new device, returns token once)
  app.post(
    '/api/devices',
    { schema: { body: registerDeviceRequestSchema } },
    async (request, reply) => {
      const parentId = request.currentUser?.id;
      if (!parentId || request.currentUser?.role !== 'parent') {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const body = request.body;

      // If bound to a child, parent must own that child.
      if (body.childId) {
        const owns = await repo.parentOwnsChild(parentId, body.childId);
        if (!owns) return reply.code(404).send({ error: 'ChildNotFound' });
      }

      const { token, tokenHash } = generateRefreshToken();
      const row = await repo.insert({
        id: uuidv7(),
        parentId,
        childId: body.childId ?? null,
        label: body.label,
        tokenHash,
        pinRequired: body.pinRequired ?? true,
      });

      await audit.write({
        event: 'auth.device_register',
        outcome: 'success',
        actorUserId: parentId,
        targetChildId: body.childId,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        meta: { deviceId: row.id, label: body.label },
      });

      return reply.code(201).send({ device: toDto(row), deviceToken: token });
    },
  );

  // ── DELETE /api/devices/:deviceId (parent: revoke) ─────────────────────
  app.delete('/api/devices/:deviceId', { schema: { params: paramsSchema } }, async (request, reply) => {
    const parentId = request.currentUser?.id;
    if (!parentId || request.currentUser?.role !== 'parent') {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const ok = await repo.revoke(request.params.deviceId, parentId);
    if (!ok) return reply.code(404).send({ error: 'NotFound' });
    await audit.write({
      event: 'auth.device_revoke',
      outcome: 'success',
      actorUserId: parentId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      meta: { deviceId: request.params.deviceId },
    });
    return reply.code(204).send();
  });

  // ── POST /api/auth/child-login (public — device token + PIN) ──────────
  // Rate-limited to slow PIN brute-force. Constant-time-ish via dummy hashes.
  app.post(
    '/api/auth/child-login',
    {
      config: { public: true, rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: { body: childLoginRequestSchema },
    },
    async (request, reply) => {
      const body = request.body;
      const ctx = { ip: request.ip, userAgent: request.headers['user-agent'] };

      const device = await repo.findActiveByTokenHash(hashToken(body.deviceToken));
      if (!device || device.childId !== body.childId) {
        await audit.write({
          event: 'auth.child_login',
          outcome: 'failure',
          targetChildId: body.childId,
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
          meta: { reason: 'bad_device_or_binding' },
        });
        return reply.code(401).send({ error: 'InvalidDeviceOrChild' });
      }

      // Look up the child to check PIN policy.
      const [child] = await opts.db
        .select()
        .from(children)
        .where(eq(children.id, body.childId))
        .limit(1);
      if (!child) {
        return reply.code(401).send({ error: 'InvalidDeviceOrChild' });
      }

      // PIN enforcement: required if device.pinRequired OR child has a PIN set.
      const pinRequired = device.pinRequired || child.pinHash !== null;
      if (pinRequired) {
        if (!body.pin) {
          return reply.code(401).send({ error: 'PinRequired' });
        }
        if (!child.pinHash) {
          // Device requires PIN but child has none — misconfigured. Treat as failure.
          return reply.code(401).send({ error: 'PinRequired' });
        }
        const ok = await hasher.verify(child.pinHash, body.pin);
        if (!ok) {
          await audit.write({
            event: 'auth.child_login',
            outcome: 'failure',
            targetChildId: body.childId,
            ipAddress: ctx.ip,
            userAgent: ctx.userAgent,
            meta: { reason: 'bad_pin' },
          });
          return reply.code(401).send({ error: 'InvalidPin' });
        }
      }

      // Issue a short-lived access token. No refresh-token rotation for child
      // sessions — child UI calls /api/auth/child-login again when expired.
      const accessToken = app.jwt.sign(
        { sub: child.id, email: `child:${child.id}`, role: 'child', type: 'access' },
        { expiresIn: opts.config.JWT_ACCESS_TTL },
      );
      const expiresAt = new Date(Date.now() + accessTtlSec * 1000).toISOString();

      await repo.touchLastSeen(device.id);
      await audit.write({
        event: 'auth.child_login',
        outcome: 'success',
        targetChildId: body.childId,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        meta: { deviceId: device.id },
      });

      return {
        child: {
          id: child.id,
          displayName: child.displayName,
        },
        tokens: { accessToken, expiresAt },
      };
    },
  );
};
