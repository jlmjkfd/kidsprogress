import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-with-enough-length-1234';
    process.env.NODE_ENV = 'test';
    process.env.SQLITE_PATH = ':memory:';
    const config = loadConfig();
    app = await buildApp({ config });
  });

  afterAll(async () => {
    await app.close();
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
