import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb } from './client.js';
import { resolveFromRepoRoot } from './paths.js';

const db = createDb();
migrate(db, { migrationsFolder: resolveFromRepoRoot('packages/db/src/migrations') });
console.log('migrations applied');
process.exit(0);
