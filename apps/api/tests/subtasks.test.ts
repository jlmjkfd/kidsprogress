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
    payload: { childId, title: 'T', scheduledDate: '2026-06-01' },
  });
  return { token, childId, taskId: t.json().id as string };
}

describe('subtasks', () => {
  let app: FastifyInstance;
  let cleanup: () => Promise<void>;
  beforeEach(async () => {
    const built = await buildTestApp();
    app = built.app;
    cleanup = built.cleanup;
  });
  afterEach(async () => cleanup());

  it('parent creates, lists, patches, deletes a subtask', async () => {
    const { token, taskId } = await setup(app);
    const headers = { authorization: `Bearer ${token}` };

    const create = await app.inject({
      method: 'POST',
      url: `/api/tasks/${taskId}/subtasks`,
      headers,
      payload: { title: 'Step 1', position: 0 },
    });
    expect(create.statusCode).toBe(201);
    const subId = create.json().id as string;

    const list = await app.inject({
      method: 'GET',
      url: `/api/tasks/${taskId}/subtasks`,
      headers,
    });
    expect(list.json().subtasks).toHaveLength(1);

    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${taskId}/subtasks/${subId}`,
      headers,
      payload: { title: 'Step 1 (revised)', isDone: true },
    });
    expect(patch.json().title).toBe('Step 1 (revised)');
    expect(patch.json().isDone).toBe(true);

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/tasks/${taskId}/subtasks/${subId}`,
      headers,
    });
    expect(del.statusCode).toBe(204);
  });

  it('parent B cannot manipulate parent A’s subtasks (IDOR)', async () => {
    const a = await setup(app, 'a@example.com');
    const b = await setup(app, 'b@example.com');
    const aHdr = { authorization: `Bearer ${a.token}` };
    const bHdr = { authorization: `Bearer ${b.token}` };

    const create = await app.inject({
      method: 'POST',
      url: `/api/tasks/${a.taskId}/subtasks`,
      headers: aHdr,
      payload: { title: 'x' },
    });
    const subId = create.json().id;

    expect(
      (await app.inject({
        method: 'GET',
        url: `/api/tasks/${a.taskId}/subtasks`,
        headers: bHdr,
      })).statusCode,
    ).toBe(404);

    expect(
      (await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${a.taskId}/subtasks/${subId}`,
        headers: bHdr,
        payload: { isDone: true },
      })).statusCode,
    ).toBe(404);

    expect(
      (await app.inject({
        method: 'DELETE',
        url: `/api/tasks/${a.taskId}/subtasks/${subId}`,
        headers: bHdr,
      })).statusCode,
    ).toBe(404);
  });
});
