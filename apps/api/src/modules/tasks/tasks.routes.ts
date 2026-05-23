import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { v7 as uuidv7 } from 'uuid';
import {
  completeTaskRequestSchema,
  createTaskRequestSchema,
  skipTaskRequestSchema,
  taskInstancesQuerySchema,
  taskListQuerySchema,
  taskParamsSchema,
  updateTaskRequestSchema,
  type Task,
} from '@kidsprogress/shared';
import { buildInstancesForChild } from './tasks.instances.js';
import { and, eq } from 'drizzle-orm';
import { children } from '@kidsprogress/db';
import type {
  Database_,
  NewTaskRow,
  TaskRow,
} from '@kidsprogress/db';
import { createTasksRepo } from './tasks.repo.js';
import { createTasksLifecycle, TaskLifecycleError } from './tasks.lifecycle.js';

function toDto(row: TaskRow): Task {
  return {
    id: row.id,
    parentId: row.parentId,
    childId: row.childId,
    collectionId: row.collectionId,
    title: row.title,
    description: row.description,
    kind: row.kind,
    settings: row.settings,
    scheduledDate: row.scheduledDate,
    durationMinutes: row.durationMinutes,
    isRecurring: row.isRecurring,
    recurrenceRule: (row.recurrenceRule as Task['recurrenceRule']) ?? null,
    status: row.status,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const tasksRoutes: FastifyPluginAsyncZod<{ db: Database_ }> = async function (app, opts) {
  const repo = createTasksRepo(opts.db);
  const lifecycle = createTasksLifecycle(opts.db);

  function mapLifecycleError(err: TaskLifecycleError): { status: number; body: unknown } {
    if (err.code === 'NotFound') return { status: 404, body: { error: 'NotFound' } };
    if (err.code === 'RecurringNeedsOccurrence')
      return { status: 400, body: { error: 'RecurringNeedsOccurrence' } };
    return { status: 409, body: { error: err.code } };
  }

  // ── GET /api/tasks/instances ───────────────────────────────────────────
  // Returns virtual task instances (one-off + materialized recurring) for a
  // child + date range. Used by both the parent week view and child portal.
  app.get(
    '/api/tasks/instances',
    { schema: { querystring: taskInstancesQuerySchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user) return reply.code(401).send({ error: 'Unauthorized' });
      const { childId, fromDate, toDate } = request.query;

      if (user.role === 'parent') {
        const owns = await opts.db
          .select({ id: children.id })
          .from(children)
          .where(and(eq(children.id, childId), eq(children.parentId, user.id)))
          .limit(1);
        if (owns.length === 0) return reply.code(404).send({ error: 'NotFound' });
      } else if (user.id !== childId) {
        return reply.code(404).send({ error: 'NotFound' });
      }

      const instances = await buildInstancesForChild(opts.db, childId, fromDate, toDate);
      return { instances };
    },
  );

  // ── GET /api/tasks ─────────────────────────────────────────────────────
  app.get('/api/tasks', { schema: { querystring: taskListQuerySchema } }, async (request, reply) => {
    const user = request.currentUser;
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });

    if (user.role === 'parent') {
      const rows = await repo.listForParent(user.id, request.query);
      return { tasks: rows.map(toDto) };
    }
    // Child role: ignore parent-scoped filters; only the child's own tasks.
    const rows = await repo.listForChild(user.id, request.query);
    return { tasks: rows.map(toDto) };
  });

  // ── POST /api/tasks (parent only) ──────────────────────────────────────
  app.post(
    '/api/tasks',
    { schema: { body: createTaskRequestSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user || user.role !== 'parent') return reply.code(401).send({ error: 'Unauthorized' });

      const body = request.body;
      const owns = await repo.parentOwnsChild(user.id, body.childId);
      if (!owns) return reply.code(404).send({ error: 'ChildNotFound' });

      const row: NewTaskRow = {
        id: uuidv7(),
        parentId: user.id,
        childId: body.childId,
        title: body.title,
        description: body.description ?? null,
        kind: body.kind,
        settings: body.settings ?? null,
        collectionId: body.collectionId ?? null,
        durationMinutes: body.durationMinutes ?? null,
        scheduledDate: body.scheduledDate ?? null,
        isRecurring: body.isRecurring,
        recurrenceRule: body.recurrenceRule ?? null,
        status: 'pending',
      };
      const inserted = await repo.insert(row);
      return reply.code(201).send(toDto(inserted));
    },
  );

  // ── GET /api/tasks/:taskId ─────────────────────────────────────────────
  app.get(
    '/api/tasks/:taskId',
    { schema: { params: taskParamsSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user) return reply.code(401).send({ error: 'Unauthorized' });

      const row =
        user.role === 'parent'
          ? await repo.findByIdForParent(request.params.taskId, user.id)
          : await repo.findByIdForChild(request.params.taskId, user.id);
      if (!row) return reply.code(404).send({ error: 'NotFound' });
      return toDto(row);
    },
  );

  // ── PATCH /api/tasks/:taskId (parent only) ─────────────────────────────
  app.patch(
    '/api/tasks/:taskId',
    { schema: { params: taskParamsSchema, body: updateTaskRequestSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user || user.role !== 'parent') return reply.code(401).send({ error: 'Unauthorized' });

      const body = request.body;
      const patch: Partial<NewTaskRow> = {};
      if (body.title !== undefined) patch.title = body.title;
      if (body.description !== undefined) patch.description = body.description;
      if (body.settings !== undefined) patch.settings = body.settings;
      if (body.collectionId !== undefined) patch.collectionId = body.collectionId;
      if (body.durationMinutes !== undefined) patch.durationMinutes = body.durationMinutes;
      if (body.scheduledDate !== undefined) patch.scheduledDate = body.scheduledDate;
      if (body.recurrenceRule !== undefined) patch.recurrenceRule = body.recurrenceRule;

      const updated = await repo.update(request.params.taskId, user.id, patch);
      if (!updated) return reply.code(404).send({ error: 'NotFound' });
      return toDto(updated);
    },
  );

  // ── DELETE /api/tasks/:taskId (parent only) ────────────────────────────
  app.delete(
    '/api/tasks/:taskId',
    { schema: { params: taskParamsSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user || user.role !== 'parent') return reply.code(401).send({ error: 'Unauthorized' });
      const ok = await repo.delete(request.params.taskId, user.id);
      if (!ok) return reply.code(404).send({ error: 'NotFound' });
      return reply.code(204).send();
    },
  );

  // ── POST /api/tasks/:taskId/start ──────────────────────────────────────
  app.post(
    '/api/tasks/:taskId/start',
    { schema: { params: taskParamsSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user) return reply.code(401).send({ error: 'Unauthorized' });
      try {
        const updated = await lifecycle.start(request.params.taskId, user.id);
        return toDto(updated);
      } catch (err) {
        if (err instanceof TaskLifecycleError) {
          const { status, body } = mapLifecycleError(err);
          return reply.code(status).send(body);
        }
        throw err;
      }
    },
  );

  // ── POST /api/tasks/:taskId/complete ───────────────────────────────────
  app.post(
    '/api/tasks/:taskId/complete',
    { schema: { params: taskParamsSchema, body: completeTaskRequestSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user) return reply.code(401).send({ error: 'Unauthorized' });
      try {
        const { task: updated, completionId } = await lifecycle.complete(
          request.params.taskId,
          user.id,
          request.body,
        );
        return { task: toDto(updated), completionId };
      } catch (err) {
        if (err instanceof TaskLifecycleError) {
          const { status, body } = mapLifecycleError(err);
          return reply.code(status).send(body);
        }
        throw err;
      }
    },
  );

  // ── POST /api/tasks/:taskId/skip ───────────────────────────────────────
  app.post(
    '/api/tasks/:taskId/skip',
    { schema: { params: taskParamsSchema, body: skipTaskRequestSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user) return reply.code(401).send({ error: 'Unauthorized' });
      try {
        const updated = await lifecycle.skip(request.params.taskId, user.id, request.body);
        return toDto(updated);
      } catch (err) {
        if (err instanceof TaskLifecycleError) {
          const { status, body } = mapLifecycleError(err);
          return reply.code(status).send(body);
        }
        throw err;
      }
    },
  );
};
