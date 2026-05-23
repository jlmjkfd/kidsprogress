import type { FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import type { AppConfig } from '../config.js';

declare module 'fastify' {
  interface FastifyContextConfig {
    /** Set `public: true` on a route to opt out of authentication. */
    public?: boolean;
  }
  interface FastifyRequest {
    currentUser?: { id: string; email: string; role: 'parent' | 'child' };
  }
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: 'parent' | 'child';
  type: 'access';
}

function isAccessTokenPayload(p: unknown): p is AccessTokenPayload {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.sub === 'string' &&
    typeof o.email === 'string' &&
    (o.role === 'parent' || o.role === 'child') &&
    o.type === 'access'
  );
}

/**
 * Default-deny auth. Every route requires a valid access token unless it
 * explicitly opts out via `config: { public: true }`. (See audit finding #1
 * — v1 had 5 entire route files with NO auth dependency.)
 */
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
      request.currentUser = { id: payload.sub, email: payload.email, role: payload.role };
    } catch {
      await reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
  });
});
