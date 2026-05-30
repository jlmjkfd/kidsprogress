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
import {
  attachChildRequestSchema,
  authTokensSchema,
  childMeSchema,
  childLoginRequestSchema,
  childLoginResponseSchema,
  deviceLookupRequestSchema,
  deviceLookupResponseSchema,
  deviceSchema,
  devicesListResponseSchema,
  registerDeviceRequestSchema,
  registerDeviceResponseSchema,
} from '@kidsprogress/shared';
import type { Database_ } from '@kidsprogress/db';
import type { AppConfig } from '../../config.js';
import { createDevicesService, type DevicesService } from './devices.service.js';

type ZodFastify = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  ZodTypeProvider
>;

const CHILD_REFRESH_COOKIE_NAME = 'kp_child_refresh';
const CHILD_REFRESH_COOKIE_PATH = '/api';

function setChildRefreshCookie(
  reply: FastifyReply,
  refreshToken: string,
  refreshExpiresAt: string,
  config: AppConfig,
): void {
  reply.setCookie(CHILD_REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.NODE_ENV === 'production',
    path: CHILD_REFRESH_COOKIE_PATH,
    expires: new Date(refreshExpiresAt),
  });
}

function ctxOf(req: FastifyRequest): { ip?: string; userAgent?: string } {
  const ua = req.headers['user-agent'];
  return {
    ...(req.ip ? { ip: req.ip } : {}),
    ...(typeof ua === 'string' ? { userAgent: ua } : {}),
  };
}

const deviceIdParamSchema = z.object({ id: z.string().uuid() });
const deviceChildParamSchema = z.object({
  id: z.string().uuid(),
  childId: z.string().uuid(),
});

// Re-derive the auth response shape locally — keeps cookie-bound flow self-documenting.
const childLoginJsonResponseSchema = z.object({
  child: childMeSchema,
  tokens: authTokensSchema,
});
void childLoginResponseSchema;

export interface DevicesRoutesDeps {
  db: Database_;
  config: AppConfig;
  service?: DevicesService;
}

export async function registerDevicesRoutes(
  app: ZodFastify,
  deps: DevicesRoutesDeps,
): Promise<void> {
  const service =
    deps.service ?? createDevicesService({ db: deps.db, jwt: app.jwt, config: deps.config });

  const tightRateLimit = { rateLimit: { max: 5, timeWindow: '1 minute' } };
  const lookupRateLimit = { rateLimit: { max: 30, timeWindow: '1 minute' } };
  const childLoginRateLimit = { rateLimit: { max: 10, timeWindow: '1 minute' } };

  // ── parent-only: device CRUD ─────────────────────────────────────────
  app.get(
    '/',
    {
      schema: { response: { 200: devicesListResponseSchema } },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const devices = await service.list(req.currentUser!.familyId);
      return reply.send({ devices });
    },
  );

  app.post(
    '/register',
    {
      schema: {
        body: registerDeviceRequestSchema,
        response: { 201: registerDeviceResponseSchema },
      },
      config: { role: 'parent', ...tightRateLimit },
    },
    async (req, reply) => {
      const result = await service.register(
        req.currentUser!.familyId,
        req.currentUser!.id,
        req.body,
        ctxOf(req),
      );
      return reply.code(201).send(result);
    },
  );

  app.post(
    '/:id/revoke',
    {
      schema: { params: deviceIdParamSchema, response: { 204: z.null() } },
      config: { role: 'parent', ...tightRateLimit },
    },
    async (req, reply) => {
      await service.revoke(
        req.params.id,
        req.currentUser!.familyId,
        req.currentUser!.id,
        ctxOf(req),
      );
      return reply.code(204).send(null);
    },
  );

  app.post(
    '/:id/children',
    {
      schema: {
        params: deviceIdParamSchema,
        body: attachChildRequestSchema,
        response: { 200: deviceSchema },
      },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const device = await service.attachChild(
        req.params.id,
        req.body.childId,
        req.currentUser!.familyId,
        req.currentUser!.id,
        ctxOf(req),
      );
      return reply.send(device);
    },
  );

  app.delete(
    '/:id/children/:childId',
    {
      schema: { params: deviceChildParamSchema, response: { 200: deviceSchema } },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const device = await service.detachChild(
        req.params.id,
        req.params.childId,
        req.currentUser!.familyId,
        req.currentUser!.id,
        ctxOf(req),
      );
      return reply.send(device);
    },
  );

  // ── public: device-bound child login flow ────────────────────────────
  app.post(
    '/lookup',
    {
      schema: {
        body: deviceLookupRequestSchema,
        response: { 200: deviceLookupResponseSchema },
      },
      config: { public: true, ...lookupRateLimit },
    },
    async (req, reply) => {
      const result = await service.lookupByToken(req.body.deviceToken, ctxOf(req));
      return reply.send(result);
    },
  );

  app.post(
    '/child-login',
    {
      schema: {
        body: childLoginRequestSchema,
        response: { 200: childLoginJsonResponseSchema },
      },
      config: { public: true, ...childLoginRateLimit },
    },
    async (req, reply) => {
      const { child, tokens } = await service.childLogin(req.body, ctxOf(req));
      setChildRefreshCookie(reply, tokens.refreshToken, tokens.refreshExpiresAt, deps.config);
      return reply.send({
        child,
        tokens: { accessToken: tokens.accessToken, expiresAt: tokens.accessExpiresAt },
      });
    },
  );
}
