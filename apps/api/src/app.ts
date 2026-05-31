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
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { registerChildrenRoutes } from './modules/children/children.routes.js';
import { registerDevicesRoutes } from './modules/devices/devices.routes.js';
import { registerTemplatesRoutes } from './modules/templates/templates.routes.js';
import { registerAssignmentsRoutes } from './modules/assignments/assignments.routes.js';
import { registerSchedulingRoutes } from './modules/scheduling/scheduling.routes.js';
import { registerInstancesRoutes } from './modules/instances/instances.routes.js';
import { registerSessionsRoutes } from './modules/sessions/sessions.routes.js';
import { registerAiRoutes } from './modules/ai/ai.routes.js';
import { createTemplatesRepo } from './modules/templates/templates.repo.js';
import { assertAllPersistedVersionsRegistered } from '@kidsprogress/shared';

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
  await app.register(fastifyCookie);
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
  await app.register(authPlugin, { config });

  await registerHealthRoutes(app, { db });
  await app.register(
    async function authScope(scope) {
      await registerAuthRoutes(scope.withTypeProvider<ZodTypeProvider>(), { db, config });
    },
    { prefix: '/api/auth' },
  );
  await app.register(
    async function childrenScope(scope) {
      await registerChildrenRoutes(scope.withTypeProvider<ZodTypeProvider>(), { db, config });
    },
    { prefix: '/api/children' },
  );
  await app.register(
    async function devicesScope(scope) {
      await registerDevicesRoutes(scope.withTypeProvider<ZodTypeProvider>(), { db, config });
    },
    { prefix: '/api/devices' },
  );
  await app.register(
    async function templatesScope(scope) {
      await registerTemplatesRoutes(scope.withTypeProvider<ZodTypeProvider>(), { db });
    },
    { prefix: '/api/templates' },
  );
  await app.register(
    async function assignmentsScope(scope) {
      await registerAssignmentsRoutes(scope.withTypeProvider<ZodTypeProvider>(), { db });
    },
    { prefix: '/api/assignments' },
  );
  await app.register(
    async function schedulingScope(scope) {
      await registerSchedulingRoutes(scope.withTypeProvider<ZodTypeProvider>(), { db });
    },
    { prefix: '/api/scheduling' },
  );
  await app.register(
    async function instancesScope(scope) {
      await registerInstancesRoutes(scope.withTypeProvider<ZodTypeProvider>(), { db });
    },
    { prefix: '/api/instances' },
  );
  await app.register(
    async function sessionsScope(scope) {
      await registerSessionsRoutes(scope.withTypeProvider<ZodTypeProvider>(), { db });
    },
    { prefix: '/api/instances' },
  );
  await app.register(
    async function aiScope(scope) {
      await registerAiRoutes(scope.withTypeProvider<ZodTypeProvider>(), { db, config });
    },
    { prefix: '/api/ai' },
  );

  // Boot invariant: every (handlerId, schemaVersion) pair persisted in
  // task_templates must be covered by a registered handler module. Refuses
  // to start an API that can't validate its own data.
  const persisted = await createTemplatesRepo(db).listPersistedHandlerVersions();
  assertAllPersistedVersionsRegistered(persisted);

  return app;
}
