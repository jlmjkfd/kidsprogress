import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { v7 as uuidv7 } from 'uuid';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  createSubtaskRequestSchema,
  subtaskParamsSchema,
  taskParamsSchema,
  updateSubtaskRequestSchema,
  type Subtask,
} from '@kidsprogress/shared';
import {
  subtasks,
  tasks,
  type Database_,
  type SubtaskRow,
} from '@kidsprogress/db';

function toDto(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    taskId: row.taskId,
    title: row.title,
    position: row.position,
    isDone: row.isDone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Ownership check: the user can act on this task. */
async function ensureCanAccessTask(
  db: Database_,
  taskId: string,
  user: { id: string; role: 'parent' | 'child' },
): Promise<boolean> {
  const col = user.role === 'parent' ? tasks.parentId : tasks.childId;
  const rows = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(col, user.id)))
    .limit(1);
  return rows.length > 0;
}

export const subtasksRoutes: FastifyPluginAsyncZod<{ db: Database_ }> = async function (
  app,
  opts,
) {
  // ── GET /api/tasks/:taskId/subtasks ────────────────────────────────────
  app.get(
    '/api/tasks/:taskId/subtasks',
    { schema: { params: taskParamsSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user) return reply.code(401).send({ error: 'Unauthorized' });
      const can = await ensureCanAccessTask(opts.db, request.params.taskId, user);
      if (!can) return reply.code(404).send({ error: 'NotFound' });

      const rows = await opts.db
        .select()
        .from(subtasks)
        .where(eq(subtasks.taskId, request.params.taskId))
        .orderBy(asc(subtasks.position), asc(subtasks.createdAt));
      return { subtasks: rows.map(toDto) };
    },
  );

  // ── POST /api/tasks/:taskId/subtasks (parent only) ─────────────────────
  app.post(
    '/api/tasks/:taskId/subtasks',
    { schema: { params: taskParamsSchema, body: createSubtaskRequestSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user || user.role !== 'parent') return reply.code(401).send({ error: 'Unauthorized' });
      const can = await ensureCanAccessTask(opts.db, request.params.taskId, user);
      if (!can) return reply.code(404).send({ error: 'NotFound' });

      const [inserted] = await opts.db
        .insert(subtasks)
        .values({
          id: uuidv7(),
          taskId: request.params.taskId,
          title: request.body.title,
          position: request.body.position ?? 0,
        })
        .returning();
      if (!inserted) return reply.code(500).send({ error: 'InsertFailed' });
      return reply.code(201).send(toDto(inserted));
    },
  );

  // ── PATCH /api/tasks/:taskId/subtasks/:subtaskId ───────────────────────
  // Parents can edit anything; children can only flip `isDone`.
  app.patch(
    '/api/tasks/:taskId/subtasks/:subtaskId',
    { schema: { params: subtaskParamsSchema, body: updateSubtaskRequestSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user) return reply.code(401).send({ error: 'Unauthorized' });
      const can = await ensureCanAccessTask(opts.db, request.params.taskId, user);
      if (!can) return reply.code(404).send({ error: 'NotFound' });

      const body = request.body;
      const patch: Partial<{ title: string; position: number; isDone: boolean; updatedAt: string }> = {
        updatedAt: new Date().toISOString(),
      };
      if (user.role === 'child') {
        if (body.isDone === undefined) {
          return reply.code(403).send({ error: 'ChildCanOnlyToggleDone' });
        }
        patch.isDone = body.isDone;
      } else {
        if (body.title !== undefined) patch.title = body.title;
        if (body.position !== undefined) patch.position = body.position;
        if (body.isDone !== undefined) patch.isDone = body.isDone;
      }

      const [updated] = await opts.db
        .update(subtasks)
        .set(patch)
        .where(
          and(eq(subtasks.id, request.params.subtaskId), eq(subtasks.taskId, request.params.taskId)),
        )
        .returning();
      if (!updated) return reply.code(404).send({ error: 'NotFound' });
      return toDto(updated);
    },
  );

  // ── DELETE /api/tasks/:taskId/subtasks/:subtaskId (parent only) ────────
  app.delete(
    '/api/tasks/:taskId/subtasks/:subtaskId',
    { schema: { params: subtaskParamsSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user || user.role !== 'parent') return reply.code(401).send({ error: 'Unauthorized' });
      const can = await ensureCanAccessTask(opts.db, request.params.taskId, user);
      if (!can) return reply.code(404).send({ error: 'NotFound' });

      const r = await opts.db
        .delete(subtasks)
        .where(
          and(eq(subtasks.id, request.params.subtaskId), eq(subtasks.taskId, request.params.taskId)),
        )
        .returning({ id: subtasks.id });
      if (r.length === 0) return reply.code(404).send({ error: 'NotFound' });
      return reply.code(204).send();
    },
  );

  void z;
};
