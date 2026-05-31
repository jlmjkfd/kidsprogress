import { v7 as uuidv7 } from 'uuid';
import { and, eq } from 'drizzle-orm';
import {
  taskAssignments,
  taskInstances,
  taskSessions,
  taskTemplates,
  type Database_,
  type TaskSessionRow,
} from '@kidsprogress/db';
import type { ProgressState } from '@kidsprogress/shared';
import {
  PluginVersionMismatchError,
  SessionInstanceNotFoundError,
} from './sessions.errors.js';

interface SaveProgressParams {
  instanceId: string;
  pluginVersion: number;
  progressState: ProgressState;
  callerRole: 'parent' | 'child' | 'child-readonly';
  callerSubjectId: string;
  callerFamilyId: string;
}

interface GetSessionParams {
  instanceId: string;
  callerRole: 'parent' | 'child' | 'child-readonly';
  callerSubjectId: string;
  callerFamilyId: string;
}

export function createSessionsService(opts: { db: Database_ }) {
  /**
   * Authorise + return the (instance, assignment, template) triple so we
   * can validate the plugin version + persist a session row.
   */
  async function loadInstanceWithContext(
    instanceId: string,
    callerRole: 'parent' | 'child' | 'child-readonly',
    callerSubjectId: string,
    callerFamilyId: string,
  ) {
    const [row] = await opts.db
      .select({
        instance: taskInstances,
        assignment: taskAssignments,
        template: taskTemplates,
      })
      .from(taskInstances)
      .innerJoin(
        taskAssignments,
        eq(taskAssignments.id, taskInstances.assignmentId),
      )
      .innerJoin(taskTemplates, eq(taskTemplates.id, taskInstances.templateId))
      .where(eq(taskInstances.id, instanceId))
      .limit(1);
    if (!row) throw new SessionInstanceNotFoundError('Instance not found');
    if (row.assignment.parentId !== callerFamilyId) {
      throw new SessionInstanceNotFoundError('Instance not found');
    }
    if (
      (callerRole === 'child' || callerRole === 'child-readonly') &&
      callerSubjectId !== row.instance.childId
    ) {
      throw new SessionInstanceNotFoundError('Instance not found');
    }
    return row;
  }

  return {
    /**
     * Upsert the in-flight session for this instance. Strategy: every child
     * attempt gets at most ONE active row at a time — old completed rows
     * stay for history. If a session already exists with `completedAt=null`
     * we update it in place; else we insert a fresh row.
     *
     * `pluginVersion` must match the template's current `pluginVersion`. A
     * mismatch means the parent edited the template (or the plugin shipped
     * a breaking version bump) between Start and Save — the host throws
     * 409 and the client discards the partial. (Per v2.5 plan §plugins.)
     */
    async saveProgress(params: SaveProgressParams): Promise<TaskSessionRow> {
      const ctx = await loadInstanceWithContext(
        params.instanceId,
        params.callerRole,
        params.callerSubjectId,
        params.callerFamilyId,
      );
      if (ctx.template.pluginVersion !== params.pluginVersion) {
        throw new PluginVersionMismatchError(
          `Plugin version mismatch (template=${ctx.template.pluginVersion}, client=${params.pluginVersion})`,
        );
      }
      if (params.callerRole === 'child-readonly') {
        // Surfaced as 404 to avoid hinting that the resource exists at all.
        throw new SessionInstanceNotFoundError('Instance not found');
      }

      const nowIso = new Date().toISOString();

      const existing = await opts.db
        .select()
        .from(taskSessions)
        .where(
          and(
            eq(taskSessions.instanceId, params.instanceId),
            eq(taskSessions.childId, ctx.instance.childId),
          ),
        )
        .limit(1);
      const active = existing.find((s) => s.completedAt === null);

      if (active) {
        const [updated] = await opts.db
          .update(taskSessions)
          .set({
            progressState: params.progressState as Record<string, unknown>,
            lastSavedAt: nowIso,
            pluginVersion: params.pluginVersion,
          })
          .where(eq(taskSessions.id, active.id))
          .returning();
        if (!updated) throw new SessionInstanceNotFoundError('Session vanished');
        return updated;
      }

      const [inserted] = await opts.db
        .insert(taskSessions)
        .values({
          id: uuidv7(),
          instanceId: params.instanceId,
          childId: ctx.instance.childId,
          pluginVersion: params.pluginVersion,
          progressState: params.progressState as Record<string, unknown>,
          lastSavedAt: nowIso,
        })
        .returning();
      if (!inserted) throw new SessionInstanceNotFoundError('Insert failed');
      return inserted;
    },

    /** Read the active (not-yet-completed) session for an instance. */
    async getActive(params: GetSessionParams): Promise<TaskSessionRow | null> {
      await loadInstanceWithContext(
        params.instanceId,
        params.callerRole,
        params.callerSubjectId,
        params.callerFamilyId,
      );
      const rows = await opts.db
        .select()
        .from(taskSessions)
        .where(eq(taskSessions.instanceId, params.instanceId))
        .limit(10);
      return rows.find((r) => r.completedAt === null) ?? null;
    },

    /**
     * Mark the active session complete. Wired into the `instance complete`
     * transition so a successful Done burns the session as part of the
     * lifecycle.
     */
    async markComplete(instanceId: string, childId: string): Promise<void> {
      const nowIso = new Date().toISOString();
      await opts.db
        .update(taskSessions)
        .set({ completedAt: nowIso })
        .where(
          and(
            eq(taskSessions.instanceId, instanceId),
            eq(taskSessions.childId, childId),
          ),
        );
    },
  };
}

export type SessionsService = ReturnType<typeof createSessionsService>;
