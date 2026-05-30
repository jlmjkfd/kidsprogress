import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/test-app.js';

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

async function createChild(session: ParentSession, name = 'Mia'): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/children',
    headers: { authorization: `Bearer ${session.accessToken}` },
    payload: { displayName: name, avatarKey: 'avatar-01' },
  });
  return (res.json() as { id: string }).id;
}

async function createTemplate(session: ParentSession): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/templates',
    headers: { authorization: `Bearer ${session.accessToken}` },
    payload: {
      handlerId: 'generic',
      schemaVersion: 1,
      name: 'Read for 20 min',
      config: { steps: [] },
    },
  });
  return (res.json() as { id: string }).id;
}

function validAssignment(templateId: string, childId: string) {
  return {
    templateId,
    childId,
    timezone: 'Asia/Shanghai',
    effectiveFrom: '2026-06-01T00:00:00.000Z',
    schedulingType: 'flexible' as const,
    obligation: 'required' as const,
  };
}

describe('POST /api/assignments', () => {
  it('creates an assignment scoped to parent + child', async () => {
    const session = await registerParent();
    const child = await createChild(session);
    const template = await createTemplate(session);
    const res = await app.inject({
      method: 'POST',
      url: '/api/assignments',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: validAssignment(template, child),
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { parentId: string; templateId: string; childId: string };
    expect(body.parentId).toBe(session.userId);
    expect(body.templateId).toBe(template);
    expect(body.childId).toBe(child);
  });

  it('rejects cross-family child target → 400', async () => {
    const a = await registerParent('a@example.com');
    const b = await registerParent('b@example.com');
    const bChild = await createChild(b);
    const aTemplate = await createTemplate(a);
    const res = await app.inject({
      method: 'POST',
      url: '/api/assignments',
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: validAssignment(aTemplate, bChild),
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects another parent's template → 400", async () => {
    const a = await registerParent('a@example.com');
    const b = await registerParent('b@example.com');
    const aChild = await createChild(a);
    const bTemplate = await createTemplate(b);
    const res = await app.inject({
      method: 'POST',
      url: '/api/assignments',
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: validAssignment(bTemplate, aChild),
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects unauthenticated → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/assignments',
      payload: validAssignment(
        '0193c2f8-9c5e-7000-8000-000000000001',
        '0193c2f8-9c5e-7000-8000-000000000002',
      ),
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/assignments', () => {
  it('lists parent assignments; ?childId filters', async () => {
    const session = await registerParent();
    const tpl = await createTemplate(session);
    const c1 = await createChild(session, 'A');
    const c2 = await createChild(session, 'B');
    await app.inject({
      method: 'POST',
      url: '/api/assignments',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: validAssignment(tpl, c1),
    });
    await app.inject({
      method: 'POST',
      url: '/api/assignments',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: validAssignment(tpl, c2),
    });

    const all = await app.inject({
      method: 'GET',
      url: '/api/assignments',
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect((all.json() as { assignments: unknown[] }).assignments).toHaveLength(2);

    const onlyA = await app.inject({
      method: 'GET',
      url: `/api/assignments?childId=${c1}`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    const onlyABody = onlyA.json() as { assignments: { childId: string }[] };
    expect(onlyABody.assignments).toHaveLength(1);
    expect(onlyABody.assignments[0]!.childId).toBe(c1);
  });
});

describe('DELETE /api/assignments/:id', () => {
  it('deletes an owned assignment', async () => {
    const session = await registerParent();
    const child = await createChild(session);
    const tpl = await createTemplate(session);
    const created = await app.inject({
      method: 'POST',
      url: '/api/assignments',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: validAssignment(tpl, child),
    });
    const id = (created.json() as { id: string }).id;
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/assignments/${id}`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(del.statusCode).toBe(204);
    const after = await app.inject({
      method: 'GET',
      url: `/api/assignments/${id}`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(after.statusCode).toBe(404);
  });

  it("404 for another parent's assignment", async () => {
    const a = await registerParent('a@example.com');
    const b = await registerParent('b@example.com');
    const bChild = await createChild(b);
    const bTpl = await createTemplate(b);
    const created = await app.inject({
      method: 'POST',
      url: '/api/assignments',
      headers: { authorization: `Bearer ${b.accessToken}` },
      payload: validAssignment(bTpl, bChild),
    });
    const id = (created.json() as { id: string }).id;
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/assignments/${id}`,
      headers: { authorization: `Bearer ${a.accessToken}` },
    });
    expect(del.statusCode).toBe(404);
  });
});
