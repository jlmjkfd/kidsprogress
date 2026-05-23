import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { v7 as uuidv7 } from 'uuid';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  attachments,
  tasks,
  type AttachmentRow,
  type Database_,
} from '@kidsprogress/db';
import type { AppConfig } from '../../config.js';
import { createLocalUploadStore, sniffAndMatch } from '../../lib/upload.js';
import { Readable } from 'node:stream';

const paramsSchema = z.object({ taskId: z.string().uuid() });
const attachmentParamsSchema = z.object({
  taskId: z.string().uuid(),
  attachmentId: z.string().uuid(),
});

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

function toDto(row: AttachmentRow) {
  return {
    id: row.id,
    taskId: row.taskId,
    completionId: row.completionId,
    kind: row.kind,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    originalFilename: row.originalFilename,
    createdAt: row.createdAt,
  };
}

export const attachmentsRoutes: FastifyPluginAsyncZod<{
  db: Database_;
  config: AppConfig;
}> = async function (app, opts) {
  const store = createLocalUploadStore({ rootPath: opts.config.UPLOADS_PATH });
  const MAX_BYTES = opts.config.UPLOAD_MAX_BYTES;

  // ── GET /api/tasks/:taskId/attachments ─────────────────────────────────
  app.get(
    '/api/tasks/:taskId/attachments',
    { schema: { params: paramsSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user) return reply.code(401).send({ error: 'Unauthorized' });
      const can = await canAccessTask(opts.db, request.params.taskId, user);
      if (!can) return reply.code(404).send({ error: 'NotFound' });

      const rows = await opts.db
        .select()
        .from(attachments)
        .where(eq(attachments.taskId, request.params.taskId));
      return { attachments: rows.map(toDto) };
    },
  );

  // ── POST /api/tasks/:taskId/attachments (multipart upload) ─────────────
  app.post('/api/tasks/:taskId/attachments', async (request, reply) => {
    const user = request.currentUser;
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });

    // Hand-validate params (this route doesn't take a JSON body, so we can't
    // declare params via the Zod type-provider without a body schema too).
    const taskId = (request.params as { taskId?: string }).taskId;
    if (!taskId || !/^[0-9a-f-]{36}$/i.test(taskId)) {
      return reply.code(400).send({ error: 'BadTaskId' });
    }
    const can = await canAccessTask(opts.db, taskId, user);
    if (!can) return reply.code(404).send({ error: 'NotFound' });

    const file = await request.file({ limits: { fileSize: MAX_BYTES, files: 1 } });
    if (!file) return reply.code(400).send({ error: 'NoFile' });

    // Read entire file into buffer (max 25 MiB by default; fine for NAS)
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of file.file) {
      chunks.push(chunk as Buffer);
      total += (chunk as Buffer).length;
      if (total > MAX_BYTES) {
        return reply.code(413).send({ error: 'TooLarge' });
      }
    }
    const buf = Buffer.concat(chunks);

    const sniff = sniffAndMatch(buf.subarray(0, 16), file.mimetype);
    if (!sniff.ok) {
      return reply.code(415).send({ error: 'UnsupportedMedia', reason: sniff.reason });
    }

    const id = uuidv7();
    const saved = await store.save({
      readable: Readable.from(buf),
      id,
      originalFilename: file.filename,
    });

    const [row] = await opts.db
      .insert(attachments)
      .values({
        id,
        taskId,
        completionId: null,
        uploaderUserId: user.role === 'parent' ? user.id : null,
        uploaderChildId: user.role === 'child' ? user.id : null,
        kind: sniff.kind,
        storagePath: saved.storagePath,
        mimeType: sniff.mime,
        fileSizeBytes: saved.sizeBytes,
        originalFilename: file.filename,
      })
      .returning();
    if (!row) return reply.code(500).send({ error: 'InsertFailed' });
    return reply.code(201).send(toDto(row));
  });

  // ── DELETE /api/tasks/:taskId/attachments/:attachmentId ────────────────
  app.delete(
    '/api/tasks/:taskId/attachments/:attachmentId',
    { schema: { params: attachmentParamsSchema } },
    async (request, reply) => {
      const user = request.currentUser;
      if (!user || user.role !== 'parent') return reply.code(401).send({ error: 'Unauthorized' });
      const can = await canAccessTask(opts.db, request.params.taskId, user);
      if (!can) return reply.code(404).send({ error: 'NotFound' });

      const [row] = await opts.db
        .select()
        .from(attachments)
        .where(
          and(
            eq(attachments.id, request.params.attachmentId),
            eq(attachments.taskId, request.params.taskId),
          ),
        )
        .limit(1);
      if (!row) return reply.code(404).send({ error: 'NotFound' });

      await store.delete(row.storagePath);
      await opts.db.delete(attachments).where(eq(attachments.id, row.id));
      return reply.code(204).send();
    },
  );
};
