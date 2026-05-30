import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Database_ } from '@kidsprogress/db';
import { buildTestApp } from './helpers/test-app.js';
import { expandOccurrences } from '../src/modules/scheduling/expander.js';
import { materialize } from '../src/modules/scheduling/materialize.js';

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

async function setup(): Promise<{
  session: ParentSession;
  childId: string;
  templateId: string;
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
      name: 'Read a book',
      config: { steps: [] },
    },
  });
  return { session, childId, templateId: (tpl.json() as { id: string }).id };
}

async function createAssignment(
  session: ParentSession,
  templateId: string,
  childId: string,
  override: Record<string, unknown> = {},
): Promise<string> {
  const res = await app.inject({
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
      ...override,
    },
  });
  expect(res.statusCode).toBe(201);
  return (res.json() as { id: string }).id;
}

describe('expandOccurrences (unit)', () => {
  it('one-shot inside range → one virtual key', () => {
    const out = expandOccurrences(
      {
        id: 'a1',
        rrule: null,
        effectiveFrom: '2026-06-01T08:00:00.000Z',
        effectiveUntil: null,
      },
      { from: '2026-05-30T00:00:00.000Z', to: '2026-06-30T00:00:00.000Z' },
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'virtual', assignmentId: 'a1' });
  });

  it('one-shot outside range → empty', () => {
    const out = expandOccurrences(
      {
        id: 'a1',
        rrule: null,
        effectiveFrom: '2026-07-01T00:00:00.000Z',
        effectiveUntil: null,
      },
      { from: '2026-05-30T00:00:00.000Z', to: '2026-06-30T00:00:00.000Z' },
    );
    expect(out).toHaveLength(0);
  });

  it('daily rrule, 5-day window, no until → 5 occurrences', () => {
    const out = expandOccurrences(
      {
        id: 'a1',
        rrule: 'FREQ=DAILY;COUNT=10',
        effectiveFrom: '2026-06-01T08:00:00.000Z',
        effectiveUntil: null,
      },
      { from: '2026-06-01T00:00:00.000Z', to: '2026-06-05T23:59:59.000Z' },
    );
    expect(out).toHaveLength(5);
  });

  it('daily rrule clamped by effectiveUntil', () => {
    const out = expandOccurrences(
      {
        id: 'a1',
        rrule: 'FREQ=DAILY',
        effectiveFrom: '2026-06-01T08:00:00.000Z',
        effectiveUntil: '2026-06-03T08:00:00.000Z',
      },
      { from: '2026-06-01T00:00:00.000Z', to: '2026-06-10T00:00:00.000Z' },
    );
    // 3 days inclusive: 1st, 2nd, 3rd
    expect(out).toHaveLength(3);
  });

  it('invalid rrule → empty (no throw)', () => {
    const out = expandOccurrences(
      {
        id: 'a1',
        rrule: 'NOT-A-RULE',
        effectiveFrom: '2026-06-01T08:00:00.000Z',
        effectiveUntil: null,
      },
      { from: '2026-06-01T00:00:00.000Z', to: '2026-06-30T00:00:00.000Z' },
    );
    expect(out).toEqual([]);
  });
});

describe('materialize() chokepoint', () => {
  it('inserts a row idempotently — second call returns the same row', async () => {
    const { session, childId, templateId } = await setup();
    const assignmentId = await createAssignment(session, templateId, childId);
    const originalDate = '2026-06-01T08:00:00.000Z';

    const first = await materialize(db, { assignmentId, originalDate });
    const second = await materialize(db, { assignmentId, originalDate });
    expect(second.id).toBe(first.id);

    const { taskInstances } = await import('@kidsprogress/db');
    const { eq } = await import('drizzle-orm');
    const rows = await db
      .select()
      .from(taskInstances)
      .where(eq(taskInstances.assignmentId, assignmentId));
    expect(rows).toHaveLength(1);
  });

  it('uses occurrenceDate when supplied; else falls back to originalDate', async () => {
    const { session, childId, templateId } = await setup();
    const assignmentId = await createAssignment(session, templateId, childId);
    const row = await materialize(db, {
      assignmentId,
      originalDate: '2026-06-01T08:00:00.000Z',
      occurrenceDate: '2026-06-02T08:00:00.000Z',
    });
    expect(row.occurrenceDate).toBe('2026-06-02T08:00:00.000Z');
    expect(row.originalDate).toBe('2026-06-01T08:00:00.000Z');
  });
});

describe('GET /api/scheduling/calendar', () => {
  it('returns virtual occurrences for a recurring assignment', async () => {
    const { session, childId, templateId } = await setup();
    await createAssignment(session, templateId, childId, {
      rrule: 'FREQ=DAILY;COUNT=3',
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/scheduling/calendar?childId=${childId}&from=2026-06-01T00:00:00.000Z&to=2026-06-10T00:00:00.000Z`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      items: { kind: 'virtual' | 'materialized' }[];
    };
    expect(body.items.length).toBe(3);
    expect(body.items.every((i) => i.kind === 'virtual')).toBe(true);
  });

  it('materialized rows replace their virtual counterpart in the same range', async () => {
    const { session, childId, templateId } = await setup();
    const assignmentId = await createAssignment(session, templateId, childId, {
      rrule: 'FREQ=DAILY;COUNT=3',
    });
    // Materialize the first occurrence.
    await materialize(db, {
      assignmentId,
      originalDate: '2026-06-01T00:00:00.000Z',
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/scheduling/calendar?childId=${childId}&from=2026-06-01T00:00:00.000Z&to=2026-06-10T00:00:00.000Z`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    const body = res.json() as {
      items: { kind: 'virtual' | 'materialized'; originalDate: string }[];
    };
    expect(body.items.length).toBe(3);
    expect(body.items.filter((i) => i.kind === 'materialized')).toHaveLength(1);
    expect(body.items.filter((i) => i.kind === 'virtual')).toHaveLength(2);
  });

  it('cross-family read → 404', async () => {
    const a = await registerParent('a@example.com');
    const b = await registerParent('b@example.com');
    const bChild = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${b.accessToken}` },
      payload: { displayName: 'B-kid', avatarKey: 'avatar-01' },
    });
    const bChildId = (bChild.json() as { id: string }).id;
    const res = await app.inject({
      method: 'GET',
      url: `/api/scheduling/calendar?childId=${bChildId}&from=2026-06-01T00:00:00.000Z&to=2026-06-10T00:00:00.000Z`,
      headers: { authorization: `Bearer ${a.accessToken}` },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/scheduling/materialize', () => {
  it('parent can materialize an owned assignment', async () => {
    const { session, childId, templateId } = await setup();
    const assignmentId = await createAssignment(session, templateId, childId);
    const res = await app.inject({
      method: 'POST',
      url: '/api/scheduling/materialize',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { assignmentId, originalDate: '2026-06-01T00:00:00.000Z' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { instanceId: string };
    expect(body.instanceId).toBeTruthy();

    // Replay → same id.
    const replay = await app.inject({
      method: 'POST',
      url: '/api/scheduling/materialize',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { assignmentId, originalDate: '2026-06-01T00:00:00.000Z' },
    });
    expect((replay.json() as { instanceId: string }).instanceId).toBe(body.instanceId);
  });
});
