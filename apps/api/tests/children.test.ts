import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/test-app.js';

interface RegisterResult {
  token: string;
}

async function registerParent(app: FastifyInstance, email = 'p@example.com'): Promise<RegisterResult> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'a-strong-pwd', displayName: 'Parent' },
  });
  return { token: res.json().tokens.accessToken as string };
}

describe('children routes', () => {
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

  it('rejects unauthenticated requests with 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/children' });
    expect(res.statusCode).toBe(401);
  });

  it('lists children for the authenticated parent only', async () => {
    const { token: tokenA } = await registerParent(app, 'a@example.com');
    const { token: tokenB } = await registerParent(app, 'b@example.com');
    const authA = { authorization: `Bearer ${tokenA}` };
    const authB = { authorization: `Bearer ${tokenB}` };

    await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: authA,
      payload: { displayName: 'Alice' },
    });

    const aList = await app.inject({ method: 'GET', url: '/api/children', headers: authA });
    expect(aList.json().children).toHaveLength(1);
    expect(aList.json().children[0].displayName).toBe('Alice');

    const bList = await app.inject({ method: 'GET', url: '/api/children', headers: authB });
    expect(bList.json().children).toHaveLength(0);
  });

  it('IDOR: parent B cannot read or modify parent A’s child', async () => {
    const { token: tokenA } = await registerParent(app, 'a@example.com');
    const { token: tokenB } = await registerParent(app, 'b@example.com');
    const authA = { authorization: `Bearer ${tokenA}` };
    const authB = { authorization: `Bearer ${tokenB}` };

    const create = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers: authA,
      payload: { displayName: 'Alice' },
    });
    const childId = create.json().id as string;

    const readByB = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}`,
      headers: authB,
    });
    expect(readByB.statusCode).toBe(404);

    const updateByB = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}`,
      headers: authB,
      payload: { displayName: 'Pwned' },
    });
    expect(updateByB.statusCode).toBe(404);

    const deleteByB = await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}`,
      headers: authB,
    });
    expect(deleteByB.statusCode).toBe(404);

    // The child is unchanged.
    const readByA = await app.inject({
      method: 'GET',
      url: `/api/children/${childId}`,
      headers: authA,
    });
    expect(readByA.statusCode).toBe(200);
    expect(readByA.json().displayName).toBe('Alice');
  });

  it('creates, patches, and deletes own child', async () => {
    const { token } = await registerParent(app);
    const headers = { authorization: `Bearer ${token}` };

    const create = await app.inject({
      method: 'POST',
      url: '/api/children',
      headers,
      payload: { displayName: 'Alice', grade: '2' },
    });
    expect(create.statusCode).toBe(201);
    const childId = create.json().id;

    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/children/${childId}`,
      headers,
      payload: { grade: '3' },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().grade).toBe('3');

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/children/${childId}`,
      headers,
    });
    expect(del.statusCode).toBe(204);

    const after = await app.inject({ method: 'GET', url: '/api/children', headers });
    expect(after.json().children).toHaveLength(0);
  });
});
