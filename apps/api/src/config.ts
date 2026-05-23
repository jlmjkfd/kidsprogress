import { z } from 'zod';

/**
 * Strict env parsing. The app refuses to start when required vars are missing
 * — no fallback secrets, no "your-secret-key-change-in-production" defaults.
 * (See audit finding #1.)
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  PORT: z.coerce.number().int().positive().default(8000),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),

  DB_DRIVER: z.enum(['sqlite', 'postgres', 'turso']).default('sqlite'),
  SQLITE_PATH: z.string().default('./data/kidsprogress.sqlite'),
  DATABASE_URL: z.string().optional(),
  TURSO_DATABASE_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  ARGON2_MEMORY_KIB: z.coerce.number().int().positive().default(19456),
  ARGON2_TIME: z.coerce.number().int().positive().default(2),
  ARGON2_PARALLELISM: z.coerce.number().int().positive().default(1),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  GEMINI_DAILY_TOKENS_PER_CHILD: z.coerce.number().int().nonnegative().default(5000),

  UPLOAD_STORE: z.enum(['local', 's3']).default('local'),
  UPLOADS_PATH: z.string().default('./data/uploads'),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(26_214_400),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
