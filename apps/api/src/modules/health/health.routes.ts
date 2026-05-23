import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { healthResponseSchema } from '@kidsprogress/shared';
import type { Database_ } from '@kidsprogress/db';

const APP_VERSION = process.env.npm_package_version ?? '0.0.0-dev';
const startedAt = Date.now();

export async function registerHealthRoutes(
  app: FastifyInstance,
  opts: { db: Database_ },
) {
  app.get(
    '/health',
    {
      config: { public: true },
      schema: { response: { 200: healthResponseSchema } },
    },
    async () => {
      let dbStatus: 'ok' | 'down' = 'ok';
      try {
        await opts.db.run(sql`SELECT 1`);
      } catch {
        dbStatus = 'down';
      }
      return {
        status: dbStatus === 'ok' ? ('ok' as const) : ('degraded' as const),
        uptime: Math.round((Date.now() - startedAt) / 1000),
        version: APP_VERSION,
        db: dbStatus,
        timestamp: new Date().toISOString(),
      };
    },
  );
}
