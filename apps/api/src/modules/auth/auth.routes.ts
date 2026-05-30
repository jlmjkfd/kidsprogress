import type {
  FastifyBaseLogger,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

type ZodFastify = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  ZodTypeProvider
>;
import {
  loginRequestSchema,
  loginResponseSchema,
  parentMeSchema,
  refreshResponseSchema,
  registerRequestSchema,
  setParentPinRequestSchema,
  verifyParentPinRequestSchema,
  viewAsChildRequestSchema,
  viewAsChildResponseSchema,
} from '@kidsprogress/shared';
import type { Database_, UserRow } from '@kidsprogress/db';
import { eq } from 'drizzle-orm';
import { children as childrenTable, users as usersTable } from '@kidsprogress/db';
import type { AppConfig } from '../../config.js';
import { createAuthService, type AuthService, type IssuedTokens } from './auth.service.js';

/**
 * Refresh tokens are HttpOnly cookies. They never appear in JSON request /
 * response bodies — keeps them out of XSS reach and out of access logs.
 *
 * Cookie path is scoped to `/api/auth` so non-auth routes never see it.
 */
const REFRESH_COOKIE_NAME = 'kp_refresh';
const REFRESH_COOKIE_PATH = '/api/auth';

function setRefreshCookie(reply: FastifyReply, tokens: IssuedTokens, config: AppConfig): void {
  reply.setCookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.NODE_ENV === 'production',
    path: REFRESH_COOKIE_PATH,
    expires: new Date(tokens.refreshExpiresAt),
  });
}

function clearRefreshCookie(reply: FastifyReply, config: AppConfig): void {
  reply.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.NODE_ENV === 'production',
    path: REFRESH_COOKIE_PATH,
  });
}

function ctxOf(req: FastifyRequest): { ip?: string; userAgent?: string } {
  const ua = req.headers['user-agent'];
  return {
    ...(req.ip ? { ip: req.ip } : {}),
    ...(typeof ua === 'string' ? { userAgent: ua } : {}),
  };
}

function toParentMe(u: UserRow): z.infer<typeof parentMeSchema> {
  return {
    id: u.id,
    familyId: u.familyId,
    email: u.email,
    displayName: u.displayName,
    locale: u.locale === 'zh' ? 'zh' : 'en',
    hasParentPortalPin: u.parentPortalPinHash !== null,
  };
}

function ageBandFromBirthYear(birthYear: number | null): 'younger' | 'older' {
  if (!birthYear) return 'younger';
  const age = new Date().getUTCFullYear() - birthYear;
  return age <= 8 ? 'younger' : 'older';
}

export interface AuthRoutesDeps {
  db: Database_;
  config: AppConfig;
  service?: AuthService;
}

export async function registerAuthRoutes(
  app: ZodFastify,
  deps: AuthRoutesDeps,
): Promise<void> {
  const service =
    deps.service ?? createAuthService({ db: deps.db, jwt: app.jwt, config: deps.config });

  // Per-route rate-limit for credential endpoints (5/min/IP). Refresh is a
  // hot path on app foreground, so it gets a looser bucket (60/min).
  const credentialRateLimit = {
    rateLimit: { max: 5, timeWindow: '1 minute' },
  };
  const refreshRateLimit = {
    rateLimit: { max: 60, timeWindow: '1 minute' },
  };

  app.post(
    '/register',
    {
      schema: { body: registerRequestSchema, response: { 201: loginResponseSchema } },
      config: { public: true, ...credentialRateLimit },
    },
    async (req, reply) => {
      const { user, tokens } = await service.register(req.body, ctxOf(req));
      setRefreshCookie(reply, tokens, deps.config);
      return reply.code(201).send({
        user: toParentMe(user),
        tokens: { accessToken: tokens.accessToken, expiresAt: tokens.accessExpiresAt },
      });
    },
  );

  app.post(
    '/login',
    {
      schema: { body: loginRequestSchema, response: { 200: loginResponseSchema } },
      config: { public: true, ...credentialRateLimit },
    },
    async (req, reply) => {
      const { user, tokens } = await service.login(req.body, ctxOf(req));
      setRefreshCookie(reply, tokens, deps.config);
      return reply.send({
        user: toParentMe(user),
        tokens: { accessToken: tokens.accessToken, expiresAt: tokens.accessExpiresAt },
      });
    },
  );

  app.post(
    '/refresh',
    {
      schema: { response: { 200: refreshResponseSchema } },
      config: { public: true, ...refreshRateLimit },
    },
    async (req, reply) => {
      const cookie = req.cookies[REFRESH_COOKIE_NAME];
      if (!cookie) throw app.httpErrors.unauthorized('No refresh token');
      const { tokens } = await service.refresh(cookie, ctxOf(req));
      setRefreshCookie(reply, tokens, deps.config);
      return reply.send({
        accessToken: tokens.accessToken,
        expiresAt: tokens.accessExpiresAt,
      });
    },
  );

  app.post(
    '/logout',
    {
      schema: { response: { 204: z.null() } },
      config: { public: true, ...refreshRateLimit },
    },
    async (req, reply) => {
      const cookie = req.cookies[REFRESH_COOKIE_NAME];
      if (cookie) {
        await service.logout(cookie, ctxOf(req));
      }
      clearRefreshCookie(reply, deps.config);
      return reply.code(204).send(null);
    },
  );

  app.get(
    '/me',
    {
      schema: { response: { 200: parentMeSchema } },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      // currentUser is guaranteed by the auth plugin + role: 'parent' guard.
      const [row] = await deps.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, req.currentUser!.id))
        .limit(1);
      if (!row) throw app.httpErrors.notFound('User not found');
      return reply.send(toParentMe(row));
    },
  );

  app.post(
    '/me/parent-pin',
    {
      schema: { body: setParentPinRequestSchema, response: { 204: z.null() } },
      config: { role: 'parent', ...credentialRateLimit },
    },
    async (req, reply) => {
      await service.setParentPin(req.currentUser!.id, req.body.pin, ctxOf(req));
      return reply.code(204).send(null);
    },
  );

  app.post(
    '/me/parent-pin/verify',
    {
      schema: { body: verifyParentPinRequestSchema, response: { 204: z.null() } },
      config: { role: 'parent', ...credentialRateLimit },
    },
    async (req, reply) => {
      await service.verifyParentPin(req.currentUser!.id, req.body.pin, ctxOf(req));
      return reply.code(204).send(null);
    },
  );

  app.post(
    '/me/view-as-child',
    {
      schema: { body: viewAsChildRequestSchema, response: { 200: viewAsChildResponseSchema } },
      config: { role: 'parent', ...credentialRateLimit },
    },
    async (req, reply) => {
      // Confirm the child belongs to the calling parent's family.
      const [child] = await deps.db
        .select()
        .from(childrenTable)
        .where(eq(childrenTable.id, req.body.childId))
        .limit(1);
      if (!child || child.familyId !== req.currentUser!.familyId) {
        throw app.httpErrors.notFound('Child not found');
      }
      const tokens = await service.viewAsChild(
        req.currentUser!.id,
        req.currentUser!.familyId,
        req.body.childId,
        req.body.parentPin,
        ctxOf(req),
      );
      return reply.send({
        child: {
          id: child.id,
          familyId: child.familyId,
          displayName: child.displayName,
          avatarKey: child.avatarKey,
          ageBand: ageBandFromBirthYear(child.birthYear),
        },
        tokens: { accessToken: tokens.accessToken, expiresAt: tokens.accessExpiresAt },
      });
    },
  );
}
