import { v7 as uuidv7 } from 'uuid';
import { eq } from 'drizzle-orm';
import {
  children as childrenTable,
  taskTemplates,
  type Database_,
  type TaskAssignmentRow,
} from '@kidsprogress/db';
import type {
  CreateTaskAssignmentRequest,
  TaskAssignment,
} from '@kidsprogress/shared';
import {
  createAssignmentsRepo,
  type AssignmentsRepo,
} from './assignments.repo.js';
import {
  AssignmentNotFoundError,
  InvalidAssignmentTargetError,
} from './assignments.errors.js';

function toAssignmentDto(row: TaskAssignmentRow): TaskAssignment {
  return {
    id: row.id,
    templateId: row.templateId,
    childId: row.childId,
    parentId: row.parentId,
    rrule: row.rrule,
    timezone: row.timezone,
    effectiveFrom: row.effectiveFrom,
    effectiveUntil: row.effectiveUntil,
    replacesAssignmentId: row.replacesAssignmentId,
    replacedByAssignmentId: row.replacedByAssignmentId,
    schedulingType: row.schedulingType,
    preferredStartTime: row.preferredStartTime,
    preferredEndTime: row.preferredEndTime,
    obligation: row.obligation,
    durationMinutes: row.durationMinutes,
    requiredAttempts: row.requiredAttempts,
    maxAttemptsPerOccurrence: row.maxAttemptsPerOccurrence,
    createdAt: row.createdAt,
  };
}

export function createAssignmentsService(opts: {
  db: Database_;
  repo?: AssignmentsRepo;
}) {
  const repo = opts.repo ?? createAssignmentsRepo(opts.db);

  /**
   * Validate that the (templateId, childId) target lives inside the
   * parent's family. Returns the parent-owned template + child rows so the
   * caller can read denormalised fields without a second query.
   */
  async function validateTarget(
    parentId: string,
    familyId: string,
    templateId: string,
    childId: string,
  ): Promise<void> {
    const [template] = await opts.db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, templateId))
      .limit(1);
    if (!template || template.parentId !== parentId) {
      throw new InvalidAssignmentTargetError('Template not in your library');
    }
    const [child] = await opts.db
      .select()
      .from(childrenTable)
      .where(eq(childrenTable.id, childId))
      .limit(1);
    if (!child || child.familyId !== familyId) {
      throw new InvalidAssignmentTargetError('Child not in your family');
    }
  }

  return {
    async listForParent(parentId: string): Promise<TaskAssignment[]> {
      const rows = await repo.listByParent(parentId);
      return rows.map(toAssignmentDto);
    },

    async listForChild(childId: string): Promise<TaskAssignment[]> {
      const rows = await repo.listByChild(childId);
      return rows.map(toAssignmentDto);
    },

    async get(id: string, parentId: string): Promise<TaskAssignment> {
      const row = await repo.findByIdForParent(id, parentId);
      if (!row) throw new AssignmentNotFoundError('Assignment not found');
      return toAssignmentDto(row);
    },

    async create(
      parentId: string,
      familyId: string,
      params: CreateTaskAssignmentRequest,
    ): Promise<TaskAssignment> {
      await validateTarget(parentId, familyId, params.templateId, params.childId);
      const id = uuidv7();
      const row = await repo.insert({
        id,
        templateId: params.templateId,
        childId: params.childId,
        parentId,
        ...(params.rrule !== undefined ? { rrule: params.rrule } : {}),
        timezone: params.timezone,
        effectiveFrom: params.effectiveFrom,
        ...(params.effectiveUntil !== undefined
          ? { effectiveUntil: params.effectiveUntil }
          : {}),
        schedulingType: params.schedulingType,
        ...(params.preferredStartTime !== undefined
          ? { preferredStartTime: params.preferredStartTime }
          : {}),
        ...(params.preferredEndTime !== undefined
          ? { preferredEndTime: params.preferredEndTime }
          : {}),
        obligation: params.obligation,
        ...(params.durationMinutes !== undefined
          ? { durationMinutes: params.durationMinutes }
          : {}),
        ...(params.requiredAttempts !== undefined
          ? { requiredAttempts: params.requiredAttempts }
          : {}),
        ...(params.maxAttemptsPerOccurrence !== undefined
          ? { maxAttemptsPerOccurrence: params.maxAttemptsPerOccurrence }
          : {}),
      });
      return toAssignmentDto(row);
    },

    async delete(id: string, parentId: string): Promise<void> {
      const row = await repo.findByIdForParent(id, parentId);
      if (!row) throw new AssignmentNotFoundError('Assignment not found');
      await repo.delete(id);
    },
  };
}

export type AssignmentsService = ReturnType<typeof createAssignmentsService>;
