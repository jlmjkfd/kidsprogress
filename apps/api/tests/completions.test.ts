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
  return { token, childId: c.json().id as string };
}

describe('completions', () => {
  let app: FastifyInstance;
  let cleanup: () => Promise<void>;
  beforeEach(async () => {
    const built = await buildTestApp();
    app = built.app;
    cleanup = built.cleanup;
  });
  afterEach(async () => cleanup());

  it('parent sees only their own tasks’ completions', async () => {
    const a = await setup(app, 'a@example.com');
    const b = await setup(app, 'b@example.com');

    // Each parent creates a task and completes it
    for (const { token, childId } of [a, b]) {
      const headers = { authorization: `Bearer ${token}` };
      const t = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        headers,
        payload: { childId, title: 'T', scheduledDate: '2026-06-01' },
      });
      await app.inject({
        method: 'POST',
        url: `/api/tasks/${t.json().id}/complete`,
        headers,
        payload: { durationMinutes: 10 },
      });
    }

    const aList = await app.inject({
      method: 'GET',
      url: '/api/completions',
      headers: { authorization: `Bearer ${a.token}` },
    });
    expect(aList.statusCode).toBe(200);
    expect(aList.json().completions).toHaveLength(1);

    const bList = await app.inject({
      method: 'GET',
      url: '/api/completions',
      headers: { authorization: `Bearer ${b.token}` },
    });
    expect(bList.json().completions).toHaveLength(1);
    // Distinct ids
    expect(aList.json().completions[0].id).not.toBe(bList.json().completions[0].id);
  });

  it('parent cannot filter by another parent’s child', async () => {
    const a = await setup(app, 'a@example.com');
    const b = await setup(app, 'b@example.com');
    const res = await app.inject({
      method: 'GET',
      url: `/api/completions?childId=${a.childId}`,
      headers: { authorization: `Bearer ${b.token}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/completions' });
    expect(res.statusCode).toBe(401);
  });
});
