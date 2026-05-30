import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/test-app.js';
import {
  applyTransition,
  nextEffectOrNull,
} from '../src/modules/instances/state-machine.js';

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
  assignmentId: string;
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
      name: 'Practice piano',
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
  return {
    session,
    assignmentId: (assignment.json() as { id: string }).id,
    childId,
  };
}

describe('state machine (unit)', () => {
  it('pending → in_progress on start; sets startedAt', () => {
    const eff = nextEffectOrNull('pending', 'start');
    expect(eff).not.toBeNull();
    const patch = applyTransition(
      { status: 'pending' } as never,
      eff!,
    );
    expect(patch.status).toBe('in_progress');
    expect(typeof patch.startedAt).toBe('string');
  });

  it('in_progress → completed on complete; sets completedAt', () => {
    const eff = nextEffectOrNull('in_progress', 'complete');
    expect(eff).not.toBeNull();
    const patch = applyTransition(
      { status: 'in_progress' } as never,
      eff!,
    );
    expect(patch.status).toBe('completed');
    expect(typeof patch.completedAt).toBe('string');
  });

  it('cannot complete from pending', () => {
    expect(nextEffectOrNull('pending', 'complete')).toBeNull();
  });

  it('cannot transition out of terminal states', () => {
    expect(nextEffectOrNull('completed', 'start')).toBeNull();
    expect(nextEffectOrNull('skipped', 'start')).toBeNull();
    expect(nextEffectOrNull('abandoned', 'complete')).toBeNull();
  });
});

describe('POST /api/instances/transition', () => {
  it('start materializes + flips to in_progress', async () => {
    const { session, assignmentId } = await setup();
    const res = await app.inject({
      method: 'POST',
      url: '/api/instances/transition',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: {
        assignmentId,
        originalDate: '2026-06-01T00:00:00.000Z',
        action: 'start',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { status: string; startedAt: string | null };
    expect(body.status).toBe('in_progress');
    expect(body.startedAt).not.toBeNull();
  });

  it('start → complete sets completedAt', async () => {
    const { session, assignmentId } = await setup();
    await app.inject({
      method: 'POST',
      url: '/api/instances/transition',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: {
        assignmentId,
        originalDate: '2026-06-01T00:00:00.000Z',
        action: 'start',
      },
    });
    const done = await app.inject({
      method: 'POST',
      url: '/api/instances/transition',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: {
        assignmentId,
        originalDate: '2026-06-01T00:00:00.000Z',
        action: 'complete',
      },
    });
    expect(done.statusCode).toBe(200);
    const body = done.json() as { status: string; completedAt: string | null };
    expect(body.status).toBe('completed');
    expect(body.completedAt).not.toBeNull();
  });

  it('complete from pending → 409', async () => {
    const { session, assignmentId } = await setup();
    const res = await app.inject({
      method: 'POST',
      url: '/api/instances/transition',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: {
        assignmentId,
        originalDate: '2026-06-01T00:00:00.000Z',
        action: 'complete',
      },
    });
    expect(res.statusCode).toBe(409);
  });

  it('skip from pending → status skipped', async () => {
    const { session, assignmentId } = await setup();
    const res = await app.inject({
      method: 'POST',
      url: '/api/instances/transition',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: {
        assignmentId,
        originalDate: '2026-06-01T00:00:00.000Z',
        action: 'skip',
      },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { status: string }).status).toBe('skipped');
  });

  it('cross-family assignment → 404', async () => {
    const a = await registerParent('a@example.com');
    const { assignmentId } = await setup(); // a's setup uses parent@
    // ^ above setup() uses parent@example.com; `a` is the OTHER family.
    void a;

    const otherParent = await registerParent('other@example.com');
    const res = await app.inject({
      method: 'POST',
      url: '/api/instances/transition',
      headers: { authorization: `Bearer ${otherParent.accessToken}` },
      payload: {
        assignmentId,
        originalDate: '2026-06-01T00:00:00.000Z',
        action: 'start',
      },
    });
    expect(res.statusCode).toBe(404);
  });
});
