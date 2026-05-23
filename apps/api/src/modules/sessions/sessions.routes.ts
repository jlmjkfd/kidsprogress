import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { v7 as uuidv7 } from 'uuid';
import { and, desc, eq } from 'drizzle-orm';
import {
  saveSessionRequestSchema,
  sessionParamsSchema,
  startSessionRequestSchema,
  type TaskSession,
} from '@kidsprogress/shared';
import {
  tasks,
  taskSessions,
  type Database_,
  type TaskSessionRow,
} from '@kidsprogress/db';

function toDto(row: TaskSessionRow): TaskSession {
  return {
    id: row.id,
    taskId: row.taskId,
    childId: row.childId,
    occurrenceDate: row.occurrenceDate,
    state: row.state,
    payload: row.payload,
    startedAt: row.startedAt,
    updatedAt: row.updatedAt,
    endedAt: row.endedAt,
  };
}

async function canAccessTask(
  db: Database_,
  taskId: string,
  user: { id: string; role: 'parent' | 'child' },
): Promise<boolean> {
  const col = user.role === 'parent' ? tasks.parentId : tasks.childId;
  const r = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(col, user.id)))
    .limit(1);
  return r.length > 0;
}

export const sessionsRoutes: FastifyPluginAsyncZod<{ db: Database_ }> = async function (
  app,
  opts,
) {
  // ── POST /api/sessions (start or resume) ───────────────────────────────
  app.post(
    '/api/sessions',
    { schema: { body: startSessionRequestSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user) return reply.code(401).send({ error: 'Unauthorized' });
      const body = request.body;
      const can = await canAccessTask(opts.db, body.taskId, user);
      if (!can) return reply.code(404).send({ error: 'NotFound' });

      // For child role we use their child.id as childId; parents acting on a
      // child task use the task's childId.
      const childIdForRow =
        user.role === 'child'
          ? user.id
          : (await opts.db.select({ childId: tasks.childId }).from(tasks).where(eq(tasks.id, body.taskId)).limit(1))[0]
              ?.childId;
      if (!childIdForRow) return reply.code(404).send({ error: 'NotFound' });

      // Resume: most-recent active session for this (task, child)
      const existing = await opts.db
        .select()
        .from(taskSessions)
        .where(
          and(
            eq(taskSessions.taskId, body.taskId),
            eq(taskSessions.childId, childIdForRow),
            eq(taskSessions.state, 'active'),
          ),
        )
        .orderBy(desc(taskSessions.startedAt))
        .limit(1);

      if (existing[0]) return toDto(existing[0]);

      const [inserted] = await opts.db
        .insert(taskSessions)
        .values({
          id: uuidv7(),
          taskId: body.taskId,
          childId: childIdForRow,
          occurrenceDate: body.occurrenceDate ?? null,
          state: 'active',
          payload: body.payload ?? null,
        })
        .returning();
      if (!inserted) return reply.code(500).send({ error: 'InsertFailed' });
      return reply.code(201).send(toDto(inserted));
    },
  );

  // ── PATCH /api/sessions/:sessionId (save partial state) ────────────────
  app.patch(
    '/api/sessions/:sessionId',
    { schema: { params: sessionParamsSchema, body: saveSessionRequestSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user) return reply.code(401).send({ error: 'Unauthorized' });

      const [existing] = await opts.db
        .select()
        .from(taskSessions)
        .where(eq(taskSessions.id, request.params.sessionId))
        .limit(1);
      if (!existing) return reply.code(404).send({ error: 'NotFound' });

      const can = await canAccessTask(opts.db, existing.taskId, user);
      if (!can) return reply.code(404).send({ error: 'NotFound' });
      if (existing.state !== 'active') return reply.code(409).send({ error: 'NotActive' });

      const [updated] = await opts.db
        .update(taskSessions)
        .set({ payload: request.body.payload, updatedAt: new Date().toISOString() })
        .where(eq(taskSessions.id, request.params.sessionId))
        .returning();
      if (!updated) return reply.code(404).send({ error: 'NotFound' });
      return toDto(updated);
    },
  );

  // ── POST /api/sessions/:sessionId/abandon ──────────────────────────────
  app.post(
    '/api/sessions/:sessionId/abandon',
    { schema: { params: sessionParamsSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user) return reply.code(401).send({ error: 'Unauthorized' });
      const [existing] = await opts.db
        .select()
        .from(taskSessions)
        .where(eq(taskSessions.id, request.params.sessionId))
        .limit(1);
      if (!existing) return reply.code(404).send({ error: 'NotFound' });
      const can = await canAccessTask(opts.db, existing.taskId, user);
      if (!can) return reply.code(404).send({ error: 'NotFound' });

      const now = new Date().toISOString();
      const [updated] = await opts.db
        .update(taskSessions)
        .set({ state: 'abandoned', endedAt: now, updatedAt: now })
        .where(eq(taskSessions.id, request.params.sessionId))
        .returning();
      return updated ? toDto(updated) : reply.code(404).send({ error: 'NotFound' });
    },
  );
};
