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
}

async function registerParent(email = 'parent@example.com'): Promise<ParentSession> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email,
      password: 'correct-horse-battery-staple',
      displayName: 'Alex Parent',
    },
  });
  expect(res.statusCode).toBe(201);
  const body = res.json() as {
    user: { id: string };
    tokens: { accessToken: string };
  };
  return { accessToken: body.tokens.accessToken, userId: body.user.id };
}

const VALID_GENERIC_BODY = {
  handlerId: 'generic',
  schemaVersion: 1,
  name: 'Tidy your desk',
  config: { steps: [{ id: 'a', label: 'Put away pencils' }], instructions: 'Quick' },
};

describe('POST /api/templates', () => {
  it('creates a generic template scoped to the calling parent', async () => {
    const session = await registerParent();
    const res = await app.inject({
      method: 'POST',
      url: '/api/templates',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: VALID_GENERIC_BODY,
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as {
      id: string;
      parentId: string;
      handlerId: string;
      schemaVersion: number;
      config: { steps: { id: string; label: string }[] };
    };
    expect(body.parentId).toBe(session.userId);
    expect(body.handlerId).toBe('generic');
    expect(body.schemaVersion).toBe(1);
    expect(body.config.steps).toHaveLength(1);
  });

  it('rejects unknown handler with 400', async () => {
    const session = await registerParent();
    const res = await app.inject({
      method: 'POST',
      url: '/api/templates',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { ...VALID_GENERIC_BODY, handlerId: 'not-real' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects unknown version with 400', async () => {
    const session = await registerParent();
    const res = await app.inject({
      method: 'POST',
      url: '/api/templates',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { ...VALID_GENERIC_BODY, schemaVersion: 99 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects config that fails the handler schema (steps as wrong shape) with 400', async () => {
    const session = await registerParent();
    const res = await app.inject({
      method: 'POST',
      url: '/api/templates',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { ...VALID_GENERIC_BODY, config: { steps: 'not-an-array' } },
    });
    expect(res.statusCode).toBe(400);
  });

  it('requires parent auth (no token → 401)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/templates',
      payload: VALID_GENERIC_BODY,
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/templates', () => {
  it('lists only templates owned by the calling parent', async () => {
    const a = await registerParent('a@example.com');
    const b = await registerParent('b@example.com');
    await app.inject({
      method: 'POST',
      url: '/api/templates',
      headers: { authorization: `Bearer ${a.accessToken}` },
      payload: { ...VALID_GENERIC_BODY, name: 'A-only' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/templates',
      headers: { authorization: `Bearer ${b.accessToken}` },
      payload: { ...VALID_GENERIC_BODY, name: 'B-only' },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/templates',
      headers: { authorization: `Bearer ${a.accessToken}` },
    });
    const body = res.json() as { templates: { name: string }[] };
    expect(body.templates).toHaveLength(1);
    expect(body.templates[0]!.name).toBe('A-only');
  });
});

describe('GET /api/templates/:id', () => {
  it('returns 404 for a template owned by another parent', async () => {
    const a = await registerParent('a@example.com');
    const b = await registerParent('b@example.com');
    const created = await app.inject({
      method: 'POST',
      url: '/api/templates',
      headers: { authorization: `Bearer ${b.accessToken}` },
      payload: VALID_GENERIC_BODY,
    });
    const bId = (created.json() as { id: string }).id;
    const res = await app.inject({
      method: 'GET',
      url: `/api/templates/${bId}`,
      headers: { authorization: `Bearer ${a.accessToken}` },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /api/templates/:id', () => {
  it('updates name + config; re-validates config against the SAME (handlerId, version)', async () => {
    const session = await registerParent();
    const created = await app.inject({
      method: 'POST',
      url: '/api/templates',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: VALID_GENERIC_BODY,
    });
    const id = (created.json() as { id: string }).id;
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/templates/${id}`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: {
        name: 'Renamed',
        config: { steps: [], instructions: 'Updated' },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { name: string; config: { instructions: string } };
    expect(body.name).toBe('Renamed');
    expect(body.config.instructions).toBe('Updated');
  });

  it('rejects an update whose config fails validation', async () => {
    const session = await registerParent();
    const created = await app.inject({
      method: 'POST',
      url: '/api/templates',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: VALID_GENERIC_BODY,
    });
    const id = (created.json() as { id: string }).id;
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/templates/${id}`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { config: { steps: 'not-an-array' } },
    });
    expect(res.statusCode).toBe(400);
  });

  it('handler / schemaVersion stripped by Zod — silently kept immutable', async () => {
    const session = await registerParent();
    const created = await app.inject({
      method: 'POST',
      url: '/api/templates',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: VALID_GENERIC_BODY,
    });
    const id = (created.json() as { id: string }).id;
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/templates/${id}`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { handlerId: 'writing', schemaVersion: 9, name: 'still works' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { handlerId: string; schemaVersion: number; name: string };
    expect(body.handlerId).toBe('generic');
    expect(body.schemaVersion).toBe(1);
    expect(body.name).toBe('still works');
  });
});

describe('archive + restore', () => {
  it('archive flips isArchived; restore flips it back; both idempotent', async () => {
    const session = await registerParent();
    const created = await app.inject({
      method: 'POST',
      url: '/api/templates',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: VALID_GENERIC_BODY,
    });
    const id = (created.json() as { id: string }).id;

    const archived1 = await app.inject({
      method: 'POST',
      url: `/api/templates/${id}/archive`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(archived1.statusCode).toBe(200);
    expect((archived1.json() as { isArchived: boolean }).isArchived).toBe(true);

    const archived2 = await app.inject({
      method: 'POST',
      url: `/api/templates/${id}/archive`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(archived2.statusCode).toBe(200);
    expect((archived2.json() as { isArchived: boolean }).isArchived).toBe(true);

    const restored = await app.inject({
      method: 'POST',
      url: `/api/templates/${id}/restore`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(restored.statusCode).toBe(200);
    expect((restored.json() as { isArchived: boolean }).isArchived).toBe(false);
  });
});

describe('boot invariant', () => {
  it('rejects child or readonly tokens — parent only on every templates route', async () => {
    const session = await registerParent();
    // Create a child + view-as token, confirm rejected on POST.
    const c = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { displayName: 'Mia', avatarKey: 'avatar-01' },
    });
    const childId = (c.json() as { id: string }).id;
    await app.inject({
      method: 'POST',
      url: '/api/auth/me/parent-pin',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { pin: '4242' },
    });
    const view = await app.inject({
      method: 'POST',
      url: '/api/auth/me/view-as-child',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { childId, parentPin: '4242' },
    });
    const readonlyToken = (view.json() as { tokens: { accessToken: string } }).tokens
      .accessToken;
    const list = await app.inject({
      method: 'GET',
      url: '/api/templates',
      headers: { authorization: `Bearer ${readonlyToken}` },
    });
    expect(list.statusCode).toBe(403);
  });
});
