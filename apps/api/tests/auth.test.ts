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

const VALID = {
  email: 'parent@example.com',
  password: 'correct-horse-battery-staple',
  displayName: 'Alex Parent',
};

function refreshCookieFrom(res: { headers: Record<string, unknown> }): string {
  const raw = res.headers['set-cookie'];
  const arr = Array.isArray(raw) ? raw : raw ? [raw as string] : [];
  const cookie = arr.find((c) => c.startsWith('kp_refresh='));
  if (!cookie) throw new Error('no kp_refresh cookie on response');
  return cookie.split(';')[0]!; // "kp_refresh=<value>"
}

async function register(): Promise<{ accessToken: string; cookie: string; userId: string }> {
  const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: VALID });
  expect(res.statusCode).toBe(201);
  const body = res.json() as {
    user: { id: string };
    tokens: { accessToken: string };
  };
  return { accessToken: body.tokens.accessToken, cookie: refreshCookieFrom(res), userId: body.user.id };
}

describe('POST /api/auth/register', () => {
  it('creates a user, returns access token + refresh cookie + parentMe', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: VALID,
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as {
      user: { id: string; email: string; familyId: string; hasParentPortalPin: boolean };
      tokens: { accessToken: string; expiresAt: string };
    };
    expect(body.user.email).toBe(VALID.email);
    expect(body.user.id).toBe(body.user.familyId);
    expect(body.user.hasParentPortalPin).toBe(false);
    expect(body.tokens.accessToken).toBeTruthy();
    expect(refreshCookieFrom(res)).toMatch(/^kp_refresh=/);
  });

  it('rejects duplicate email with 409', async () => {
    await register();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: VALID,
    });
    expect(res.statusCode).toBe(409);
  });

  it('rejects weak password (<8 chars) with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { ...VALID, password: 'short' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('issues access token + refresh cookie on correct credentials', async () => {
    await register();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: VALID.email, password: VALID.password },
    });
    expect(res.statusCode).toBe(200);
    expect(refreshCookieFrom(res)).toMatch(/^kp_refresh=/);
  });

  it('returns 401 on wrong password', async () => {
    await register();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: VALID.email, password: 'wrong-password-here' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 on unknown email (no enumeration leak)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nope@example.com', password: 'whatever-password' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns parentMe for authenticated parent', async () => {
    const { accessToken } = await register();
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { email: string; hasParentPortalPin: boolean };
    expect(body.email).toBe(VALID.email);
    expect(body.hasParentPortalPin).toBe(false);
  });

  it('returns 401 without a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('rotates the refresh token + revokes the old one', async () => {
    const { cookie } = await register();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const newCookie = refreshCookieFrom(res);
    expect(newCookie).not.toBe(cookie); // rotated to new value

    // Old cookie now revoked → 401
    const replay = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie },
    });
    expect(replay.statusCode).toBe(401);
  });

  it('replay of revoked refresh token revokes the entire subject family', async () => {
    const { cookie } = await register();
    // Rotate once — `cookie` is now revoked with reason='rotated'.
    const rotated = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie },
    });
    const newCookie = refreshCookieFrom(rotated);

    // Replay the OLD cookie → should trigger replay handler.
    const replay = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie },
    });
    expect(replay.statusCode).toBe(401);

    // The new (legitimate) token should now ALSO be revoked because we
    // burned the whole subject family on replay detection.
    const afterBurn = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: newCookie },
    });
    expect(afterBurn.statusCode).toBe(401);
  });

  it('returns 401 when no refresh cookie is present', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/refresh' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the cookie and revokes the refresh row', async () => {
    const { cookie } = await register();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(204);
    const setCookies = res.headers['set-cookie'];
    const arr = Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies as string] : [];
    expect(arr.some((c) => c.startsWith('kp_refresh=') && c.includes('Expires'))).toBe(true);

    // Refresh with old cookie now fails.
    const reuse = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie },
    });
    expect(reuse.statusCode).toBe(401);
  });
});

describe('Parent portal PIN', () => {
  it('set → /me reports hasParentPortalPin=true; verify with correct PIN → 204', async () => {
    const { accessToken } = await register();
    const setRes = await app.inject({
      method: 'POST',
      url: '/api/auth/me/parent-pin',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { pin: '4242' },
    });
    expect(setRes.statusCode).toBe(204);

    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect((me.json() as { hasParentPortalPin: boolean }).hasParentPortalPin).toBe(true);

    const verify = await app.inject({
      method: 'POST',
      url: '/api/auth/me/parent-pin/verify',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { pin: '4242' },
    });
    expect(verify.statusCode).toBe(204);
  });

  it('verify with wrong PIN → 401', async () => {
    const { accessToken } = await register();
    await app.inject({
      method: 'POST',
      url: '/api/auth/me/parent-pin',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { pin: '4242' },
    });
    const verify = await app.inject({
      method: 'POST',
      url: '/api/auth/me/parent-pin/verify',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { pin: '0000' },
    });
    expect(verify.statusCode).toBe(401);
  });

  it('verify before set → 409 (PinNotSet)', async () => {
    const { accessToken } = await register();
    const verify = await app.inject({
      method: 'POST',
      url: '/api/auth/me/parent-pin/verify',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { pin: '0000' },
    });
    expect(verify.statusCode).toBe(409);
  });
});

describe('view-as-child', () => {
  it('issues a child-readonly token bound to the child', async () => {
    const { accessToken, userId } = await register();

    // Set a parent PIN so view-as is unlocked.
    await app.inject({
      method: 'POST',
      url: '/api/auth/me/parent-pin',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { pin: '4242' },
    });

    // Insert a child directly via db — the children HTTP module lands in 1e.
    const { children: childrenTable } = await import('@kidsprogress/db');
    const childId = '0193c2f8-9c5e-7000-8000-000000000001';
    await db.insert(childrenTable).values({
      id: childId,
      familyId: userId, // userId === familyId on register
      displayName: 'Mia',
      avatarKey: 'avatar-03',
      birthYear: 2018,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/me/view-as-child',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { childId, parentPin: '4242' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      child: { id: string; ageBand: 'younger' | 'older' };
      tokens: { accessToken: string };
    };
    expect(body.child.id).toBe(childId);
    expect(body.child.ageBand).toBe('younger'); // 2018-born → ≤8

    // Decode (best-effort) — child-readonly token should be returned.
    expect(body.tokens.accessToken).toBeTruthy();
  });

  it('rejects view-as when PIN is wrong → 401', async () => {
    const { accessToken, userId } = await register();
    await app.inject({
      method: 'POST',
      url: '/api/auth/me/parent-pin',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { pin: '4242' },
    });
    const { children: childrenTable } = await import('@kidsprogress/db');
    const childId = '0193c2f8-9c5e-7000-8000-000000000002';
    await db.insert(childrenTable).values({
      id: childId,
      familyId: userId,
      displayName: 'Sam',
      avatarKey: 'avatar-01',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/me/view-as-child',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { childId, parentPin: '0000' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects view-as for a child outside the family → 404', async () => {
    const { accessToken } = await register();
    await app.inject({
      method: 'POST',
      url: '/api/auth/me/parent-pin',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { pin: '4242' },
    });
    // Register a SECOND parent (= new family) and attach the child there.
    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'other@example.com',
        password: 'another-good-passphrase',
        displayName: 'Other Parent',
      },
    });
    const otherUserId = (otherRes.json() as { user: { id: string } }).user.id;
    const { children: childrenTable } = await import('@kidsprogress/db');
    const childId = '0193c2f8-9c5e-7000-8000-000000000003';
    await db.insert(childrenTable).values({
      id: childId,
      familyId: otherUserId,
      displayName: 'Outside',
      avatarKey: 'avatar-02',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/me/view-as-child',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { childId, parentPin: '4242' },
    });
    expect(res.statusCode).toBe(404);
  });
});
