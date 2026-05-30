import type {
  FastifyBaseLogger,
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Database_ } from '@kidsprogress/db';
import {
  createInstancesService,
  type InstancesService,
} from './instances.service.js';

type ZodFastify = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  ZodTypeProvider
>;

const transitionBodySchema = z.object({
  assignmentId: z.string().uuid(),
  originalDate: z.string().datetime(),
  occurrenceDate: z.string().datetime().optional(),
  action: z.enum(['start', 'complete', 'skip', 'abandon']),
});

const instanceResponseSchema = z.object({
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
  childId: z.string().uuid(),
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped', 'abandoned']),
  originalDate: z.string(),
  occurrenceDate: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export interface InstancesRoutesDeps {
  db: Database_;
  service?: InstancesService;
}

export async function registerInstancesRoutes(
  app: ZodFastify,
  deps: InstancesRoutesDeps,
): Promise<void> {
  const service = deps.service ?? createInstancesService({ db: deps.db });

  app.post(
    '/transition',
    {
      schema: {
        body: transitionBodySchema,
        response: { 200: instanceResponseSchema },
      },
      config: { role: ['parent', 'child'] },
    },
    async (req, reply) => {
      const row = await service.transition({
        assignmentId: req.body.assignmentId,
        originalDate: req.body.originalDate,
        ...(req.body.occurrenceDate ? { occurrenceDate: req.body.occurrenceDate } : {}),
        action: req.body.action,
        callerFamilyId: req.currentUser!.familyId,
        callerRole: req.currentUser!.role,
        callerSubjectId: req.currentUser!.id,
      });
      return reply.send({
        id: row.id,
        assignmentId: row.assignmentId,
        childId: row.childId,
        status: row.status,
        originalDate: row.originalDate,
        occurrenceDate: row.occurrenceDate,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
      });
    },
  );
}
