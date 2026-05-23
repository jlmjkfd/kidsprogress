import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  childParamsSchema,
  createChildRequestSchema,
  updateChildRequestSchema,
  type Child,
} from '@kidsprogress/shared';
import type { ChildRow, Database_ } from '@kidsprogress/db';
import { v7 as uuidv7 } from 'uuid';
import { makeHasher } from '../../lib/argon2.js';
import type { AppConfig } from '../../config.js';
import { createChildrenRepo } from './children.repo.js';

function toDto(row: ChildRow): Child {
  return {
    id: row.id,
    parentId: row.parentId,
    displayName: row.displayName,
    birthDate: row.birthDate,
    grade: row.grade,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const childrenRoutes: FastifyPluginAsyncZod<{
  db: Database_;
  config: AppConfig;
}> = async function (app, opts) {
  const repo = createChildrenRepo(opts.db);
  const hasher = makeHasher(opts.config);

  // ── GET /api/children ──────────────────────────────────────────────────
  app.get('/api/children', async (request, reply) => {
      const parentId = request.currentUser?.id;
      if (!parentId) return reply.code(401).send({ error: 'Unauthorized' });
      const rows = await repo.listByParent(parentId);
      return { children: rows.map(toDto) };
    },
  );
  // (response schema intentionally omitted: TS narrows reply.code() to declared
  // status codes, which conflicts with returning 401 from the auth check above.)

  // ── POST /api/children ─────────────────────────────────────────────────
  app.post(
    '/api/children',
    { schema: { body: createChildRequestSchema } },
    async (request, reply) => {
      const parentId = request.currentUser?.id;
      if (!parentId) return reply.code(401).send({ error: 'Unauthorized' });

      const body = request.body;
      const pinHash = body.pin ? await hasher.hash(body.pin) : null;
      const row = await repo.insert({
        id: uuidv7(),
        parentId,
        displayName: body.displayName,
        birthDate: body.birthDate ?? null,
        grade: body.grade ?? null,
        avatarUrl: body.avatarUrl ?? null,
        pinHash,
      });
      return reply.code(201).send(toDto(row));
    },
  );

  // ── GET /api/children/:childId ─────────────────────────────────────────
  app.get(
    '/api/children/:childId',
    { schema: { params: childParamsSchema } },
    async (request, reply) => {
      const parentId = request.currentUser?.id;
      if (!parentId) return reply.code(401).send({ error: 'Unauthorized' });
      const row = await repo.findByIdForParent(request.params.childId, parentId);
      if (!row) return reply.code(404).send({ error: 'NotFound' });
      return toDto(row);
    },
  );

  // ── PATCH /api/children/:childId ───────────────────────────────────────
  app.patch(
    '/api/children/:childId',
    {
      schema: { params: childParamsSchema, body: updateChildRequestSchema },
    },
    async (request, reply) => {
      const parentId = request.currentUser?.id;
      if (!parentId) return reply.code(401).send({ error: 'Unauthorized' });
      const body = request.body;
      const patch: Partial<{
        displayName: string;
        birthDate: string | null;
        grade: string | null;
        avatarUrl: string | null;
        pinHash: string;
      }> = {};
      if (body.displayName !== undefined) patch.displayName = body.displayName;
      if (body.birthDate !== undefined) patch.birthDate = body.birthDate;
      if (body.grade !== undefined) patch.grade = body.grade;
      if (body.avatarUrl !== undefined) patch.avatarUrl = body.avatarUrl;
      if (body.pin !== undefined) patch.pinHash = await hasher.hash(body.pin);
      const updated = await repo.update(request.params.childId, parentId, patch);
      if (!updated) return reply.code(404).send({ error: 'NotFound' });
      return toDto(updated);
    },
  );

  // ── DELETE /api/children/:childId ──────────────────────────────────────
  app.delete(
    '/api/children/:childId',
    { schema: { params: childParamsSchema } },
    async (request, reply) => {
      const parentId = request.currentUser?.id;
      if (!parentId) return reply.code(401).send({ error: 'Unauthorized' });
      const ok = await repo.delete(request.params.childId, parentId);
      if (!ok) return reply.code(404).send({ error: 'NotFound' });
      return reply.code(204).send();
    },
  );
};
