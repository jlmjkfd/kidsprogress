import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { and, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import {
  children,
  completions,
  tasks,
  type CompletionRow,
  type Database_,
} from '@kidsprogress/db';
import { completionListQuerySchema, type Completion } from '@kidsprogress/shared';

function toDto(row: CompletionRow): Completion {
  return {
    id: row.id,
    taskId: row.taskId,
    childId: row.childId,
    occurrenceDate: row.occurrenceDate,
    completedAt: row.completedAt,
    durationMinutes: row.durationMinutes,
    score: row.score,
    attempts: row.attempts,
    notes: row.notes,
    meta: row.meta,
  };
}

export const completionsRoutes: FastifyPluginAsyncZod<{ db: Database_ }> = async function (
  app,
  opts,
) {
  // ── GET /api/completions ────────────────────────────────────────────────
  // Parent: their tree (own children + own tasks). Child: own completions only.
  app.get(
    '/api/completions',
    { schema: { querystring: completionListQuerySchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user) return reply.code(401).send({ error: 'Unauthorized' });
      const q = request.query;

      const wheres: SQL[] = [];
      if (q.fromDate) wheres.push(gte(completions.completedAt, q.fromDate));
      if (q.toDate) wheres.push(lte(completions.completedAt, q.toDate));
      if (q.taskId) wheres.push(eq(completions.taskId, q.taskId));

      if (user.role === 'parent') {
        if (q.childId) {
          // Verify the parent owns the child
          const owns = await opts.db
            .select({ id: children.id })
            .from(children)
            .where(and(eq(children.id, q.childId), eq(children.parentId, user.id)))
            .limit(1);
          if (owns.length === 0) return reply.code(404).send({ error: 'NotFound' });
          wheres.push(eq(completions.childId, q.childId));
        } else {
          // Restrict to completions whose task belongs to the parent.
          const taskIds = await opts.db
            .select({ id: tasks.id })
            .from(tasks)
            .where(eq(tasks.parentId, user.id));
          const ids = taskIds.map((t) => t.id);
          if (ids.length === 0) return { completions: [] };
          // Drizzle's IN: use inArray; for brevity use OR via repeated equality only if small.
          // Easiest portable path: join.
          const rows = await opts.db
            .select({
              completion: completions,
            })
            .from(completions)
            .innerJoin(tasks, eq(tasks.id, completions.taskId))
            .where(and(eq(tasks.parentId, user.id), ...wheres))
            .orderBy(desc(completions.completedAt))
            .limit(q.limit);
          return { completions: rows.map((r) => toDto(r.completion)) };
        }
      } else {
        // Child role: scoped to themselves
        wheres.push(eq(completions.childId, user.id));
      }

      const rows = await opts.db
        .select()
        .from(completions)
        .where(and(...wheres))
        .orderBy(desc(completions.completedAt))
        .limit(q.limit);
      return { completions: rows.map(toDto) };
    },
  );
};
