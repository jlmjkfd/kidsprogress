import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/test-app.js';

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
    payload: { childId, title: 'Writing', scheduledDate: '2026-06-01' },
  });
  return { token, childId, taskId: t.json().id as string };
}

describe('task sessions', () => {
  let app: FastifyInstance;
  let cleanup: () => Promise<void>;
  beforeEach(async () => {
    const built = await buildTestApp();
    app = built.app;
    cleanup = built.cleanup;
  });
  afterEach(async () => cleanup());

  it('start → save → resume returns same session', async () => {
    const { token, taskId } = await setup(app);
    const headers = { authorization: `Bearer ${token}` };

    const start = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      headers,
      payload: { taskId, payload: { text: 'Once' } },
    });
    expect(start.statusCode).toBe(201);
    const sessionId = start.json().id as string;

    const save = await app.inject({
      method: 'PATCH',
      url: `/api/sessions/${sessionId}`,
      headers,
      payload: { payload: { text: 'Once upon a time' } },
    });
    expect(save.statusCode).toBe(200);
    expect(save.json().payload.text).toBe('Once upon a time');

    const resume = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      headers,
      payload: { taskId },
    });
    expect(resume.statusCode).toBe(200);
    expect(resume.json().id).toBe(sessionId);
    expect(resume.json().payload.text).toBe('Once upon a time');
  });

  it('cannot save after abandon', async () => {
    const { token, taskId } = await setup(app);
    const headers = { authorization: `Bearer ${token}` };

    const start = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      headers,
      payload: { taskId },
    });
    const sessionId = start.json().id;

    await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/abandon`,
      headers,
    });

    const save = await app.inject({
      method: 'PATCH',
      url: `/api/sessions/${sessionId}`,
      headers,
      payload: { payload: { text: 'late' } },
    });
    expect(save.statusCode).toBe(409);
  });

  it('parent B cannot save into parent A’s session', async () => {
    const a = await setup(app, 'a@example.com');
    const b = await setup(app, 'b@example.com');

    const start = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      headers: { authorization: `Bearer ${a.token}` },
      payload: { taskId: a.taskId },
    });
    const sessionId = start.json().id;

    const save = await app.inject({
      method: 'PATCH',
      url: `/api/sessions/${sessionId}`,
      headers: { authorization: `Bearer ${b.token}` },
      payload: { payload: { text: 'pwned' } },
    });
    expect(save.statusCode).toBe(404);
  });
});
