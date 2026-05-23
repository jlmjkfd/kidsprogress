import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/test-app.js';

async function registerParent(app: FastifyInstance, email = 'p@example.com') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'a-strong-pwd', displayName: 'P' },
  });
  return { token: res.json().tokens.accessToken as string };
}

async function createChild(app: FastifyInstance, token: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/children',
    headers: { authorization: `Bearer ${token}` },
    payload: { displayName: 'Alice' },
  });
  return res.json().id as string;
}

describe('tasks routes', () => {
  let app: FastifyInstance;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const built = await buildTestApp();
    app = built.app;
    cleanup = built.cleanup;
  });
  afterEach(async () => {
    await cleanup();
  });

  it('rejects unauthenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tasks' });
    expect(res.statusCode).toBe(401);
  });

  it('parent creates a one-off task; lists; gets; patches; deletes', async () => {
    const { token } = await registerParent(app);
    const childId = await createChild(app, token);
    const headers = { authorization: `Bearer ${token}` };

    const create = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers,
      payload: {
        childId,
        title: 'Read for 20 min',
        scheduledDate: '2026-06-01',
        durationMinutes: 20,
      },
    });
    expect(create.statusCode).toBe(201);
    const taskId = create.json().id as string;

    const list = await app.inject({ method: 'GET', url: '/api/tasks', headers });
    expect(list.json().tasks).toHaveLength(1);

    const get = await app.inject({ method: 'GET', url: `/api/tasks/${taskId}`, headers });
    expect(get.json().title).toBe('Read for 20 min');

    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${taskId}`,
      headers,
      payload: { title: 'Read for 30 min', durationMinutes: 30 },
    });
    expect(patch.json().title).toBe('Read for 30 min');
    expect(patch.json().durationMinutes).toBe(30);

    const del = await app.inject({ method: 'DELETE', url: `/api/tasks/${taskId}`, headers });
    expect(del.statusCode).toBe(204);
  });

  it('parent creates a recurring task with rule', async () => {
    const { token } = await registerParent(app);
    const childId = await createChild(app, token);
    const headers = { authorization: `Bearer ${token}` };

    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers,
      payload: {
        childId,
        title: 'Math practice',
        isRecurring: true,
        recurrenceRule: { freq: 'weekly', interval: 1, byWeekday: ['MO', 'WE', 'FR'] },
        durationMinutes: 15,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().isRecurring).toBe(true);
    expect(res.json().recurrenceRule.freq).toBe('weekly');
  });

  it('rejects when neither scheduledDate nor recurring', async () => {
    const { token } = await registerParent(app);
    const childId = await createChild(app, token);
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { childId, title: 'Nope' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('cannot assign a task to another parent’s child', async () => {
    const { token: tA } = await registerParent(app, 'a@example.com');
    const { token: tB } = await registerParent(app, 'b@example.com');
    const childOfA = await createChild(app, tA);
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: { authorization: `Bearer ${tB}` },
      payload: { childId: childOfA, title: 'X', scheduledDate: '2026-06-01' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('IDOR: parent B cannot read/patch/delete parent A’s task', async () => {
    const { token: tA } = await registerParent(app, 'a@example.com');
    const { token: tB } = await registerParent(app, 'b@example.com');
    const childOfA = await createChild(app, tA);
    const create = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: { authorization: `Bearer ${tA}` },
      payload: { childId: childOfA, title: 'Secret', scheduledDate: '2026-06-01' },
    });
    const taskId = create.json().id as string;

    expect(
      (await app.inject({
        method: 'GET',
        url: `/api/tasks/${taskId}`,
        headers: { authorization: `Bearer ${tB}` },
      })).statusCode,
    ).toBe(404);
    expect(
      (await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${taskId}`,
        headers: { authorization: `Bearer ${tB}` },
        payload: { title: 'Pwned' },
      })).statusCode,
    ).toBe(404);
    expect(
      (await app.inject({
        method: 'DELETE',
        url: `/api/tasks/${taskId}`,
        headers: { authorization: `Bearer ${tB}` },
      })).statusCode,
    ).toBe(404);
  });
});
