import { defineConfig } from 'drizzle-kit';

const driver = process.env.DB_DRIVER ?? 'sqlite';

const config = (() => {
  if (driver === 'sqlite') {
    return defineConfig({
      dialect: 'sqlite',
      schema: './src/schema/index.ts',
      out: './src/migrations',
      dbCredentials: {
        url: process.env.SQLITE_PATH ?? './data/kidsprogress.sqlite',
      },
    });
  }
  if (driver === 'postgres') {
    return defineConfig({
      dialect: 'postgresql',
      schema: './src/schema/index.ts',
      out: './src/migrations',
      dbCredentials: {
        url: process.env.DATABASE_URL ?? '',
      },
    });
  }
  if (driver === 'turso') {
    return defineConfig({
      dialect: 'turso',
      schema: './src/schema/index.ts',
      out: './src/migrations',
      dbCredentials: {
        url: process.env.TURSO_DATABASE_URL ?? '',
        authToken: process.env.TURSO_AUTH_TOKEN,
      },
    });
  }
  throw new Error(`Unknown DB_DRIVER: ${driver}`);
})();

export default config;
