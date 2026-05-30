import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import * as schema from './schema.js';
import { resolveFromRepoRoot } from './paths.js';

export type Database_ = ReturnType<typeof createDb>;

/**
 * Relative SQLite paths resolve from the repo root (NOT the script's cwd)
 * so `pnpm db:migrate`, `pnpm db:seed`, and `pnpm api:dev` all touch the
 * same file even though pnpm runs each script from a different workspace dir.
 */
function resolveSqlitePath(raw: string): string {
  if (raw === ':memory:') return raw;
  return isAbsolute(raw) ? raw : resolveFromRepoRoot(raw);
}

/**
 * Create the Drizzle DB client. Driver is selected by env so the same code
 * runs against SQLite on the NAS and Postgres/Turso when deployed to cloud.
 * Only SQLite is wired up at v2.5 launch.
 */
export function createDb() {
  const driver = process.env.DB_DRIVER ?? 'sqlite';

  if (driver === 'sqlite') {
    const path = resolveSqlitePath(process.env.SQLITE_PATH ?? './data/kidsprogress.sqlite');
    const isInMemory = path === ':memory:';
    if (!isInMemory) {
      mkdirSync(dirname(path), { recursive: true });
    }
    const sqlite = new Database(path);
    if (!isInMemory) {
      sqlite.pragma('journal_mode = WAL');
      sqlite.pragma('synchronous = NORMAL');
    }
    sqlite.pragma('foreign_keys = ON');
    return drizzleSqlite(sqlite, { schema });
  }

  throw new Error(
    `DB_DRIVER=${driver} is not wired up yet. Only "sqlite" is supported at v2.5 launch.`,
  );
}

export { schema };
