import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/test-app.js';
import { expandOccurrences } from '../src/modules/scheduling/expander.js';

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

interface ParentSession {
  accessToken: string;
  userId: string;
  familyId: string;
}

async function registerParent(email = 'parent@example.com'): Promise<ParentSession> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email,
      password: 'correct-horse-battery-staple',
      displayName: 'Alex',
    },
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

async function setupAssignment(
  session: ParentSession,
  rrule?: string,
): Promise<{ childId: string; assignmentId: string }> {
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
  const a = await app.inject({
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
      ...(rrule ? { rrule } : {}),
    },
  });
  return { childId, assignmentId: (a.json() as { id: string }).id };
}

describe('expandOccurrences with exceptions (unit)', () => {
  it('skip drops the matching virtual', () => {
    const out = expandOccurrences(
      {
        id: 'a1',
        rrule: 'FREQ=DAILY;COUNT=3',
        effectiveFrom: '2026-06-01T00:00:00.000Z',
        effectiveUntil: null,
      },
      { from: '2026-06-01T00:00:00.000Z', to: '2026-06-05T00:00:00.000Z' },
      [{ occurrenceDate: '2026-06-02T00:00:00.000Z', action: 'skip', rescheduledTo: null }],
    );
    expect(out).toHaveLength(2);
    expect(out.map((k) => k.originalDate).sort()).toEqual([
      '2026-06-01T00:00:00.000Z',
      '2026-06-03T00:00:00.000Z',
    ]);
  });

  it('reschedule moves an occurrence to a new date inside the window', () => {
    const out = expandOccurrences(
      {
        id: 'a1',
        rrule: 'FREQ=DAILY;COUNT=3',
        effectiveFrom: '2026-06-01T00:00:00.000Z',
        effectiveUntil: null,
      },
      { from: '2026-06-01T00:00:00.000Z', to: '2026-06-05T00:00:00.000Z' },
      [
        {
          occurrenceDate: '2026-06-02T00:00:00.000Z',
          action: 'reschedule',
          rescheduledTo: '2026-06-04T00:00:00.000Z',
        },
      ],
    );
    expect(out).toHaveLength(3);
    const moved = out.find((k) =>
      k.kind === 'virtual' && k.originalDate === '2026-06-02T00:00:00.000Z',
    ) as Extract<(typeof out)[number], { kind: 'virtual' }>;
    expect(moved.rescheduledTo).toBe('2026-06-04T00:00:00.000Z');
  });

  it('reschedule that lands OUTSIDE the window drops the occurrence', () => {
    const out = expandOccurrences(
      {
        id: 'a1',
        rrule: 'FREQ=DAILY;COUNT=3',
        effectiveFrom: '2026-06-01T00:00:00.000Z',
        effectiveUntil: null,
      },
      { from: '2026-06-01T00:00:00.000Z', to: '2026-06-02T23:59:59.000Z' },
      [
        {
          occurrenceDate: '2026-06-02T00:00:00.000Z',
          action: 'reschedule',
          rescheduledTo: '2026-06-10T00:00:00.000Z',
        },
      ],
    );
    expect(out.map((k) => k.originalDate).sort()).toEqual([
      '2026-06-01T00:00:00.000Z',
    ]);
  });
});

describe('POST /api/scheduling/exceptions', () => {
  it('skip exception removes the day from the calendar', async () => {
    const session = await registerParent();
    const { childId, assignmentId } = await setupAssignment(
      session,
      'FREQ=DAILY;COUNT=5',
    );

    const before = await app.inject({
      method: 'GET',
      url: `/api/scheduling/calendar?childId=${childId}&from=2026-06-01T00:00:00.000Z&to=2026-06-10T00:00:00.000Z`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect((before.json() as { items: unknown[] }).items).toHaveLength(5);

    const skip = await app.inject({
      method: 'POST',
      url: '/api/scheduling/exceptions',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: {
        assignmentId,
        originalDate: '2026-06-03T00:00:00.000Z',
        action: 'skip',
      },
    });
    expect(skip.statusCode).toBe(201);

    const after = await app.inject({
      method: 'GET',
      url: `/api/scheduling/calendar?childId=${childId}&from=2026-06-01T00:00:00.000Z&to=2026-06-10T00:00:00.000Z`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect((after.json() as { items: unknown[] }).items).toHaveLength(4);
  });

  it('reschedule moves the day and re-fetching shows the new date', async () => {
    const session = await registerParent();
    const { childId, assignmentId } = await setupAssignment(
      session,
      'FREQ=DAILY;COUNT=3',
    );
    await app.inject({
      method: 'POST',
      url: '/api/scheduling/exceptions',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: {
        assignmentId,
        originalDate: '2026-06-02T00:00:00.000Z',
        action: 'reschedule',
        rescheduledTo: '2026-06-05T00:00:00.000Z',
      },
    });
    const cal = await app.inject({
      method: 'GET',
      url: `/api/scheduling/calendar?childId=${childId}&from=2026-06-01T00:00:00.000Z&to=2026-06-10T00:00:00.000Z`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    const items = (cal.json() as { items: { originalDate: string; rescheduledTo?: string }[] }).items;
    const moved = items.find((i) => i.originalDate === '2026-06-02T00:00:00.000Z');
    expect(moved).toBeDefined();
    expect(moved!.rescheduledTo).toBe('2026-06-05T00:00:00.000Z');
  });

  it('flipping skip → reschedule overwrites the same row (upsert)', async () => {
    const session = await registerParent();
    const { childId, assignmentId } = await setupAssignment(
      session,
      'FREQ=DAILY;COUNT=5',
    );
    await app.inject({
      method: 'POST',
      url: '/api/scheduling/exceptions',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: {
        assignmentId,
        originalDate: '2026-06-03T00:00:00.000Z',
        action: 'skip',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/api/scheduling/exceptions',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: {
        assignmentId,
        originalDate: '2026-06-03T00:00:00.000Z',
        action: 'reschedule',
        rescheduledTo: '2026-06-04T00:00:00.000Z',
      },
    });
    const cal = await app.inject({
      method: 'GET',
      url: `/api/scheduling/calendar?childId=${childId}&from=2026-06-01T00:00:00.000Z&to=2026-06-10T00:00:00.000Z`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    const items = (cal.json() as { items: { originalDate: string; rescheduledTo?: string }[] }).items;
    // The skip should be gone; reschedule should be present.
    const rescheduled = items.find(
      (i) => i.originalDate === '2026-06-03T00:00:00.000Z',
    );
    expect(rescheduled?.rescheduledTo).toBe('2026-06-04T00:00:00.000Z');
    // Count should be back to 5 (skip removed, reschedule visible).
    expect(items).toHaveLength(5);
  });

  it('DELETE removes the exception — virtual reappears at the original date', async () => {
    const session = await registerParent();
    const { childId, assignmentId } = await setupAssignment(
      session,
      'FREQ=DAILY;COUNT=3',
    );
    await app.inject({
      method: 'POST',
      url: '/api/scheduling/exceptions',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: {
        assignmentId,
        originalDate: '2026-06-02T00:00:00.000Z',
        action: 'skip',
      },
    });
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/scheduling/exceptions?assignmentId=${assignmentId}&originalDate=${encodeURIComponent('2026-06-02T00:00:00.000Z')}`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(del.statusCode).toBe(204);
    const cal = await app.inject({
      method: 'GET',
      url: `/api/scheduling/calendar?childId=${childId}&from=2026-06-01T00:00:00.000Z&to=2026-06-10T00:00:00.000Z`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect((cal.json() as { items: unknown[] }).items).toHaveLength(3);
  });

  it('cross-family exception → 404', async () => {
    const a = await registerParent('a@example.com');
    const b = await registerParent('b@example.com');
    const { assignmentId } = await setupAssignment(b);
    const res = await app.inject({
      method: 'POST',
      url: '/api/scheduling/exceptions',
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: {
        assignmentId,
        originalDate: '2026-06-02T00:00:00.000Z',
        action: 'skip',
      },
    });
    expect(res.statusCode).toBe(404);
  });
});
