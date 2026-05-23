import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { v7 as uuidv7 } from 'uuid';
import { and, asc, eq } from 'drizzle-orm';
import {
  collectionParamsSchema,
  createCollectionRequestSchema,
  updateCollectionRequestSchema,
  type TaskCollection,
} from '@kidsprogress/shared';
import {
  taskCollections,
  type Database_,
  type TaskCollectionRow,
} from '@kidsprogress/db';

function toDto(row: TaskCollectionRow): TaskCollection {
  return {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    color: row.color,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const collectionsRoutes: FastifyPluginAsyncZod<{ db: Database_ }> = async function (
  app,
  opts,
) {
  app.get('/api/collections', async (request, reply) => {
    const user = request.currentUser;
    if (!user || user.role !== 'parent') return reply.code(401).send({ error: 'Unauthorized' });
    const rows = await opts.db
      .select()
      .from(taskCollections)
      .where(eq(taskCollections.parentId, user.id))
      .orderBy(asc(taskCollections.position), asc(taskCollections.createdAt));
    return { collections: rows.map(toDto) };
  });

  app.post(
    '/api/collections',
    { schema: { body: createCollectionRequestSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user || user.role !== 'parent') return reply.code(401).send({ error: 'Unauthorized' });
      const [inserted] = await opts.db
        .insert(taskCollections)
        .values({
          id: uuidv7(),
          parentId: user.id,
          name: request.body.name,
          color: request.body.color ?? null,
          position: request.body.position ?? 0,
        })
        .returning();
      if (!inserted) return reply.code(500).send({ error: 'InsertFailed' });
      return reply.code(201).send(toDto(inserted));
    },
  );

  app.patch(
    '/api/collections/:collectionId',
    { schema: { params: collectionParamsSchema, body: updateCollectionRequestSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user || user.role !== 'parent') return reply.code(401).send({ error: 'Unauthorized' });
      const patch: Partial<{ name: string; color: string | null; position: number; updatedAt: string }> =
        { updatedAt: new Date().toISOString() };
      if (request.body.name !== undefined) patch.name = request.body.name;
      if (request.body.color !== undefined) patch.color = request.body.color;
      if (request.body.position !== undefined) patch.position = request.body.position;

      const [updated] = await opts.db
        .update(taskCollections)
        .set(patch)
        .where(
          and(
            eq(taskCollections.id, request.params.collectionId),
            eq(taskCollections.parentId, user.id),
          ),
        )
        .returning();
      if (!updated) return reply.code(404).send({ error: 'NotFound' });
      return toDto(updated);
    },
  );

  app.delete(
    '/api/collections/:collectionId',
    { schema: { params: collectionParamsSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user || user.role !== 'parent') return reply.code(401).send({ error: 'Unauthorized' });
      const r = await opts.db
        .delete(taskCollections)
        .where(
          and(
            eq(taskCollections.id, request.params.collectionId),
            eq(taskCollections.parentId, user.id),
          ),
        )
        .returning({ id: taskCollections.id });
      if (r.length === 0) return reply.code(404).send({ error: 'NotFound' });
      return reply.code(204).send();
    },
  );
};
