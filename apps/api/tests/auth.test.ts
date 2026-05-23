import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/test-app.js';

describe('auth flow', () => {
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

  const credentials = {
    email: 'parent@example.com',
    password: 'a-strong-pwd',
    displayName: 'Parent',
  };

  it('register → login → /me with token', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: credentials,
    });
    expect(reg.statusCode).toBe(200);
    const regBody = reg.json();
    expect(regBody.user.email).toBe(credentials.email);
    expect(regBody.tokens.accessToken).toBeTruthy();
    expect(reg.cookies.find((c) => c.name === 'kp_refresh')).toBeDefined();

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: credentials.email, password: credentials.password },
    });
    expect(login.statusCode).toBe(200);
    const token = login.json().tokens.accessToken as string;

    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().email).toBe(credentials.email);
  });

  it('register: rejects duplicate email with 409', async () => {
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: credentials });
    const dup = await app.inject({ method: 'POST', url: '/api/auth/register', payload: credentials });
    expect(dup.statusCode).toBe(409);
  });

  it('login: rejects wrong password with 401', async () => {
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: credentials });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: credentials.email, password: 'wrong-password' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('login: rejects unknown user with 401 (constant-time)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@example.com', password: 'a-strong-pwd' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('/me: 401 without token (default-deny auth)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('refresh: rotates token and lets the new one work', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: credentials,
    });
    const cookie = reg.cookies.find((c) => c.name === 'kp_refresh');
    expect(cookie).toBeDefined();

    const refresh = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { kp_refresh: cookie!.value },
    });
    expect(refresh.statusCode).toBe(200);
    expect(refresh.json().accessToken).toBeTruthy();

    const newCookie = refresh.cookies.find((c) => c.name === 'kp_refresh');
    expect(newCookie?.value).not.toBe(cookie!.value); // rotated
  });

  it('refresh: replay of rotated token is rejected and clears cookie', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: credentials,
    });
    const cookie = reg.cookies.find((c) => c.name === 'kp_refresh')!;

    // Use it once → rotates
    await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { kp_refresh: cookie.value },
    });
    // Replay → must reject
    const replay = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { kp_refresh: cookie.value },
    });
    expect(replay.statusCode).toBe(401);
  });

  it('refresh: 401 with no cookie', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/refresh' });
    expect(res.statusCode).toBe(401);
  });

  it('parent-pin: set + verify + reject wrong PIN', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: credentials,
    });
    const token = reg.json().tokens.accessToken as string;
    const auth = { authorization: `Bearer ${token}` };

    const setRes = await app.inject({
      method: 'POST',
      url: '/api/auth/parent-pin',
      headers: auth,
      payload: { pin: '1234' },
    });
    expect(setRes.statusCode).toBe(204);

    const ok = await app.inject({
      method: 'POST',
      url: '/api/auth/parent-pin/verify',
      headers: auth,
      payload: { pin: '1234' },
    });
    expect(ok.statusCode).toBe(204);

    const bad = await app.inject({
      method: 'POST',
      url: '/api/auth/parent-pin/verify',
      headers: auth,
      payload: { pin: '9999' },
    });
    expect(bad.statusCode).toBe(401);
  });
});
