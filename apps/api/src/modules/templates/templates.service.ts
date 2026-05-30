import { v7 as uuidv7 } from 'uuid';
import { ZodError } from 'zod';
import type { Database_, TaskTemplateRow } from '@kidsprogress/db';
import {
  getHandler,
  getHandlerVersion,
  validateConfig,
  type CreateTaskTemplateRequest,
  type TaskTemplate,
  type UpdateTaskTemplateRequest,
} from '@kidsprogress/shared';
import { createTemplatesRepo, type TemplatesRepo } from './templates.repo.js';
import {
  InvalidConfigError,
  TemplateNotFoundError,
  UnknownHandlerError,
} from './templates.errors.js';

/** Project the DB row to the DTO. Tags + config are JSON-typed in Drizzle. */
function toTemplateDto(row: TaskTemplateRow): TaskTemplate {
  return {
    id: row.id,
    parentId: row.parentId,
    handlerId: row.handlerId as TaskTemplate['handlerId'],
    schemaVersion: row.schemaVersion,
    name: row.name,
    description: row.description,
    categoryPath: row.categoryPath,
    tags: row.tags ?? [],
    config: row.config ?? {},
    aiAssistEnabled: row.aiAssistEnabled,
    pluginVersion: row.pluginVersion,
    visibility: row.visibility,
    isArchived: row.isArchived,
    defaultDurationMinutes: row.defaultDurationMinutes,
    defaultRequiredAttempts: row.defaultRequiredAttempts,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Normalise a ZodError into the shape our error handler emits. Keeps the
 * route layer thin and the test assertions stable.
 */
function toInvalidConfig(err: ZodError, message: string): InvalidConfigError {
  return new InvalidConfigError(
    message,
    err.issues.map((i) => ({
      path: ['config', ...i.path].join('.'),
      message: i.message,
    })),
  );
}

export function createTemplatesService(opts: {
  db: Database_;
  repo?: TemplatesRepo;
}) {
  const repo = opts.repo ?? createTemplatesRepo(opts.db);

  async function loadOwned(id: string, parentId: string): Promise<TaskTemplateRow> {
    const row = await repo.findByIdForParent(id, parentId);
    if (!row) throw new TemplateNotFoundError('Template not found');
    return row;
  }

  return {
    async list(parentId: string): Promise<TaskTemplate[]> {
      const rows = await repo.listByParent(parentId);
      return rows.map(toTemplateDto);
    },

    async get(id: string, parentId: string): Promise<TaskTemplate> {
      const row = await loadOwned(id, parentId);
      return toTemplateDto(row);
    },

    async create(
      parentId: string,
      params: CreateTaskTemplateRequest,
    ): Promise<TaskTemplate> {
      // 1. Handler must be registered.
      const handler = getHandler(params.handlerId);
      if (!handler) throw new UnknownHandlerError(`Unknown handler: ${params.handlerId}`);
      // 2. Version must be registered.
      if (!getHandlerVersion(params.handlerId, params.schemaVersion)) {
        throw new UnknownHandlerError(
          `Unknown version ${params.handlerId}@v${params.schemaVersion}`,
        );
      }
      // 3. Config must validate against the version's schema.
      let validatedConfig: Record<string, unknown>;
      try {
        validatedConfig = validateConfig(
          params.handlerId,
          params.schemaVersion,
          params.config,
        ) as Record<string, unknown>;
      } catch (e) {
        if (e instanceof ZodError) {
          throw toInvalidConfig(e, 'Invalid template config');
        }
        throw e;
      }

      const id = uuidv7();
      const row = await repo.insert({
        id,
        parentId,
        handlerId: params.handlerId,
        schemaVersion: params.schemaVersion,
        name: params.name,
        ...(params.description !== undefined ? { description: params.description } : {}),
        ...(params.categoryPath !== undefined ? { categoryPath: params.categoryPath } : {}),
        tags: params.tags ?? [],
        config: validatedConfig,
        ...(params.aiAssistEnabled !== undefined
          ? { aiAssistEnabled: params.aiAssistEnabled }
          : {}),
        ...(params.defaultDurationMinutes !== undefined
          ? { defaultDurationMinutes: params.defaultDurationMinutes }
          : {}),
        ...(params.defaultRequiredAttempts !== undefined
          ? { defaultRequiredAttempts: params.defaultRequiredAttempts }
          : {}),
      });
      return toTemplateDto(row);
    },

    /**
     * PATCH update. `handlerId` and `schemaVersion` are immutable — they
     * pin the validator and would invalidate `config` on change. Use a
     * fresh template instead.
     */
    async update(
      id: string,
      parentId: string,
      patch: UpdateTaskTemplateRequest,
    ): Promise<TaskTemplate> {
      const row = await loadOwned(id, parentId);

      const fields: Partial<{
        name: string;
        description: string;
        categoryPath: string;
        tags: string[];
        config: Record<string, unknown>;
        aiAssistEnabled: boolean;
        defaultDurationMinutes: number;
        defaultRequiredAttempts: number;
      }> = {};
      if (patch.name !== undefined) fields.name = patch.name;
      if (patch.description !== undefined) fields.description = patch.description;
      if (patch.categoryPath !== undefined) fields.categoryPath = patch.categoryPath;
      if (patch.tags !== undefined) fields.tags = patch.tags;
      if (patch.aiAssistEnabled !== undefined)
        fields.aiAssistEnabled = patch.aiAssistEnabled;
      if (patch.defaultDurationMinutes !== undefined)
        fields.defaultDurationMinutes = patch.defaultDurationMinutes;
      if (patch.defaultRequiredAttempts !== undefined)
        fields.defaultRequiredAttempts = patch.defaultRequiredAttempts;

      // Re-validate against the SAME (handlerId, schemaVersion) the row was
      // created with — `config` shape can never drift from its validator.
      if (patch.config !== undefined) {
        try {
          fields.config = validateConfig(
            row.handlerId,
            row.schemaVersion,
            patch.config,
          ) as Record<string, unknown>;
        } catch (e) {
          if (e instanceof ZodError) throw toInvalidConfig(e, 'Invalid template config');
          throw e;
        }
      }

      const updated = await repo.update(id, fields);
      if (!updated) throw new TemplateNotFoundError('Template not found');
      return toTemplateDto(updated);
    },

    async archive(id: string, parentId: string): Promise<TaskTemplate> {
      const row = await loadOwned(id, parentId);
      if (row.isArchived) return toTemplateDto(row); // idempotent
      const updated = await repo.update(id, { isArchived: true });
      if (!updated) throw new TemplateNotFoundError('Template not found');
      return toTemplateDto(updated);
    },

    async restore(id: string, parentId: string): Promise<TaskTemplate> {
      const row = await loadOwned(id, parentId);
      if (!row.isArchived) return toTemplateDto(row);
      const updated = await repo.update(id, { isArchived: false });
      if (!updated) throw new TemplateNotFoundError('Template not found');
      return toTemplateDto(updated);
    },
  };
}

export type TemplatesService = ReturnType<typeof createTemplatesService>;
