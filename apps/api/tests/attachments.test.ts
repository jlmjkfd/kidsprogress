import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/test-app.js';
import FormData from 'form-data';

// Minimal valid PNG (1x1 transparent).
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// Append an IHDR-ish stub (enough bytes for the test).
const PNG_BUF = Buffer.concat([PNG_HEADER, Buffer.alloc(64, 0)]);
// "Pretend to be PNG" — EXE-style (MZ header)
const EXE_BUF = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);

async function setup(app: FastifyInstance, email = 'p@example.com') {
  const reg = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'a-strong-pwd', displayName: 'P' },
  });
  const token = reg.json().tokens.accessToken as string;
  const c = await app.inject({
    method: 'POST',
    url: '/api/children',
    headers: { authorization: `Bearer ${token}` },
    payload: { displayName: 'Kid' },
  });
  const childId = c.json().id as string;
  const t = await app.inject({
    method: 'POST',
    url: '/api/tasks',
    headers: { authorization: `Bearer ${token}` },
    payload: { childId, title: 'T', scheduledDate: '2026-06-01' },
  });
  return { token, childId, taskId: t.json().id as string };
}

async function uploadFile(
  app: FastifyInstance,
  taskId: string,
  token: string,
  buf: Buffer,
  filename: string,
  mime: string,
) {
  const form = new FormData();
  form.append('file', buf, { filename, contentType: mime });
  const headers = { ...form.getHeaders(), authorization: `Bearer ${token}` };
  return app.inject({
    method: 'POST',
    url: `/api/tasks/${taskId}/attachments`,
    headers,
    payload: form.getBuffer(),
  });
}

describe('attachments', () => {
  let app: FastifyInstance;
  let cleanup: () => Promise<void>;
  beforeEach(async () => {
    const built = await buildTestApp();
    app = built.app;
    cleanup = built.cleanup;
  });
  afterEach(async () => cleanup());

  it('parent uploads a valid PNG and lists it', async () => {
    const { token, taskId } = await setup(app);
    const up = await uploadFile(app, taskId, token, PNG_BUF, 'a.png', 'image/png');
    expect(up.statusCode).toBe(201);
    expect(up.json().kind).toBe('image');
    expect(up.json().mimeType).toBe('image/png');

    const list = await app.inject({
      method: 'GET',
      url: `/api/tasks/${taskId}/attachments`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(list.json().attachments).toHaveLength(1);
  });

  it('rejects MIME mismatch (EXE claimed as image/png)', async () => {
    const { token, taskId } = await setup(app);
    const up = await uploadFile(app, taskId, token, EXE_BUF, 'evil.png', 'image/png');
    expect(up.statusCode).toBe(415);
  });

  it('rejects unknown content', async () => {
    const { token, taskId } = await setup(app);
    const up = await uploadFile(
      app,
      taskId,
      token,
      Buffer.from('not a real format'),
      'x.txt',
      'text/plain',
    );
    expect(up.statusCode).toBe(415);
  });

  it('parent B cannot upload to parent A’s task', async () => {
    const a = await setup(app, 'a@example.com');
    const b = await setup(app, 'b@example.com');
    const up = await uploadFile(app, a.taskId, b.token, PNG_BUF, 'a.png', 'image/png');
    expect(up.statusCode).toBe(404);
  });

  it('unauthenticated upload → 401', async () => {
    const { taskId } = await setup(app);
    const form = new FormData();
    form.append('file', PNG_BUF, { filename: 'a.png', contentType: 'image/png' });
    const res = await app.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/attachments`,
      headers: form.getHeaders(),
      payload: form.getBuffer(),
    });
    expect(res.statusCode).toBe(401);
  });

  it('parent deletes own attachment', async () => {
    const { token, taskId } = await setup(app);
    const up = await uploadFile(app, taskId, token, PNG_BUF, 'a.png', 'image/png');
    const attId = up.json().id;
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/tasks/${taskId}/attachments/${attId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(del.statusCode).toBe(204);
  });
});
