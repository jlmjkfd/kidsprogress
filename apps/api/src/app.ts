import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySensible from '@fastify/sensible';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { createDb, type Database_ } from '@kidsprogress/db';
import type { AppConfig } from './config.js';
import { getLoggerOptions } from './lib/logger.js';
import { authPlugin } from './plugins/auth.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { registerHealthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { childrenRoutes } from './modules/children/children.routes.js';
import { devicesRoutes } from './modules/devices/devices.routes.js';
import { tasksRoutes } from './modules/tasks/tasks.routes.js';
import { completionsRoutes } from './modules/completions/completions.routes.js';
import { subtasksRoutes } from './modules/subtasks/subtasks.routes.js';
import { collectionsRoutes } from './modules/collections/collections.routes.js';
import { sessionsRoutes } from './modules/sessions/sessions.routes.js';

export interface AppDeps {
  config: AppConfig;
  db?: Database_;
}

export async function buildApp(deps: AppDeps) {
  const { config } = deps;
  const db = deps.db ?? createDb();

  const app = Fastify({
    logger: getLoggerOptions(config),
    disableRequestLogging: false,
    trustProxy: true,
    bodyLimit: 1_048_576, // 1 MiB for JSON; multipart routes raise this per-route
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(errorHandlerPlugin);
  await app.register(fastifySensible);
  await app.register(fastifyCors, {
    origin: config.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Timezone'],
  });
  await app.register(fastifyHelmet, {
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
  await app.register(fastifyRateLimit, {
    global: false, // per-route opt-in (auth endpoints will opt in)
    max: 200,
    timeWindow: '1 minute',
  });
  await app.register(fastifyCookie);
  await app.register(authPlugin, { config });

  await registerHealthRoutes(app, { db });
  await app.register(authRoutes, { db, config });
  await app.register(childrenRoutes, { db, config });
  await app.register(devicesRoutes, { db, config });
  await app.register(tasksRoutes, { db });
  await app.register(completionsRoutes, { db });
  await app.register(subtasksRoutes, { db });
  await app.register(collectionsRoutes, { db });
  await app.register(sessionsRoutes, { db });

  return app;
}
