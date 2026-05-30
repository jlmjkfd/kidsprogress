import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createDb, resolveFromRepoRoot, type Database_ } from '@kidsprogress/db';

const MIGRATIONS = resolveFromRepoRoot('packages/db/src/migrations');

/** Build a fully wired app over a fresh file-backed SQLite DB. Caller must close. */
export async function buildTestApp(): Promise<{
  app: FastifyInstance;
  db: Database_;
  cleanup: () => Promise<void>;
}> {
  const dir = mkdtempSync(join(tmpdir(), 'kp-test-'));
  process.env.JWT_SECRET = 'test-secret-with-enough-length-1234567890';
  process.env.NODE_ENV = 'test';
  process.env.SQLITE_PATH = join(dir, 'test.sqlite');
  process.env.LOG_LEVEL = process.env.TEST_LOG_LEVEL ?? 'fatal';

  const db = createDb();
  migrate(db, { migrationsFolder: MIGRATIONS });

  const config = loadConfig();
  const app = await buildApp({ config, db });

  return {
    app,
    db,
    cleanup: async () => {
      await app.close();
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // Windows sometimes holds the SQLite file briefly; ignore EBUSY on cleanup.
      }
    },
  };
}
