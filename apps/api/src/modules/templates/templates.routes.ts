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
  createTaskTemplateRequestSchema,
  taskTemplateSchema,
  updateTaskTemplateRequestSchema,
} from '@kidsprogress/shared';
import type { Database_ } from '@kidsprogress/db';
import { createTemplatesService, type TemplatesService } from './templates.service.js';

type ZodFastify = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  ZodTypeProvider
>;

const templateIdParamSchema = z.object({ id: z.string().uuid() });
const listTemplatesResponseSchema = z.object({ templates: z.array(taskTemplateSchema) });

export interface TemplatesRoutesDeps {
  db: Database_;
  service?: TemplatesService;
}

export async function registerTemplatesRoutes(
  app: ZodFastify,
  deps: TemplatesRoutesDeps,
): Promise<void> {
  const service = deps.service ?? createTemplatesService({ db: deps.db });

  app.get(
    '/',
    {
      schema: { response: { 200: listTemplatesResponseSchema } },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const templates = await service.list(req.currentUser!.id);
      return reply.send({ templates });
    },
  );

  app.post(
    '/',
    {
      schema: {
        body: createTaskTemplateRequestSchema,
        response: { 201: taskTemplateSchema },
      },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const created = await service.create(req.currentUser!.id, req.body);
      return reply.code(201).send(created);
    },
  );

  app.get(
    '/:id',
    {
      schema: { params: templateIdParamSchema, response: { 200: taskTemplateSchema } },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const template = await service.get(req.params.id, req.currentUser!.id);
      return reply.send(template);
    },
  );

  app.patch(
    '/:id',
    {
      schema: {
        params: templateIdParamSchema,
        body: updateTaskTemplateRequestSchema,
        response: { 200: taskTemplateSchema },
      },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const updated = await service.update(req.params.id, req.currentUser!.id, req.body);
      return reply.send(updated);
    },
  );

  app.post(
    '/:id/archive',
    {
      schema: { params: templateIdParamSchema, response: { 200: taskTemplateSchema } },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const archived = await service.archive(req.params.id, req.currentUser!.id);
      return reply.send(archived);
    },
  );

  app.post(
    '/:id/restore',
    {
      schema: { params: templateIdParamSchema, response: { 200: taskTemplateSchema } },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const restored = await service.restore(req.params.id, req.currentUser!.id);
      return reply.send(restored);
    },
  );
}
