import type {
  FastifyBaseLogger,
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  saveSessionProgressRequestSchema,
  taskSessionSchema,
} from '@kidsprogress/shared';
import type { Database_ } from '@kidsprogress/db';
import {
  createSessionsService,
  type SessionsService,
} from './sessions.service.js';

type ZodFastify = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  ZodTypeProvider
>;

const instanceIdParam = z.object({ instanceId: z.string().uuid() });

export interface SessionsRoutesDeps {
  db: Database_;
  service?: SessionsService;
}

export async function registerSessionsRoutes(
  app: ZodFastify,
  deps: SessionsRoutesDeps,
): Promise<void> {
  const service = deps.service ?? createSessionsService({ db: deps.db });

  /** Upsert the active session for an instance. */
  app.put(
    '/:instanceId/session',
    {
      schema: {
        params: instanceIdParam,
        body: saveSessionProgressRequestSchema,
        response: { 200: taskSessionSchema },
      },
      config: { role: ['parent', 'child'] },
    },
    async (req, reply) => {
      const row = await service.saveProgress({
        instanceId: req.params.instanceId,
        pluginVersion: req.body.pluginVersion,
        progressState: req.body.progressState,
        callerRole: req.currentUser!.role,
        callerSubjectId: req.currentUser!.id,
        callerFamilyId: req.currentUser!.familyId,
      });
      // `progressState` round-trips as JSON; Drizzle returns it parsed.
      return reply.send({
        id: row.id,
        instanceId: row.instanceId,
        childId: row.childId,
        pluginVersion: row.pluginVersion,
        progressState: row.progressState as never,
        lastSavedAt: row.lastSavedAt,
        completedAt: row.completedAt,
        createdAt: row.createdAt,
      });
    },
  );

  /** Read the active session (resume after refresh). */
  app.get(
    '/:instanceId/session',
    {
      schema: {
        params: instanceIdParam,
        response: { 200: taskSessionSchema.nullable() },
      },
      config: { role: ['parent', 'child', 'child-readonly'] },
    },
    async (req, reply) => {
      const row = await service.getActive({
        instanceId: req.params.instanceId,
        callerRole: req.currentUser!.role,
        callerSubjectId: req.currentUser!.id,
        callerFamilyId: req.currentUser!.familyId,
      });
      if (!row) return reply.send(null);
      return reply.send({
        id: row.id,
        instanceId: row.instanceId,
        childId: row.childId,
        pluginVersion: row.pluginVersion,
        progressState: row.progressState as never,
        lastSavedAt: row.lastSavedAt,
        completedAt: row.completedAt,
        createdAt: row.createdAt,
      });
    },
  );
}
