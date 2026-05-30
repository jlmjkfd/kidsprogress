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
  createTaskAssignmentRequestSchema,
  taskAssignmentSchema,
} from '@kidsprogress/shared';
import type { Database_ } from '@kidsprogress/db';
import {
  createAssignmentsService,
  type AssignmentsService,
} from './assignments.service.js';

type ZodFastify = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  ZodTypeProvider
>;

const assignmentIdParam = z.object({ id: z.string().uuid() });
const childIdQuery = z.object({ childId: z.string().uuid().optional() });
const listResponseSchema = z.object({ assignments: z.array(taskAssignmentSchema) });

export interface AssignmentsRoutesDeps {
  db: Database_;
  service?: AssignmentsService;
}

export async function registerAssignmentsRoutes(
  app: ZodFastify,
  deps: AssignmentsRoutesDeps,
): Promise<void> {
  const service = deps.service ?? createAssignmentsService({ db: deps.db });

  app.get(
    '/',
    {
      schema: { querystring: childIdQuery, response: { 200: listResponseSchema } },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const list = req.query.childId
        ? await service.listForChild(req.query.childId)
        : await service.listForParent(req.currentUser!.id);
      return reply.send({ assignments: list });
    },
  );

  app.post(
    '/',
    {
      schema: {
        body: createTaskAssignmentRequestSchema,
        response: { 201: taskAssignmentSchema },
      },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const created = await service.create(
        req.currentUser!.id,
        req.currentUser!.familyId,
        req.body,
      );
      return reply.code(201).send(created);
    },
  );

  app.get(
    '/:id',
    {
      schema: { params: assignmentIdParam, response: { 200: taskAssignmentSchema } },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const a = await service.get(req.params.id, req.currentUser!.id);
      return reply.send(a);
    },
  );

  app.delete(
    '/:id',
    {
      schema: { params: assignmentIdParam, response: { 204: z.null() } },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      await service.delete(req.params.id, req.currentUser!.id);
      return reply.code(204).send(null);
    },
  );
}
