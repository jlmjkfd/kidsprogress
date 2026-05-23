import fp from 'fastify-plugin';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

/**
 * Global error handler.
 *
 * - Validation errors (Zod) → 400 with field-level details, but never echoes back
 *   the raw request body (audit #13).
 * - Known fastify-sensible errors → pass through their status.
 * - Anything else → 500 with a generic message; full error logged server-side only.
 */
export const errorHandlerPlugin = fp(async function (app) {
  app.setErrorHandler(
    (error: FastifyError | ZodError, request: FastifyRequest, reply: FastifyReply) => {
      // Zod validation error from fastify-type-provider-zod
      if (error instanceof ZodError) {
        request.log.warn({ issues: error.issues, url: request.url }, 'validation failed');
        return reply.code(400).send({
          error: 'ValidationError',
          issues: error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code,
          })),
        });
      }

      // Fastify validation error (schema-level, comes through as a special-shaped error)
      if ('validation' in error && Array.isArray((error as FastifyError).validation)) {
        request.log.warn({ validation: (error as FastifyError).validation }, 'schema validation failed');
        return reply.code(400).send({
          error: 'ValidationError',
          issues: (error as FastifyError).validation,
        });
      }

      const status = (error as FastifyError).statusCode ?? 500;
      if (status >= 500) {
        request.log.error({ err: error }, 'unhandled error');
      } else {
        request.log.warn({ err: error }, 'client error');
      }

      return reply.code(status).send({
        error: status >= 500 ? 'InternalServerError' : error.name || 'Error',
        message: status >= 500 ? 'Something went wrong' : error.message,
      });
    },
  );
});
