import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/test-app.js';

async function setup(app: FastifyInstance) {
  const reg = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email: 'p@example.com', password: 'a-strong-pwd', displayName: 'P' },
  });
  const token = reg.json().tokens.accessToken as string;
  const childRes = await app.inject({
    method: 'POST',
    url: '/api/children',
    headers: { authorization: `Bearer ${token}` },
    payload: { displayName: 'Alice' },
  });
  return { token, childId: childRes.json().id as string };
}

async function createOneOff(app: FastifyInstance, token: string, childId: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/tasks',
    headers: { authorization: `Bearer ${token}` },
    payload: { childId, title: 'T', scheduledDate: '2026-06-01' },
  });
  return res.json().id as string;
}

async function createRecurring(app: FastifyInstance, token: string, childId: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/tasks',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      childId,
      title: 'R',
      isRecurring: true,
      recurrenceRule: { freq: 'daily', interval: 1 },
    },
  });
  return res.json().id as string;
}

describe('task lifecycle', () => {
  let app: FastifyInstance;
  let cleanup: () => Promise<void>;
  beforeEach(async () => {
    const built = await buildTestApp();
    app = built.app;
    cleanup = built.cleanup;
  });
  afterEach(async () => cleanup());

  it('one-off: pending → in_progress → completed', async () => {
    const { token, childId } = await setup(app);
    const taskId = await createOneOff(app, token, childId);
    const headers = { authorization: `Bearer ${token}` };

    const start = await app.inject({ method: 'POST', url: `/api/tasks/${taskId}/start`, headers });
    expect(start.statusCode).toBe(200);
    expect(start.json().status).toBe('in_progress');

    const complete = await app.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/complete`,
      headers,
      payload: { durationMinutes: 18, score: 92 },
    });
    expect(complete.statusCode).toBe(200);
    expect(complete.json().task.status).toBe('completed');
    expect(complete.json().completionId).toBeTruthy();
  });

  it('one-off: cannot complete twice', async () => {
    const { token, childId } = await setup(app);
    const taskId = await createOneOff(app, token, childId);
    const headers = { authorization: `Bearer ${token}` };

    await app.inject({ method: 'POST', url: `/api/tasks/${taskId}/complete`, headers, payload: {} });
    const again = await app.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/complete`,
      headers,
      payload: {},
    });
    expect(again.statusCode).toBe(409);
  });

  it('one-off: skip', async () => {
    const { token, childId } = await setup(app);
    const taskId = await createOneOff(app, token, childId);
    const skip = await app.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/skip`,
      headers: { authorization: `Bearer ${token}` },
      payload: { reason: 'sick' },
    });
    expect(skip.statusCode).toBe(200);
    expect(skip.json().status).toBe('skipped');
  });

  it('recurring: complete requires occurrenceDate', async () => {
    const { token, childId } = await setup(app);
    const taskId = await createRecurring(app, token, childId);
    const headers = { authorization: `Bearer ${token}` };

    const missing = await app.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/complete`,
      headers,
      payload: {},
    });
    expect(missing.statusCode).toBe(400);

    const ok = await app.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/complete`,
      headers,
      payload: { occurrenceDate: '2026-06-01', durationMinutes: 12 },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().completionId).toBeTruthy();
  });

  it('recurring: complete twice (different dates) records two completions', async () => {
    const { token, childId } = await setup(app);
    const taskId = await createRecurring(app, token, childId);
    const headers = { authorization: `Bearer ${token}` };
    const r1 = await app.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/complete`,
      headers,
      payload: { occurrenceDate: '2026-06-01' },
    });
    const r2 = await app.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/complete`,
      headers,
      payload: { occurrenceDate: '2026-06-02' },
    });
    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
    expect(r1.json().completionId).not.toBe(r2.json().completionId);
  });

  it('recurring: skip writes an exception', async () => {
    const { token, childId } = await setup(app);
    const taskId = await createRecurring(app, token, childId);
    const r = await app.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/skip`,
      headers: { authorization: `Bearer ${token}` },
      payload: { occurrenceDate: '2026-06-03', reason: 'holiday' },
    });
    expect(r.statusCode).toBe(200);
  });

  it('cannot start someone else’s task', async () => {
    const { token: tA, childId: cA } = await setup(app);
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'b@example.com', password: 'a-strong-pwd', displayName: 'B' },
    });
    const tB = reg.json().tokens.accessToken as string;
    const taskId = await createOneOff(app, tA, cA);
    const r = await app.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/start`,
      headers: { authorization: `Bearer ${tB}` },
    });
    expect(r.statusCode).toBe(404);
  });
});
