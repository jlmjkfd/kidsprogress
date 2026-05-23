import type { FastifyReply } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  loginRequestSchema,
  parentPinVerifyRequestSchema,
  registerRequestSchema,
  setPinRequestSchema,
  type MeResponse,
} from '@kidsprogress/shared';
import { users, type Database_, type UserRow } from '@kidsprogress/db';
import type { AppConfig } from '../../config.js';
import { createAuthService } from './auth.service.js';
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  InvalidPinError,
  InvalidRefreshTokenError,
  PinNotSetError,
} from './auth.errors.js';
import { parseDurationSeconds } from '../../lib/tokens.js';

const REFRESH_COOKIE = 'kp_refresh';

function toMe(user: UserRow): MeResponse {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    hasPin: user.pinHash !== null && user.pinHash !== '',
  };
}

function setRefreshCookie(
  reply: FastifyReply,
  token: string,
  ttlSeconds: number,
  config: AppConfig,
) {
  void reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.NODE_ENV === 'production',
    path: '/api/auth',
    maxAge: ttlSeconds,
  });
}

function clearRefreshCookie(reply: FastifyReply, config: AppConfig) {
  void reply.clearCookie(REFRESH_COOKIE, {
    path: '/api/auth',
    sameSite: 'strict',
    secure: config.NODE_ENV === 'production',
  });
}

export const authRoutes: FastifyPluginAsyncZod<{
  db: Database_;
  config: AppConfig;
}> = async function (app, opts) {
  const auth = createAuthService({ db: opts.db, jwt: app.jwt, config: opts.config });
  const refreshTtl = parseDurationSeconds(opts.config.JWT_REFRESH_TTL);

  const tightRateLimit = { rateLimit: { max: 5, timeWindow: '1 minute' } };

  // ── POST /api/auth/register ────────────────────────────────────────────
  app.post(
    '/api/auth/register',
    {
      config: { public: true, ...tightRateLimit },
      schema: { body: registerRequestSchema },
    },
    async (request, reply) => {
      const ctx = { ip: request.ip, userAgent: request.headers['user-agent'] };
      try {
        const { user, tokens } = await auth.register(request.body, ctx);
        setRefreshCookie(reply, tokens.refreshToken, refreshTtl, opts.config);
        return {
          user: toMe(user),
          tokens: { accessToken: tokens.accessToken, expiresAt: tokens.accessExpiresAt },
        };
      } catch (err) {
        if (err instanceof EmailAlreadyRegisteredError) {
          return reply.code(409).send({ error: 'EmailAlreadyRegistered' });
        }
        throw err;
      }
    },
  );

  // ── POST /api/auth/login ───────────────────────────────────────────────
  app.post(
    '/api/auth/login',
    {
      config: { public: true, ...tightRateLimit },
      schema: { body: loginRequestSchema },
    },
    async (request, reply) => {
      const ctx = { ip: request.ip, userAgent: request.headers['user-agent'] };
      try {
        const { user, tokens } = await auth.login(request.body, ctx);
        setRefreshCookie(reply, tokens.refreshToken, refreshTtl, opts.config);
        return {
          user: toMe(user),
          tokens: { accessToken: tokens.accessToken, expiresAt: tokens.accessExpiresAt },
        };
      } catch (err) {
        if (err instanceof InvalidCredentialsError) {
          return reply.code(401).send({ error: 'InvalidCredentials' });
        }
        throw err;
      }
    },
  );

  // ── POST /api/auth/refresh ─────────────────────────────────────────────
  app.post(
    '/api/auth/refresh',
    {
      config: { public: true, rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const token = request.cookies?.[REFRESH_COOKIE];
      if (!token) return reply.code(401).send({ error: 'NoRefreshToken' });
      const ctx = { ip: request.ip, userAgent: request.headers['user-agent'] };
      try {
        const { tokens } = await auth.refresh(token, ctx);
        setRefreshCookie(reply, tokens.refreshToken, refreshTtl, opts.config);
        return { accessToken: tokens.accessToken, expiresAt: tokens.accessExpiresAt };
      } catch (err) {
        if (err instanceof InvalidRefreshTokenError) {
          clearRefreshCookie(reply, opts.config);
          return reply.code(401).send({ error: 'InvalidRefreshToken' });
        }
        throw err;
      }
    },
  );

  // ── POST /api/auth/logout ──────────────────────────────────────────────
  app.post('/api/auth/logout', { config: { public: true } }, async (request, reply) => {
    const token = request.cookies?.[REFRESH_COOKIE];
    const ctx = { ip: request.ip, userAgent: request.headers['user-agent'] };
    if (token) await auth.logout(token, ctx);
    clearRefreshCookie(reply, opts.config);
    return reply.code(204).send();
  });

  // ── GET /api/auth/me ───────────────────────────────────────────────────
  app.get('/api/auth/me', async (request, reply) => {
    const id = request.currentUser?.id;
    if (!id) return reply.code(401).send({ error: 'Unauthorized' });
    const rows = await opts.db.select().from(users).where(eq(users.id, id)).limit(1);
    const user = rows[0];
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });
    return toMe(user);
  });

  // ── POST /api/auth/parent-pin (set/replace) ────────────────────────────
  app.post(
    '/api/auth/parent-pin',
    { schema: { body: setPinRequestSchema } },
    async (request, reply) => {
      const id = request.currentUser?.id;
      if (!id) return reply.code(401).send({ error: 'Unauthorized' });
      const ctx = { ip: request.ip, userAgent: request.headers['user-agent'] };
      await auth.setPin(id, request.body.pin, ctx);
      return reply.code(204).send();
    },
  );

  // ── POST /api/auth/parent-pin/verify ───────────────────────────────────
  app.post(
    '/api/auth/parent-pin/verify',
    {
      config: tightRateLimit,
      schema: { body: parentPinVerifyRequestSchema },
    },
    async (request, reply) => {
      const id = request.currentUser?.id;
      if (!id) return reply.code(401).send({ error: 'Unauthorized' });
      const ctx = { ip: request.ip, userAgent: request.headers['user-agent'] };
      try {
        await auth.verifyPin(id, request.body.pin, ctx);
        return reply.code(204).send();
      } catch (err) {
        if (err instanceof InvalidPinError) return reply.code(401).send({ error: 'InvalidPin' });
        if (err instanceof PinNotSetError) return reply.code(409).send({ error: 'PinNotSet' });
        throw err;
      }
    },
  );

  void z; // re-imported for symmetry with other modules that use it
};
