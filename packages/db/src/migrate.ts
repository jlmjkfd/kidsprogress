import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb } from './client.js';

const db = createDb();
migrate(db, { migrationsFolder: './src/migrations' });
console.log('migrations applied');
process.exit(0);
