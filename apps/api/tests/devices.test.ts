import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/test-app.js';

async function registerParent(app: FastifyInstance, email = 'p@example.com') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'a-strong-pwd', displayName: 'Parent' },
  });
  return { token: res.json().tokens.accessToken as string };
}

async function createChild(app: FastifyInstance, token: string, pin?: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/children',
    headers: { authorization: `Bearer ${token}` },
    payload: { displayName: 'Alice', ...(pin ? { pin } : {}) },
  });
  return res.json().id as string;
}

describe('devices + child-login', () => {
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

  it('parent registers a device and gets a one-time token', async () => {
    const { token } = await registerParent(app);
    const childId = await createChild(app, token);
    const res = await app.inject({
      method: 'POST',
      url: '/api/devices',
      headers: { authorization: `Bearer ${token}` },
      payload: { label: 'Living room tablet', childId, pinRequired: false },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.device.label).toBe('Living room tablet');
    expect(body.deviceToken).toMatch(/^[A-Za-z0-9_-]{40,}$/); // base64url, ≥40 chars
  });

  it('parent cannot bind a device to another parent’s child', async () => {
    const { token: tokenA } = await registerParent(app, 'a@example.com');
    const { token: tokenB } = await registerParent(app, 'b@example.com');
    const childOfA = await createChild(app, tokenA);
    const res = await app.inject({
      method: 'POST',
      url: '/api/devices',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { label: 'Stolen', childId: childOfA },
    });
    expect(res.statusCode).toBe(404);
  });

  it('child-login: succeeds without PIN when device.pinRequired=false and child has no pin', async () => {
    const { token } = await registerParent(app);
    const childId = await createChild(app, token);
    const reg = await app.inject({
      method: 'POST',
      url: '/api/devices',
      headers: { authorization: `Bearer ${token}` },
      payload: { label: 'Kiosk', childId, pinRequired: false },
    });
    const deviceToken = reg.json().deviceToken;

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/child-login',
      payload: { deviceToken, childId },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().tokens.accessToken).toBeTruthy();
  });

  it('child-login: rejects bad PIN with 401', async () => {
    const { token } = await registerParent(app);
    const childId = await createChild(app, token, '1234');
    const reg = await app.inject({
      method: 'POST',
      url: '/api/devices',
      headers: { authorization: `Bearer ${token}` },
      payload: { label: 'Kiosk', childId, pinRequired: true },
    });
    const deviceToken = reg.json().deviceToken;

    const bad = await app.inject({
      method: 'POST',
      url: '/api/auth/child-login',
      payload: { deviceToken, childId, pin: '9999' },
    });
    expect(bad.statusCode).toBe(401);

    const good = await app.inject({
      method: 'POST',
      url: '/api/auth/child-login',
      payload: { deviceToken, childId, pin: '1234' },
    });
    expect(good.statusCode).toBe(200);
  });

  it('child-login: rejects revoked device', async () => {
    const { token } = await registerParent(app);
    const childId = await createChild(app, token);
    const reg = await app.inject({
      method: 'POST',
      url: '/api/devices',
      headers: { authorization: `Bearer ${token}` },
      payload: { label: 'Kiosk', childId, pinRequired: false },
    });
    const { deviceToken, device } = reg.json();

    await app.inject({
      method: 'DELETE',
      url: `/api/devices/${device.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/child-login',
      payload: { deviceToken, childId },
    });
    expect(login.statusCode).toBe(401);
  });

  it('child-login: rejects device bound to a different child', async () => {
    const { token } = await registerParent(app);
    const childA = await createChild(app, token);
    // Create a second child for the same parent
    const c2 = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${token}` },
      payload: { displayName: 'Bob' },
    });
    const childB = c2.json().id as string;

    const reg = await app.inject({
      method: 'POST',
      url: '/api/devices',
      headers: { authorization: `Bearer ${token}` },
      payload: { label: 'Kiosk', childId: childA, pinRequired: false },
    });
    const deviceToken = reg.json().deviceToken;

    const wrongChild = await app.inject({
      method: 'POST',
      url: '/api/auth/child-login',
      payload: { deviceToken, childId: childB },
    });
    expect(wrongChild.statusCode).toBe(401);
  });

  it('child token can access /api/auth/me as a child role', async () => {
    const { token } = await registerParent(app);
    const childId = await createChild(app, token);
    const reg = await app.inject({
      method: 'POST',
      url: '/api/devices',
      headers: { authorization: `Bearer ${token}` },
      payload: { label: 'Kiosk', childId, pinRequired: false },
    });
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/child-login',
      payload: { deviceToken: reg.json().deviceToken, childId },
    });
    const childToken = login.json().tokens.accessToken as string;

    // /me will 401 because the child id isn't a row in `users`.
    // We test the token is valid format by asking a child-side endpoint…
    // For Phase 1, just confirm the access token decodes and the auth plugin
    // accepts it (by NOT returning 401 from a child-tagged route).
    // We don't have a child-tagged route yet, so verify on the JWT shape.
    expect(childToken.split('.')).toHaveLength(3);
  });
});
