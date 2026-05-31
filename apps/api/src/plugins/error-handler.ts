import fp from 'fastify-plugin';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

/**
 * Structural marker for our domain errors that want to surface a stable
 * `code` string (e.g. `AI_DISABLED`) in the JSON response so the client
 * can branch on it. Any error that exposes `code` + `statusCode` (and
 * optionally `meta`) flows through this path.
 */
interface CodedError extends Error {
  code: string;
  statusCode: number;
  meta?: Record<string, unknown>;
}

function isCodedError(e: unknown): e is CodedError {
  if (typeof e !== 'object' || e === null) return false;
  const o = e as Record<string, unknown>;
  return (
    typeof o.code === 'string' &&
    typeof o.statusCode === 'number' &&
    typeof o.message === 'string'
  );
}

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

      // Domain-coded errors (AI_DISABLED, AI_TOKEN_CAP_EXCEEDED, etc.) — JSON
      // carries `code` and optional `meta` so the client doesn't pattern-match
      // on `message`. Surfaced AFTER ZodError but BEFORE the generic fallback.
      if (isCodedError(error)) {
        const ce = error as CodedError;
        request.log.warn({ code: ce.code, status: ce.statusCode }, 'domain error');
        return reply.code(ce.statusCode).send({
          error: ce.code,
          code: ce.code,
          message: ce.message,
          ...(ce.meta ? { meta: ce.meta } : {}),
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
