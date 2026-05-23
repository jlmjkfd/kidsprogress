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

describe('GET /api/tasks/instances', () => {
  let app: FastifyInstance;
  let cleanup: () => Promise<void>;
  beforeEach(async () => {
    const built = await buildTestApp();
    app = built.app;
    cleanup = built.cleanup;
  });
  afterEach(async () => cleanup());

  it('returns one-off + expanded recurring instances, with completion + skip flags', async () => {
    const { token, childId } = await setup(app);
    const headers = { authorization: `Bearer ${token}` };

    // One-off on 2026-06-02 (Tue)
    const t1 = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers,
      payload: { childId, title: 'Read', scheduledDate: '2026-06-02' },
    });

    // Recurring: MWF starting Mon 2026-06-01
    const t2 = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers,
      payload: {
        childId,
        title: 'Math',
        isRecurring: true,
        recurrenceRule: { freq: 'weekly', interval: 1, byWeekday: ['MO', 'WE', 'FR'] },
        scheduledDate: '2026-06-01',
      },
    });
    const taskId2 = t2.json().id as string;

    // Complete the Wed (06-03) occurrence
    await app.inject({
      method: 'POST',
      url: `/api/tasks/${taskId2}/complete`,
      headers,
      payload: { occurrenceDate: '2026-06-03' },
    });
    // Skip Fri (06-05)
    await app.inject({
      method: 'POST',
      url: `/api/tasks/${taskId2}/skip`,
      headers,
      payload: { occurrenceDate: '2026-06-05' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/tasks/instances?childId=${childId}&fromDate=2026-06-01&toDate=2026-06-07`,
      headers,
    });
    expect(res.statusCode).toBe(200);
    const inst = res.json().instances;
    // One-off (06-02) + MWF in that week (06-01, 06-03, 06-05)
    expect(inst).toHaveLength(4);

    const byDate = new Map<string, (typeof inst)[number]>();
    for (const i of inst) byDate.set(`${i.occurrenceDate}|${i.title}`, i);
    expect(byDate.get('2026-06-03|Math')?.isCompleted).toBe(true);
    expect(byDate.get('2026-06-05|Math')?.isSkipped).toBe(true);

    // Avoid unused linter complaint
    void t1;
  });

  it('parent cannot query another parent’s child', async () => {
    const a = await setup(app, 'a@example.com');
    const b = await setup(app, 'b@example.com');
    const res = await app.inject({
      method: 'GET',
      url: `/api/tasks/instances?childId=${a.childId}&fromDate=2026-06-01&toDate=2026-06-07`,
      headers: { authorization: `Bearer ${b.token}` },
    });
    expect(res.statusCode).toBe(404);
  });
});
