import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Database_ } from '@kidsprogress/db';
import { buildTestApp } from './helpers/test-app.js';

let app: FastifyInstance;
let db: Database_;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  const built = await buildTestApp();
  app = built.app;
  db = built.db;
  cleanup = built.cleanup;
});

afterEach(async () => {
  await cleanup();
});

interface ParentSession {
  accessToken: string;
  userId: string;
  familyId: string;
}

async function registerParent(email = 'parent@example.com'): Promise<ParentSession> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'correct-horse-battery', displayName: 'Alex' },
  });
  expect(res.statusCode).toBe(201);
  const body = res.json() as {
    user: { id: string; familyId: string };
    tokens: { accessToken: string };
  };
  return {
    accessToken: body.tokens.accessToken,
    userId: body.user.id,
    familyId: body.user.familyId,
  };
}

async function setupAndStart(): Promise<{
  session: ParentSession;
  instanceId: string;
  assignmentId: string;
  templateId: string;
  childId: string;
}> {
  const session = await registerParent();
  const child = await app.inject({
    method: 'POST',
    url: '/api/children',
    headers: { authorization: `Bearer ${session.accessToken}` },
    payload: { displayName: 'Mia', avatarKey: 'avatar-01' },
  });
  const childId = (child.json() as { id: string }).id;
  const tpl = await app.inject({
    method: 'POST',
    url: '/api/templates',
    headers: { authorization: `Bearer ${session.accessToken}` },
    payload: {
      handlerId: 'generic',
      schemaVersion: 1,
      name: 'Read',
      config: { steps: [] },
    },
  });
  const templateId = (tpl.json() as { id: string }).id;
  const assignment = await app.inject({
    method: 'POST',
    url: '/api/assignments',
    headers: { authorization: `Bearer ${session.accessToken}` },
    payload: {
      templateId,
      childId,
      timezone: 'Asia/Shanghai',
      effectiveFrom: '2026-06-01T00:00:00.000Z',
      schedulingType: 'flexible',
      obligation: 'required',
    },
  });
  const assignmentId = (assignment.json() as { id: string }).id;
  const started = await app.inject({
    method: 'POST',
    url: '/api/instances/transition',
    headers: { authorization: `Bearer ${session.accessToken}` },
    payload: {
      assignmentId,
      originalDate: '2026-06-01T00:00:00.000Z',
      action: 'start',
    },
  });
  const instanceId = (started.json() as { id: string }).id;
  return { session, instanceId, assignmentId, templateId, childId };
}

const BASIC_PROGRESS = {
  pluginVersion: 1,
  progressState: {
    templateData: { lastQuestionIndex: 3, correct: 2 },
    toolStates: { timer: { elapsed: 90 } },
  },
};

describe('PUT /api/instances/:instanceId/session', () => {
  it('upserts an active session row, stamps lastSavedAt', async () => {
    const { session, instanceId } = await setupAndStart();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/instances/${instanceId}/session`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: BASIC_PROGRESS,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      progressState: { templateData: { correct: number } };
      lastSavedAt: string;
    };
    expect(body.progressState.templateData.correct).toBe(2);
    expect(new Date(body.lastSavedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('second save updates the same row (no duplicate active session)', async () => {
    const { session, instanceId } = await setupAndStart();
    const first = await app.inject({
      method: 'PUT',
      url: `/api/instances/${instanceId}/session`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: BASIC_PROGRESS,
    });
    const firstId = (first.json() as { id: string }).id;

    const second = await app.inject({
      method: 'PUT',
      url: `/api/instances/${instanceId}/session`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: {
        ...BASIC_PROGRESS,
        progressState: {
          templateData: { lastQuestionIndex: 5, correct: 4 },
          toolStates: {},
        },
      },
    });
    expect((second.json() as { id: string }).id).toBe(firstId);

    const { taskSessions } = await import('@kidsprogress/db');
    const { eq } = await import('drizzle-orm');
    const rows = await db
      .select()
      .from(taskSessions)
      .where(eq(taskSessions.instanceId, instanceId));
    expect(rows).toHaveLength(1);
  });

  it('pluginVersion mismatch → 409', async () => {
    const { session, instanceId } = await setupAndStart();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/instances/${instanceId}/session`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { ...BASIC_PROGRESS, pluginVersion: 99 },
    });
    expect(res.statusCode).toBe(409);
  });

  it('cross-family save → 404', async () => {
    const other = await registerParent('other@example.com');
    const { instanceId } = await setupAndStart();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/instances/${instanceId}/session`,
      headers: { authorization: `Bearer ${other.accessToken}` },
      payload: BASIC_PROGRESS,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/instances/:instanceId/session', () => {
  it('returns the active session or null', async () => {
    const { session, instanceId } = await setupAndStart();
    const empty = await app.inject({
      method: 'GET',
      url: `/api/instances/${instanceId}/session`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toBeNull();

    await app.inject({
      method: 'PUT',
      url: `/api/instances/${instanceId}/session`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: BASIC_PROGRESS,
    });

    const fetched = await app.inject({
      method: 'GET',
      url: `/api/instances/${instanceId}/session`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(fetched.statusCode).toBe(200);
    expect(
      (fetched.json() as { progressState: { templateData: { correct: number } } })
        .progressState.templateData.correct,
    ).toBe(2);
  });
});

describe('instance completion burns the session', () => {
  it('complete transition sets completedAt on the session', async () => {
    const { session, instanceId, assignmentId } = await setupAndStart();
    await app.inject({
      method: 'PUT',
      url: `/api/instances/${instanceId}/session`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: BASIC_PROGRESS,
    });

    await app.inject({
      method: 'POST',
      url: '/api/instances/transition',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: {
        assignmentId,
        originalDate: '2026-06-01T00:00:00.000Z',
        action: 'complete',
      },
    });

    const after = await app.inject({
      method: 'GET',
      url: `/api/instances/${instanceId}/session`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    // Active session lookup must now return null because completedAt is set.
    expect(after.json()).toBeNull();
  });
});
