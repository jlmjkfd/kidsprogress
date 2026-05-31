import type {
  FastifyBaseLogger,
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  taskInstances,
  taskTemplates,
  taskAssignments,
  type Database_,
} from '@kidsprogress/db';
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

/**
 * Composite "everything the executor needs" payload. Returns the instance,
 * the template (so the handler kind + config + pluginVersion is visible)
 * and a child-light shape for greetings. Family-scope checked.
 */
const runResponseSchema = z.object({
  instance: instanceResponseSchema.extend({
    effectiveTitle: z.string(),
    effectiveDescription: z.string().nullable(),
  }),
  template: z.object({
    id: z.string().uuid(),
    handlerId: z.string(),
    schemaVersion: z.number().int().positive(),
    pluginVersion: z.number().int().positive(),
    name: z.string(),
    config: z.record(z.unknown()),
  }),
});

const instanceIdParam = z.object({ instanceId: z.string().uuid() });

export interface InstancesRoutesDeps {
  db: Database_;
  service?: InstancesService;
}

export async function registerInstancesRoutes(
  app: ZodFastify,
  deps: InstancesRoutesDeps,
): Promise<void> {
  const service = deps.service ?? createInstancesService({ db: deps.db });

  /**
   * Composite read for the kid's execution surface. Includes everything
   * the executor + handler renderer need to render a single instance,
   * without making the kid client perform N joins.
   */
  app.get(
    '/:instanceId/run',
    {
      schema: { params: instanceIdParam, response: { 200: runResponseSchema } },
      config: { role: ['parent', 'child', 'child-readonly'] },
    },
    async (req, reply) => {
      const [row] = await deps.db
        .select({
          instance: taskInstances,
          template: taskTemplates,
          assignment: taskAssignments,
        })
        .from(taskInstances)
        .innerJoin(taskAssignments, eq(taskAssignments.id, taskInstances.assignmentId))
        .innerJoin(taskTemplates, eq(taskTemplates.id, taskInstances.templateId))
        .where(eq(taskInstances.id, req.params.instanceId))
        .limit(1);
      if (!row) throw app.httpErrors.notFound('Instance not found');
      if (row.assignment.parentId !== req.currentUser!.familyId) {
        throw app.httpErrors.notFound('Instance not found');
      }
      if (
        (req.currentUser!.role === 'child' ||
          req.currentUser!.role === 'child-readonly') &&
        req.currentUser!.id !== row.instance.childId
      ) {
        throw app.httpErrors.notFound('Instance not found');
      }
      return reply.send({
        instance: {
          id: row.instance.id,
          assignmentId: row.instance.assignmentId,
          childId: row.instance.childId,
          status: row.instance.status,
          originalDate: row.instance.originalDate,
          occurrenceDate: row.instance.occurrenceDate,
          startedAt: row.instance.startedAt,
          completedAt: row.instance.completedAt,
          effectiveTitle: row.instance.effectiveTitle,
          effectiveDescription: row.instance.effectiveDescription,
        },
        template: {
          id: row.template.id,
          handlerId: row.template.handlerId,
          schemaVersion: row.template.schemaVersion,
          pluginVersion: row.template.pluginVersion,
          name: row.template.name,
          config: (row.template.config as Record<string, unknown>) ?? {},
        },
      });
    },
  );

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
