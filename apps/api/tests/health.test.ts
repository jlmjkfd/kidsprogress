import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/test-app.js';

describe('GET /health', () => {
  let app: FastifyInstance;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    const built = await buildTestApp();
    app = built.app;
    cleanup = built.cleanup;
  });

  afterAll(async () => {
    await cleanup();
  });

  it('returns 200 with status fields', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({
      status: expect.stringMatching(/^(ok|degraded)$/),
      db: expect.stringMatching(/^(ok|down)$/),
      version: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('is reachable without authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).not.toBe(401);
  });
});
