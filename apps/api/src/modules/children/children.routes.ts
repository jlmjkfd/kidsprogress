import type {
  FastifyBaseLogger,
  FastifyInstance,
  FastifyRequest,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  childSchema,
  childrenListResponseSchema,
  createChildRequestSchema,
  issueChildPinResetResponseSchema,
  setChildPinRequestSchema,
  updateChildRequestSchema,
  useChildPinResetRequestSchema,
} from '@kidsprogress/shared';
import type { Database_ } from '@kidsprogress/db';
import type { AppConfig } from '../../config.js';
import { createChildrenService, type ChildrenService } from './children.service.js';

type ZodFastify = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  ZodTypeProvider
>;

function ctxOf(req: FastifyRequest): { ip?: string; userAgent?: string } {
  const ua = req.headers['user-agent'];
  return {
    ...(req.ip ? { ip: req.ip } : {}),
    ...(typeof ua === 'string' ? { userAgent: ua } : {}),
  };
}

const childIdParamSchema = z.object({ id: z.string().uuid() });

export interface ChildrenRoutesDeps {
  db: Database_;
  config: AppConfig;
  service?: ChildrenService;
}

export async function registerChildrenRoutes(
  app: ZodFastify,
  deps: ChildrenRoutesDeps,
): Promise<void> {
  const service =
    deps.service ?? createChildrenService({ db: deps.db, config: deps.config });

  // Sensitive surfaces (PIN, reset code) get the same 5/min bucket as parent
  // credential endpoints. The public use-reset endpoint is tighter (10/15min).
  const sensitiveRateLimit = {
    rateLimit: { max: 5, timeWindow: '1 minute' },
  };
  const useResetRateLimit = {
    rateLimit: { max: 10, timeWindow: '15 minutes' },
  };

  app.get(
    '/',
    {
      schema: { response: { 200: childrenListResponseSchema } },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const children = await service.list(req.currentUser!.familyId);
      return reply.send({ children });
    },
  );

  app.post(
    '/',
    {
      schema: { body: createChildRequestSchema, response: { 201: childSchema } },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const child = await service.create(
        req.currentUser!.familyId,
        req.body,
        req.currentUser!.id,
        ctxOf(req),
      );
      return reply.code(201).send(child);
    },
  );

  app.get(
    '/:id',
    {
      schema: { params: childIdParamSchema, response: { 200: childSchema } },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const child = await service.get(req.params.id, req.currentUser!.familyId);
      return reply.send(child);
    },
  );

  app.patch(
    '/:id',
    {
      schema: {
        params: childIdParamSchema,
        body: updateChildRequestSchema,
        response: { 200: childSchema },
      },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const child = await service.update(
        req.params.id,
        req.currentUser!.familyId,
        req.body,
        req.currentUser!.id,
        ctxOf(req),
      );
      return reply.send(child);
    },
  );

  app.post(
    '/:id/archive',
    {
      schema: { params: childIdParamSchema, response: { 200: childSchema } },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const child = await service.archive(
        req.params.id,
        req.currentUser!.familyId,
        req.currentUser!.id,
        ctxOf(req),
      );
      return reply.send(child);
    },
  );

  app.post(
    '/:id/restore',
    {
      schema: { params: childIdParamSchema, response: { 200: childSchema } },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const child = await service.restore(
        req.params.id,
        req.currentUser!.familyId,
        req.currentUser!.id,
        ctxOf(req),
      );
      return reply.send(child);
    },
  );

  app.post(
    '/:id/pin',
    {
      schema: {
        params: childIdParamSchema,
        body: setChildPinRequestSchema,
        response: { 200: childSchema },
      },
      config: { role: 'parent', ...sensitiveRateLimit },
    },
    async (req, reply) => {
      const child = await service.setPin(
        req.params.id,
        req.currentUser!.familyId,
        req.body.pin,
        req.currentUser!.id,
        ctxOf(req),
      );
      return reply.send(child);
    },
  );

  app.delete(
    '/:id/pin',
    {
      schema: { params: childIdParamSchema, response: { 200: childSchema } },
      config: { role: 'parent', ...sensitiveRateLimit },
    },
    async (req, reply) => {
      const child = await service.clearPin(
        req.params.id,
        req.currentUser!.familyId,
        req.currentUser!.id,
        ctxOf(req),
      );
      return reply.send(child);
    },
  );

  app.post(
    '/:id/pin/issue-reset',
    {
      schema: {
        params: childIdParamSchema,
        response: { 200: issueChildPinResetResponseSchema },
      },
      config: { role: 'parent', ...sensitiveRateLimit },
    },
    async (req, reply) => {
      const result = await service.issuePinReset(
        req.params.id,
        req.currentUser!.familyId,
        req.currentUser!.id,
        ctxOf(req),
      );
      return reply.send(result);
    },
  );

  /**
   * Public endpoint — the kid at the device uses the parent-issued reset
   * code to set a new PIN. No auth required; tight per-IP rate limit.
   *
   * Body carries `childId` itself; we don't put it in the URL so the public
   * surface doesn't enumerate child ids via 401/404 differences.
   */
  app.post(
    '/pin/use-reset',
    {
      schema: { body: useChildPinResetRequestSchema, response: { 204: z.null() } },
      config: { public: true, ...useResetRateLimit },
    },
    async (req, reply) => {
      await service.usePinReset(
        req.body.childId,
        req.body.resetCode,
        req.body.newPin,
        ctxOf(req),
      );
      return reply.code(204).send(null);
    },
  );
}
