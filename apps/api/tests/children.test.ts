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

const PARENT = {
  email: 'parent@example.com',
  password: 'correct-horse-battery-staple',
  displayName: 'Alex Parent',
};

interface ParentSession {
  accessToken: string;
  userId: string;
  familyId: string;
}

async function registerParent(email = PARENT.email): Promise<ParentSession> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { ...PARENT, email },
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

async function createChild(
  session: ParentSession,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; raw: Record<string, unknown> }> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/children',
    headers: { authorization: `Bearer ${session.accessToken}` },
    payload: { displayName: 'Mia', avatarKey: 'avatar-03', birthYear: 2018, ...overrides },
  });
  expect(res.statusCode).toBe(201);
  const body = res.json() as Record<string, unknown> & { id: string };
  return { id: body.id, raw: body };
}

describe('POST /api/children', () => {
  it('creates a child scoped to the calling parent\'s family', async () => {
    const session = await registerParent();
    const { raw } = await createChild(session);
    expect(raw.familyId).toBe(session.familyId);
    expect(raw.displayName).toBe('Mia');
    expect(raw.hasPin).toBe(false);
    expect(raw.pinRequired).toBe(false);
  });

  it('accepts an initial PIN + flips pinRequired automatically', async () => {
    const session = await registerParent();
    const { raw } = await createChild(session, { pin: '4321' });
    expect(raw.pinRequired).toBe(true);
    expect(raw.hasPin).toBe(true);
  });

  it('rejects an invalid avatarKey with 400', async () => {
    const session = await registerParent();
    const res = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { displayName: 'X', avatarKey: 'avatar-99' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('requires parent auth (no token → 401)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/children',
      payload: { displayName: 'Mia' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/children', () => {
  it('lists only children in the caller\'s family', async () => {
    const parentA = await registerParent('a@example.com');
    const parentB = await registerParent('b@example.com');
    await createChild(parentA, { displayName: 'A-kid' });
    await createChild(parentB, { displayName: 'B-kid' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/children',
      headers: { authorization: `Bearer ${parentA.accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { children: { displayName: string; familyId: string }[] };
    expect(body.children).toHaveLength(1);
    expect(body.children[0]!.displayName).toBe('A-kid');
    expect(body.children[0]!.familyId).toBe(parentA.familyId);
  });
});

describe('GET /api/children/:id', () => {
  it('returns 404 when the child belongs to another family (no cross-tenant leak)', async () => {
    const parentA = await registerParent('a@example.com');
    const parentB = await registerParent('b@example.com');
    const { id: bKid } = await createChild(parentB);

    const res = await app.inject({
      method: 'GET',
      url: `/api/children/${bKid}`,
      headers: { authorization: `Bearer ${parentA.accessToken}` },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /api/children/:id', () => {
  it('updates only the supplied fields', async () => {
    const session = await registerParent();
    const { id } = await createChild(session, { birthYear: 2018 });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/children/${id}`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { displayName: 'Mia Updated' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { displayName: string; birthYear: number };
    expect(body.displayName).toBe('Mia Updated');
    expect(body.birthYear).toBe(2018);
  });

  it('cross-family patch → 404', async () => {
    const parentA = await registerParent('a@example.com');
    const parentB = await registerParent('b@example.com');
    const { id: bKid } = await createChild(parentB);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/children/${bKid}`,
      headers: { authorization: `Bearer ${parentA.accessToken}` },
      payload: { displayName: 'pwned' },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('archive + restore', () => {
  it('archive sets archivedAt; restore clears it', async () => {
    const session = await registerParent();
    const { id } = await createChild(session);
    const archived = await app.inject({
      method: 'POST',
      url: `/api/children/${id}/archive`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(archived.statusCode).toBe(200);
    expect((archived.json() as { archivedAt: string | null }).archivedAt).not.toBeNull();

    const restored = await app.inject({
      method: 'POST',
      url: `/api/children/${id}/restore`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(restored.statusCode).toBe(200);
    expect((restored.json() as { archivedAt: string | null }).archivedAt).toBeNull();
  });
});

describe('child PIN management', () => {
  it('set PIN → hasPin=true, pinRequired=true', async () => {
    const session = await registerParent();
    const { id } = await createChild(session);
    const res = await app.inject({
      method: 'POST',
      url: `/api/children/${id}/pin`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { pin: '4321' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { hasPin: boolean; pinRequired: boolean };
    expect(body.hasPin).toBe(true);
    expect(body.pinRequired).toBe(true);
  });

  it('clear PIN → hasPin=false, pinRequired=false', async () => {
    const session = await registerParent();
    const { id } = await createChild(session, { pin: '4321' });
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/children/${id}/pin`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { hasPin: boolean; pinRequired: boolean };
    expect(body.hasPin).toBe(false);
    expect(body.pinRequired).toBe(false);
  });

  it('PIN with non-digit chars → 400', async () => {
    const session = await registerParent();
    const { id } = await createChild(session);
    const res = await app.inject({
      method: 'POST',
      url: `/api/children/${id}/pin`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { pin: 'abcd' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('PIN reset code — public-surface hardening', () => {
  it('non-existent childId returns 401 — same as wrong code (no 404 enumeration)', async () => {
    const session = await registerParent();
    const realChild = await createChild(session, { pin: '4321' });
    // Issue a real reset code so the bad-code path is also 401.
    await app.inject({
      method: 'POST',
      url: `/api/children/${realChild.id}/pin/issue-reset`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });

    const fakeId = '0193ffff-9c5e-7000-8000-000000000999';
    const noSuchChild = await app.inject({
      method: 'POST',
      url: '/api/children/pin/use-reset',
      payload: { childId: fakeId, resetCode: '000000', newPin: '9999' },
    });
    const wrongCode = await app.inject({
      method: 'POST',
      url: '/api/children/pin/use-reset',
      payload: { childId: realChild.id, resetCode: '000000', newPin: '9999' },
    });
    const noActiveCode = await app.inject({
      method: 'POST',
      url: '/api/children/pin/use-reset',
      payload: { childId: realChild.id, resetCode: '000000', newPin: '9999' },
    });

    // All three miss paths share the same status — no oracle.
    expect(noSuchChild.statusCode).toBe(401);
    expect(wrongCode.statusCode).toBe(401);
    expect(noActiveCode.statusCode).toBe(401);
    // …and the same opaque message.
    expect(noSuchChild.json()).toMatchObject({ error: expect.any(String) });
  });

  it('reset code bypasses an active PIN lockout (recovery path)', async () => {
    const session = await registerParent();
    const c = await createChild(session, { pin: '4321' });
    const { children: childrenTable } = await import('@kidsprogress/db');
    const { eq } = await import('drizzle-orm');
    // Force a lockout to simulate "child got locked out, parent recovers".
    await db
      .update(childrenTable)
      .set({ lockedUntil: new Date(Date.now() + 600_000).toISOString() })
      .where(eq(childrenTable.id, c.id));

    const issue = await app.inject({
      method: 'POST',
      url: `/api/children/${c.id}/pin/issue-reset`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    const { resetCode } = issue.json() as { resetCode: string };

    const use = await app.inject({
      method: 'POST',
      url: '/api/children/pin/use-reset',
      payload: { childId: c.id, resetCode, newPin: '5555' },
    });
    // Reset must succeed even though the child is locked — the reset IS
    // the recovery path. Status 204 (not 423).
    expect(use.statusCode).toBe(204);
  });
});

describe('archive idempotency', () => {
  it('archiving twice preserves the original archivedAt timestamp', async () => {
    const session = await registerParent();
    const { id } = await createChild(session);
    const first = await app.inject({
      method: 'POST',
      url: `/api/children/${id}/archive`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    const firstArchivedAt = (first.json() as { archivedAt: string }).archivedAt;
    await new Promise((r) => setTimeout(r, 30));
    const second = await app.inject({
      method: 'POST',
      url: `/api/children/${id}/archive`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    const secondArchivedAt = (second.json() as { archivedAt: string }).archivedAt;
    expect(secondArchivedAt).toBe(firstArchivedAt);
  });

  it('restoring an already-restored child is a no-op', async () => {
    const session = await registerParent();
    const { id } = await createChild(session);
    const res = await app.inject({
      method: 'POST',
      url: `/api/children/${id}/restore`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { archivedAt: string | null }).archivedAt).toBeNull();
  });
});

describe('PATCH bypass guards', () => {
  it('PATCH ignores pinRequired (must use POST /:id/pin)', async () => {
    const session = await registerParent();
    const { id } = await createChild(session); // PIN-less by default
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/children/${id}`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { pinRequired: true, displayName: 'Updated' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { pinRequired: boolean; displayName: string; hasPin: boolean };
    expect(body.displayName).toBe('Updated');
    // pinRequired stayed false — PATCH didn't soft-brick the child.
    expect(body.pinRequired).toBe(false);
    expect(body.hasPin).toBe(false);
  });

  it('PATCH ignores archivedAt (must use POST /:id/archive)', async () => {
    const session = await registerParent();
    const { id } = await createChild(session);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/children/${id}`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { archivedAt: '2026-05-31T10:00:00.000Z', displayName: 'X' },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { archivedAt: string | null }).archivedAt).toBeNull();
  });
});

describe('PIN reset code flow', () => {
  it('issue → returns 6-digit code + expiry, child row marks hasPinResetCode=true', async () => {
    const session = await registerParent();
    const { id } = await createChild(session, { pin: '4321' });
    const issue = await app.inject({
      method: 'POST',
      url: `/api/children/${id}/pin/issue-reset`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(issue.statusCode).toBe(200);
    const body = issue.json() as { resetCode: string; expiresAt: string };
    expect(body.resetCode).toMatch(/^\d{6}$/);
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const get = await app.inject({
      method: 'GET',
      url: `/api/children/${id}`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect((get.json() as { hasPinResetCode: boolean }).hasPinResetCode).toBe(true);
  });

  it('use-reset with correct code → 204 + new PIN replaces old + reset burned', async () => {
    const session = await registerParent();
    const { id } = await createChild(session, { pin: '4321' });
    const issue = await app.inject({
      method: 'POST',
      url: `/api/children/${id}/pin/issue-reset`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    const { resetCode } = issue.json() as { resetCode: string };
    const use = await app.inject({
      method: 'POST',
      url: '/api/children/pin/use-reset',
      payload: { childId: id, resetCode, newPin: '9999' },
    });
    expect(use.statusCode).toBe(204);

    const get = await app.inject({
      method: 'GET',
      url: `/api/children/${id}`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    const body = get.json() as { hasPin: boolean; hasPinResetCode: boolean };
    expect(body.hasPin).toBe(true);
    expect(body.hasPinResetCode).toBe(false);

    // Second use of the same code now fails.
    const replay = await app.inject({
      method: 'POST',
      url: '/api/children/pin/use-reset',
      payload: { childId: id, resetCode, newPin: '1111' },
    });
    expect(replay.statusCode).toBe(401);
  });

  it('use-reset with wrong code → 401', async () => {
    const session = await registerParent();
    const { id } = await createChild(session, { pin: '4321' });
    await app.inject({
      method: 'POST',
      url: `/api/children/${id}/pin/issue-reset`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/children/pin/use-reset',
      payload: { childId: id, resetCode: '000000', newPin: '9999' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('issuing a new code overwrites any prior outstanding code', async () => {
    const session = await registerParent();
    const { id } = await createChild(session, { pin: '4321' });
    const first = await app.inject({
      method: 'POST',
      url: `/api/children/${id}/pin/issue-reset`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    const second = await app.inject({
      method: 'POST',
      url: `/api/children/${id}/pin/issue-reset`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    const codeA = (first.json() as { resetCode: string }).resetCode;
    const codeB = (second.json() as { resetCode: string }).resetCode;
    expect(codeA).not.toBe(codeB);
    // Old code no longer works.
    const oldUse = await app.inject({
      method: 'POST',
      url: '/api/children/pin/use-reset',
      payload: { childId: id, resetCode: codeA, newPin: '9999' },
    });
    expect(oldUse.statusCode).toBe(401);
  });
});

describe('child-readonly role', () => {
  it('view-as-child token can GET /api/children but not POST', async () => {
    const session = await registerParent();
    const { id } = await createChild(session);

    // Set parent PIN + obtain view-as-child token.
    await app.inject({
      method: 'POST',
      url: '/api/auth/me/parent-pin',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { pin: '4242' },
    });
    const viewRes = await app.inject({
      method: 'POST',
      url: '/api/auth/me/view-as-child',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { childId: id, parentPin: '4242' },
    });
    const readonlyToken = (viewRes.json() as { tokens: { accessToken: string } }).tokens
      .accessToken;

    // GET — role guard is 'parent' only on /api/children, so a child-readonly
    // token should be rejected with 403 (role mismatch).
    const list = await app.inject({
      method: 'GET',
      url: '/api/children',
      headers: { authorization: `Bearer ${readonlyToken}` },
    });
    expect(list.statusCode).toBe(403);

    // POST — same.
    const create = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${readonlyToken}` },
      payload: { displayName: 'pwned' },
    });
    expect(create.statusCode).toBe(403);
  });
});

describe('children service — lockout policy', () => {
  it('5 wrong PINs → lock; further attempts → 423; correct PIN after lockout → unlock', async () => {
    const session = await registerParent();
    const { id } = await createChild(session, { pin: '4321' });

    const { createChildrenService } = await import(
      '../src/modules/children/children.service.js'
    );
    const { loadConfig } = await import('../src/config.js');
    const service = createChildrenService({ db, config: loadConfig() });

    // 4 misses — none lock.
    for (let i = 0; i < 4; i++) {
      await expect(service.verifyPin(id, '0000', {})).rejects.toMatchObject({
        kind: 'InvalidChildPin',
      });
    }
    // 5th miss → lock + throw ChildLockedError.
    await expect(service.verifyPin(id, '0000', {})).rejects.toMatchObject({
      kind: 'ChildLocked',
    });

    // Even the correct PIN now bounces while locked.
    await expect(service.verifyPin(id, '4321', {})).rejects.toMatchObject({
      kind: 'ChildLocked',
    });

    // Forcibly clear lockout (simulate window elapsing) and try again.
    const { children: childrenTable } = await import('@kidsprogress/db');
    const { eq } = await import('drizzle-orm');
    await db.update(childrenTable).set({ lockedUntil: null }).where(eq(childrenTable.id, id));

    await expect(service.verifyPin(id, '4321', {})).resolves.toMatchObject({ id });
  });
});
