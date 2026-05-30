import type { FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import type { AppConfig } from '../config.js';

/**
 * Three role-tagged JWTs (v2.5 panel verdict §account):
 *
 *   parent           — full parent-portal access; `sub` is users.id;
 *                      `family` is the family scope.
 *   child            — child-portal access; `sub` is children.id;
 *                      `family` is the family scope.
 *   child-readonly   — parent in "view-as-child" mode; allowed to READ
 *                      child surfaces but every mutation is rejected at
 *                      the route layer with 403. `sub` is the child's id,
 *                      `family` is the family scope, `actorUserId` is the
 *                      parent who issued the view-as.
 *
 * Default-deny preHandler: every route is auth-required unless it
 * explicitly opts out via `config: { public: true }`. Audit-#1 mitigation
 * — never write an authless protected route.
 */

declare module 'fastify' {
  interface FastifyContextConfig {
    /** Set `public: true` to opt this route out of authentication. */
    public?: boolean;
    /**
     * Restrict to a specific role (or list). Routes that don't set this
     * accept any authenticated role.
     */
    role?: AccessRole | AccessRole[];
  }
  interface FastifyRequest {
    currentUser?: CurrentUser;
  }
}

export type AccessRole = 'parent' | 'child' | 'child-readonly';

export interface AccessTokenPayload {
  type: 'access';
  role: AccessRole;
  /** users.id for `parent`; children.id for `child` / `child-readonly`. */
  sub: string;
  /** The user's family-id. Used for blanket family-scope checks. */
  family: string;
  /** For `child-readonly` only — the parent user-id that initiated the view-as. */
  actorUserId?: string;
}

export interface CurrentUser {
  role: AccessRole;
  /** The acting subject's id (users.id or children.id depending on role). */
  id: string;
  familyId: string;
  /** Only present on `child-readonly`. */
  actorUserId?: string;
}

function isAccessTokenPayload(p: unknown): p is AccessTokenPayload {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as Record<string, unknown>;
  return (
    o.type === 'access' &&
    typeof o.sub === 'string' &&
    typeof o.family === 'string' &&
    (o.role === 'parent' || o.role === 'child' || o.role === 'child-readonly')
  );
}

/**
 * Mutation guard. `child-readonly` is allowed on GETs only; every
 * non-safe verb returns 403.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const authPlugin = fp<{ config: AppConfig }>(async function (app, opts) {
  await app.register(fastifyJwt, {
    secret: opts.config.JWT_SECRET,
    sign: { expiresIn: opts.config.JWT_ACCESS_TTL },
    verify: { algorithms: ['HS256'] },
  });

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.routeOptions.config?.public === true) return;

    try {
      const payload = await request.jwtVerify();
      if (!isAccessTokenPayload(payload)) {
        await reply.code(401).send({ error: 'Invalid token' });
        return;
      }
      request.currentUser = {
        role: payload.role,
        id: payload.sub,
        familyId: payload.family,
        ...(payload.actorUserId ? { actorUserId: payload.actorUserId } : {}),
      };
    } catch {
      await reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    // Per-route role restriction.
    const allowed = request.routeOptions.config?.role;
    if (allowed) {
      const allowedArr = Array.isArray(allowed) ? allowed : [allowed];
      if (!allowedArr.includes(request.currentUser.role)) {
        await reply.code(403).send({ error: 'Forbidden' });
        return;
      }
    }

    // child-readonly: never let a mutation through.
    if (request.currentUser.role === 'child-readonly' && !SAFE_METHODS.has(request.method)) {
      await reply.code(403).send({ error: 'ViewAsChildIsReadOnly' });
      return;
    }
  });
});
