import type {
  FastifyBaseLogger,
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { and, eq, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import {
  children as childrenTable,
  taskInstances,
  type Database_,
} from '@kidsprogress/db';
import { createAssignmentsRepo } from '../assignments/assignments.repo.js';
import { expandOccurrences } from './expander.js';
import { materialize } from './materialize.js';
import { createExceptionsRepo } from './exceptions.repo.js';

type ZodFastify = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  ZodTypeProvider
>;

const calendarQuerySchema = z.object({
  childId: z.string().uuid(),
  from: z.string().datetime(),
  to: z.string().datetime(),
});

const materializeBodySchema = z.object({
  assignmentId: z.string().uuid(),
  originalDate: z.string().datetime(),
  occurrenceDate: z.string().datetime().optional(),
});

const calendarItemSchema = z.union([
  z.object({
    kind: z.literal('materialized'),
    instanceId: z.string().uuid(),
    assignmentId: z.string().uuid(),
    childId: z.string().uuid(),
    originalDate: z.string(),
    occurrenceDate: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed', 'skipped', 'abandoned']),
  }),
  z.object({
    kind: z.literal('virtual'),
    assignmentId: z.string().uuid(),
    childId: z.string().uuid(),
    originalDate: z.string(),
    /** When the parent has rescheduled the occurrence, the new render date. */
    rescheduledTo: z.string().optional(),
  }),
]);

const exceptionBodySchema = z.union([
  z.object({
    assignmentId: z.string().uuid(),
    originalDate: z.string().datetime(),
    action: z.literal('skip'),
  }),
  z.object({
    assignmentId: z.string().uuid(),
    originalDate: z.string().datetime(),
    action: z.literal('reschedule'),
    rescheduledTo: z.string().datetime(),
  }),
]);

const exceptionResponseSchema = z.object({
  assignmentId: z.string().uuid(),
  occurrenceDate: z.string(),
  action: z.enum(['skip', 'reschedule', 'override', 'materialized']),
  rescheduledTo: z.string().nullable(),
});

const exceptionDeleteQuerySchema = z.object({
  assignmentId: z.string().uuid(),
  originalDate: z.string().datetime(),
});

const calendarResponseSchema = z.object({
  items: z.array(calendarItemSchema),
});

const materializeResponseSchema = z.object({
  instanceId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  originalDate: z.string(),
  occurrenceDate: z.string(),
});

export interface SchedulingRoutesDeps {
  db: Database_;
}

export async function registerSchedulingRoutes(
  app: ZodFastify,
  deps: SchedulingRoutesDeps,
): Promise<void> {
  const assignmentsRepo = createAssignmentsRepo(deps.db);
  const exceptionsRepo = createExceptionsRepo(deps.db);

  /**
   * Calendar read. Returns the union of (a) every materialized instance
   * for the child inside `[from, to]` and (b) every virtual occurrence
   * expanded from each assignment's `rrule`, suppressing virtuals already
   * covered by a materialized row at the same `(assignmentId, originalDate)`.
   *
   * Parent + child-role tokens both allowed — a kid reading their own
   * "today" is just a child-scoped narrow of this.
   */
  app.get(
    '/calendar',
    {
      schema: { querystring: calendarQuerySchema, response: { 200: calendarResponseSchema } },
      config: { role: ['parent', 'child', 'child-readonly'] },
    },
    async (req, reply) => {
      // Family-scope check.
      const [child] = await deps.db
        .select()
        .from(childrenTable)
        .where(eq(childrenTable.id, req.query.childId))
        .limit(1);
      if (!child || child.familyId !== req.currentUser!.familyId) {
        throw app.httpErrors.notFound('Child not found');
      }
      // child role: can only read their own calendar.
      if (
        (req.currentUser!.role === 'child' ||
          req.currentUser!.role === 'child-readonly') &&
        req.currentUser!.id !== child.id
      ) {
        throw app.httpErrors.forbidden('Cross-child read');
      }

      const assignments = await assignmentsRepo.listByChild(child.id);
      // Pre-fetch exceptions in the window — widened by 14 days so a
      // reschedule that pulls an occurrence INTO the window still resolves.
      const wideLo = new Date(req.query.from);
      wideLo.setDate(wideLo.getDate() - 14);
      const wideHi = new Date(req.query.to);
      wideHi.setDate(wideHi.getDate() + 14);
      const exceptions = await exceptionsRepo.listForAssignments(
        assignments.map((a) => a.id),
        wideLo.toISOString(),
        wideHi.toISOString(),
      );
      const byAssignment = new Map<string, typeof exceptions>();
      for (const ex of exceptions) {
        const list = byAssignment.get(ex.assignmentId) ?? [];
        list.push(ex);
        byAssignment.set(ex.assignmentId, list);
      }

      const virtualKeys = assignments.flatMap((a) =>
        expandOccurrences(
          a,
          { from: req.query.from, to: req.query.to },
          byAssignment.get(a.id) ?? [],
        ).map((k) => ({ ...k, childId: child.id })),
      );

      // Materialized rows already in the range.
      const materializedRows = await deps.db
        .select()
        .from(taskInstances)
        .where(
          and(
            eq(taskInstances.childId, child.id),
            gte(taskInstances.occurrenceDate, req.query.from),
            lte(taskInstances.occurrenceDate, req.query.to),
          ),
        );

      const materializedKeys = new Set(
        materializedRows.map((r) => `${r.assignmentId}|${r.originalDate}`),
      );
      const items = [
        ...materializedRows.map((r) => ({
          kind: 'materialized' as const,
          instanceId: r.id,
          assignmentId: r.assignmentId,
          childId: r.childId,
          originalDate: r.originalDate,
          occurrenceDate: r.occurrenceDate,
          status: r.status,
        })),
        ...virtualKeys
          .filter((k) => !materializedKeys.has(`${k.assignmentId}|${k.originalDate}`))
          .map((k) => {
            // k is the InstanceKey shape from the expander; it may carry a
            // rescheduledTo when an exception moved the occurrence.
            const rk = k as unknown as {
              kind: 'virtual';
              assignmentId: string;
              originalDate: string;
              rescheduledTo?: string;
            };
            return {
              kind: 'virtual' as const,
              assignmentId: rk.assignmentId,
              childId: k.childId,
              originalDate: rk.originalDate,
              ...(rk.rescheduledTo ? { rescheduledTo: rk.rescheduledTo } : {}),
            };
          }),
      ];

      return reply.send({ items });
    },
  );

  /**
   * Materialize chokepoint exposed for the child portal's "start" tap.
   * Parent-readonly clients use the same route to override an occurrence.
   */
  app.post(
    '/materialize',
    {
      schema: { body: materializeBodySchema, response: { 200: materializeResponseSchema } },
      config: { role: ['parent', 'child'] },
    },
    async (req, reply) => {
      // Family-scope check via the assignment.
      const [assignment] = await deps.db
        .select()
        .from((await import('@kidsprogress/db')).taskAssignments)
        .where(eq((await import('@kidsprogress/db')).taskAssignments.id, req.body.assignmentId))
        .limit(1);
      if (!assignment || assignment.parentId !== req.currentUser!.familyId) {
        // parentId is denormalised against the family-owning parent — for
        // single-parent families that equals familyId.
        throw app.httpErrors.notFound('Assignment not found');
      }
      // Child can only materialize their own assignments.
      if (req.currentUser!.role === 'child' && req.currentUser!.id !== assignment.childId) {
        throw app.httpErrors.forbidden('Cross-child write');
      }
      const row = await materialize(deps.db, {
        assignmentId: req.body.assignmentId,
        originalDate: req.body.originalDate,
        ...(req.body.occurrenceDate ? { occurrenceDate: req.body.occurrenceDate } : {}),
      });
      return reply.send({
        instanceId: row.id,
        assignmentId: row.assignmentId,
        originalDate: row.originalDate,
        occurrenceDate: row.occurrenceDate,
      });
    },
  );

  /**
   * Apply a recurrence exception — skip or reschedule. Parent-only.
   * Upsert by `(assignmentId, originalDate)` so flipping between skip and
   * reschedule keeps a single row.
   */
  app.post(
    '/exceptions',
    {
      schema: {
        body: exceptionBodySchema,
        response: { 201: exceptionResponseSchema },
      },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const { taskAssignments } = await import('@kidsprogress/db');
      const [assignment] = await deps.db
        .select()
        .from(taskAssignments)
        .where(eq(taskAssignments.id, req.body.assignmentId))
        .limit(1);
      if (!assignment || assignment.parentId !== req.currentUser!.familyId) {
        throw app.httpErrors.notFound('Assignment not found');
      }

      const { v7: uuidv7 } = await import('uuid');
      const row = await exceptionsRepo.upsert({
        id: uuidv7(),
        assignmentId: req.body.assignmentId,
        occurrenceDate: req.body.originalDate,
        action: req.body.action,
        ...(req.body.action === 'reschedule'
          ? { rescheduledTo: req.body.rescheduledTo }
          : {}),
      });
      return reply.code(201).send({
        assignmentId: row.assignmentId,
        occurrenceDate: row.occurrenceDate,
        action: row.action,
        rescheduledTo: row.rescheduledTo,
      });
    },
  );

  /** Remove an exception — restores the rrule default for that date. */
  app.delete(
    '/exceptions',
    {
      schema: {
        querystring: exceptionDeleteQuerySchema,
        response: { 204: z.null() },
      },
      config: { role: 'parent' },
    },
    async (req, reply) => {
      const { taskAssignments } = await import('@kidsprogress/db');
      const [assignment] = await deps.db
        .select()
        .from(taskAssignments)
        .where(eq(taskAssignments.id, req.query.assignmentId))
        .limit(1);
      if (!assignment || assignment.parentId !== req.currentUser!.familyId) {
        throw app.httpErrors.notFound('Assignment not found');
      }
      await exceptionsRepo.delete(req.query.assignmentId, req.query.originalDate);
      return reply.code(204).send(null);
    },
  );
}
