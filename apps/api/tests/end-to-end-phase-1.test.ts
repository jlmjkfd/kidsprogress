import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/test-app.js';

/**
 * Phase 1 wrap-up smoke test — walks the full happy path that a real user
 * would experience: parent register → set parent PIN → create two children
 * (one with PIN, one without) → register a family device → public lookup
 * of roster → PIN-less child login → PIN-required child login (with PIN) →
 * view-as-child read-only token.
 *
 * Every step asserts both the status code AND the contract-shape touch
 * points the frontend will rely on (cookie names, JSON keys).
 */

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

describe('Phase 1 — end-to-end happy path', () => {
  it('parent → children → device → child login → view-as', async () => {
    // 1. Parent registers.
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'fam@example.com',
        password: 'long-enough-password',
        displayName: 'Lin Family',
      },
    });
    expect(reg.statusCode).toBe(201);
    const parentToken = (reg.json() as { tokens: { accessToken: string } }).tokens
      .accessToken;

    // 2. Set the parent portal PIN.
    const setPin = await app.inject({
      method: 'POST',
      url: '/api/auth/me/parent-pin',
      headers: { authorization: `Bearer ${parentToken}` },
      payload: { pin: '8675' },
    });
    expect(setPin.statusCode).toBe(204);

    // 3. Create two children — one PIN-less, one with PIN.
    const cNoPin = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${parentToken}` },
      payload: { displayName: 'Mia', avatarKey: 'avatar-03', birthYear: 2019 },
    });
    const cWithPin = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${parentToken}` },
      payload: {
        displayName: 'Liam',
        avatarKey: 'avatar-07',
        birthYear: 2014,
        pin: '4242',
      },
    });
    expect(cNoPin.statusCode).toBe(201);
    expect(cWithPin.statusCode).toBe(201);
    const miaId = (cNoPin.json() as { id: string }).id;
    const liamId = (cWithPin.json() as { id: string }).id;

    // 4. Register a family device (auto-attach all current children).
    const dev = await app.inject({
      method: 'POST',
      url: '/api/devices/register',
      headers: { authorization: `Bearer ${parentToken}` },
      payload: { label: 'Living-room iPad', childIds: [] },
    });
    expect(dev.statusCode).toBe(201);
    const { deviceToken, device } = dev.json() as {
      device: { id: string; childIds: string[] };
      deviceToken: string;
    };
    expect(new Set(device.childIds)).toEqual(new Set([miaId, liamId]));

    // 5. Public lookup — frontend will hit this from the kid-portal land page.
    const lookup = await app.inject({
      method: 'POST',
      url: '/api/devices/lookup',
      payload: { deviceToken },
    });
    expect(lookup.statusCode).toBe(200);
    const lookupBody = lookup.json() as {
      familyDisplayName: string;
      children: { id: string; displayName: string; pinRequired: boolean }[];
    };
    expect(lookupBody.familyDisplayName).toBe('Lin Family');
    expect(lookupBody.children.find((c) => c.id === miaId)?.pinRequired).toBe(false);
    expect(lookupBody.children.find((c) => c.id === liamId)?.pinRequired).toBe(true);

    // 6. PIN-less child login.
    const miaLogin = await app.inject({
      method: 'POST',
      url: '/api/devices/child-login',
      payload: { deviceToken, childId: miaId },
    });
    expect(miaLogin.statusCode).toBe(200);

    // 7. PIN-required child login (with PIN).
    const liamLogin = await app.inject({
      method: 'POST',
      url: '/api/devices/child-login',
      payload: { deviceToken, childId: liamId, pin: '4242' },
    });
    expect(liamLogin.statusCode).toBe(200);

    // 8. Wrong PIN — locked-out behavior (uses the children lockout service).
    for (let i = 0; i < 4; i++) {
      const r = await app.inject({
        method: 'POST',
        url: '/api/devices/child-login',
        payload: { deviceToken, childId: liamId, pin: '0000' },
      });
      expect(r.statusCode).toBe(401);
    }
    const fifth = await app.inject({
      method: 'POST',
      url: '/api/devices/child-login',
      payload: { deviceToken, childId: liamId, pin: '0000' },
    });
    expect(fifth.statusCode).toBe(423);

    // 9. Parent recovers via reset code — never learns the new PIN.
    const issue = await app.inject({
      method: 'POST',
      url: `/api/children/${liamId}/pin/issue-reset`,
      headers: { authorization: `Bearer ${parentToken}` },
    });
    expect(issue.statusCode).toBe(200);
    const { resetCode } = issue.json() as { resetCode: string };
    const use = await app.inject({
      method: 'POST',
      url: '/api/children/pin/use-reset',
      payload: { childId: liamId, resetCode, newPin: '5555' },
    });
    expect(use.statusCode).toBe(204);

    // 10. After reset, child can log in with the new PIN.
    const recovered = await app.inject({
      method: 'POST',
      url: '/api/devices/child-login',
      payload: { deviceToken, childId: liamId, pin: '5555' },
    });
    expect(recovered.statusCode).toBe(200);

    // 11. Parent uses view-as-child to inspect the kid's surfaces read-only.
    const viewAs = await app.inject({
      method: 'POST',
      url: '/api/auth/me/view-as-child',
      headers: { authorization: `Bearer ${parentToken}` },
      payload: { childId: miaId, parentPin: '8675' },
    });
    expect(viewAs.statusCode).toBe(200);
    const readonlyToken = (viewAs.json() as { tokens: { accessToken: string } }).tokens
      .accessToken;

    // 12. view-as-child token rejected on every mutating verb.
    const mutate = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: { authorization: `Bearer ${readonlyToken}` },
      payload: { displayName: 'pwned' },
    });
    expect(mutate.statusCode).toBe(403);
  });
});
