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
      displayName: 'Alex Parent',
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

async function createChild(
  session: ParentSession,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/children',
    headers: { authorization: `Bearer ${session.accessToken}` },
    payload: { displayName: 'Mia', avatarKey: 'avatar-03', birthYear: 2018, ...overrides },
  });
  expect(res.statusCode).toBe(201);
  return (res.json() as { id: string }).id;
}

async function registerDevice(
  session: ParentSession,
  childIds: string[] = [],
  label = 'Living-room iPad',
): Promise<{ deviceId: string; deviceToken: string }> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/devices/register',
    headers: { authorization: `Bearer ${session.accessToken}` },
    payload: { label, childIds },
  });
  expect(res.statusCode).toBe(201);
  const body = res.json() as { device: { id: string }; deviceToken: string };
  return { deviceId: body.device.id, deviceToken: body.deviceToken };
}

describe('POST /api/devices/register', () => {
  it('returns the one-time device token + device row scoped to the family', async () => {
    const session = await registerParent();
    const c1 = await createChild(session);
    const res = await app.inject({
      method: 'POST',
      url: '/api/devices/register',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { label: 'iPad', childIds: [c1] },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as {
      device: { id: string; label: string; childIds: string[]; tokenHashPrefix: string };
      deviceToken: string;
    };
    expect(body.device.label).toBe('iPad');
    expect(body.device.childIds).toEqual([c1]);
    expect(body.device.tokenHashPrefix).toMatch(/^[a-f0-9]{8}$/);
    expect(body.deviceToken.length).toBeGreaterThan(20);
  });

  it('empty childIds auto-attaches every current family child', async () => {
    const session = await registerParent();
    const c1 = await createChild(session, { displayName: 'A' });
    const c2 = await createChild(session, { displayName: 'B', avatarKey: 'avatar-04' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/devices/register',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { label: 'shared iPad', childIds: [] },
    });
    const body = res.json() as { device: { childIds: string[] } };
    expect(new Set(body.device.childIds)).toEqual(new Set([c1, c2]));
  });

  it('rejects cross-family childIds with 404', async () => {
    const parentA = await registerParent('a@example.com');
    const parentB = await registerParent('b@example.com');
    const cB = await createChild(parentB);
    const res = await app.inject({
      method: 'POST',
      url: '/api/devices/register',
      headers: { authorization: `Bearer ${parentA.accessToken}` },
      payload: { label: 'mine', childIds: [cB] },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/devices', () => {
  it('lists only devices in the calling family', async () => {
    const parentA = await registerParent('a@example.com');
    const parentB = await registerParent('b@example.com');
    await registerDevice(parentA);
    await registerDevice(parentB);
    const res = await app.inject({
      method: 'GET',
      url: '/api/devices',
      headers: { authorization: `Bearer ${parentA.accessToken}` },
    });
    const body = res.json() as { devices: unknown[] };
    expect(body.devices).toHaveLength(1);
  });
});

describe('attach/detach child', () => {
  it('attach is idempotent and detach removes the link', async () => {
    const session = await registerParent();
    const c1 = await createChild(session);
    const { deviceId } = await registerDevice(session);

    // first attach
    let res = await app.inject({
      method: 'POST',
      url: `/api/devices/${deviceId}/children`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { childId: c1 },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { childIds: string[] }).childIds).toContain(c1);

    // second attach — no error
    res = await app.inject({
      method: 'POST',
      url: `/api/devices/${deviceId}/children`,
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { childId: c1 },
    });
    expect(res.statusCode).toBe(200);

    // detach
    res = await app.inject({
      method: 'DELETE',
      url: `/api/devices/${deviceId}/children/${c1}`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { childIds: string[] }).childIds).not.toContain(c1);
  });

  it('cross-family attach → 404', async () => {
    const parentA = await registerParent('a@example.com');
    const parentB = await registerParent('b@example.com');
    const cB = await createChild(parentB);
    const { deviceId } = await registerDevice(parentA);
    const res = await app.inject({
      method: 'POST',
      url: `/api/devices/${deviceId}/children`,
      headers: { authorization: `Bearer ${parentA.accessToken}` },
      payload: { childId: cB },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('revoke device', () => {
  it('revokes the device and burns any bound refresh token', async () => {
    const session = await registerParent();
    const c1 = await createChild(session);
    const { deviceId, deviceToken } = await registerDevice(session, [c1]);

    // child login first
    await app.inject({
      method: 'POST',
      url: '/api/devices/child-login',
      payload: { deviceToken, childId: c1 },
    });

    const revoke = await app.inject({
      method: 'POST',
      url: `/api/devices/${deviceId}/revoke`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(revoke.statusCode).toBe(204);

    // lookup with the now-revoked token → 410
    const lookup = await app.inject({
      method: 'POST',
      url: '/api/devices/lookup',
      payload: { deviceToken },
    });
    expect(lookup.statusCode).toBe(410);
  });
});

describe('POST /api/devices/lookup', () => {
  it('returns family display name + roster cards', async () => {
    const session = await registerParent();
    const c1 = await createChild(session, { displayName: 'Mia' });
    const c2 = await createChild(session, { displayName: 'Sam', avatarKey: 'avatar-05' });
    const { deviceToken } = await registerDevice(session, [c1, c2]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/devices/lookup',
      payload: { deviceToken },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      familyDisplayName: string;
      children: { id: string; displayName: string; pinRequired: boolean }[];
    };
    expect(body.familyDisplayName).toBe('Alex Parent');
    expect(body.children).toHaveLength(2);
    expect(body.children.find((c) => c.id === c1)?.pinRequired).toBe(false);
  });

  it('archived children are not in the roster', async () => {
    const session = await registerParent();
    const c1 = await createChild(session);
    const { deviceToken } = await registerDevice(session, [c1]);

    await app.inject({
      method: 'POST',
      url: `/api/children/${c1}/archive`,
      headers: { authorization: `Bearer ${session.accessToken}` },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/devices/lookup',
      payload: { deviceToken },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { children: unknown[] }).children).toHaveLength(0);
  });

  it('invalid token → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/devices/lookup',
      payload: { deviceToken: 'not-a-real-token-just-padding' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/devices/child-login', () => {
  it('PIN-less child logs in without pin', async () => {
    const session = await registerParent();
    const c1 = await createChild(session);
    const { deviceToken } = await registerDevice(session, [c1]);
    const res = await app.inject({
      method: 'POST',
      url: '/api/devices/child-login',
      payload: { deviceToken, childId: c1 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      child: { id: string; ageBand: 'younger' | 'older' };
      tokens: { accessToken: string };
    };
    expect(body.child.id).toBe(c1);
    expect(body.child.ageBand).toBe('younger');
    expect(body.tokens.accessToken).toBeTruthy();
    // refresh cookie set
    const setCookies = res.headers['set-cookie'];
    const arr = Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies as string] : [];
    expect(arr.some((c) => c.startsWith('kp_child_refresh='))).toBe(true);
  });

  it('PIN-required child without pin → 403 PIN-required', async () => {
    const session = await registerParent();
    const c1 = await createChild(session, { pin: '4321' });
    const { deviceToken } = await registerDevice(session, [c1]);
    const res = await app.inject({
      method: 'POST',
      url: '/api/devices/child-login',
      payload: { deviceToken, childId: c1 },
    });
    expect(res.statusCode).toBe(403);
  });

  it('PIN-required child with correct PIN → 200', async () => {
    const session = await registerParent();
    const c1 = await createChild(session, { pin: '4321' });
    const { deviceToken } = await registerDevice(session, [c1]);
    const res = await app.inject({
      method: 'POST',
      url: '/api/devices/child-login',
      payload: { deviceToken, childId: c1, pin: '4321' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('child not on this device → 403', async () => {
    const session = await registerParent();
    const c1 = await createChild(session, { displayName: 'A' });
    const c2 = await createChild(session, { displayName: 'B', avatarKey: 'avatar-04' });
    const { deviceToken } = await registerDevice(session, [c1]); // only c1 attached
    const res = await app.inject({
      method: 'POST',
      url: '/api/devices/child-login',
      payload: { deviceToken, childId: c2 },
    });
    expect(res.statusCode).toBe(403);
  });

  it('issued child JWT can be used for child-scoped role guards', async () => {
    const session = await registerParent();
    const c1 = await createChild(session);
    const { deviceToken } = await registerDevice(session, [c1]);
    const login = await app.inject({
      method: 'POST',
      url: '/api/devices/child-login',
      payload: { deviceToken, childId: c1 },
    });
    const childToken = (login.json() as { tokens: { accessToken: string } }).tokens
      .accessToken;
    // /api/children is parent-only — child token gets 403.
    const listAsChild = await app.inject({
      method: 'GET',
      url: '/api/children',
      headers: { authorization: `Bearer ${childToken}` },
    });
    expect(listAsChild.statusCode).toBe(403);
  });
});

