import type { LoggerOptions } from 'pino';
import type { AppConfig } from '../config.js';

/**
 * Logger options for Fastify. We pass options (not a pre-built pino instance)
 * so Fastify's `logger` typing matches `FastifyBaseLogger` cleanly.
 *
 * Redaction paths prevent us from ever logging passwords/tokens/bodies.
 * (See audit finding #13 — v1 leaked plaintext passwords via printing bodies.)
 */
export function getLoggerOptions(config: Pick<AppConfig, 'LOG_LEVEL' | 'NODE_ENV'>): LoggerOptions {
  return {
    level: config.LOG_LEVEL,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.passwordHash',
        '*.password_hash',
        '*.pin',
        '*.pinHash',
        '*.pin_hash',
        '*.token',
        '*.accessToken',
        '*.refreshToken',
        '*.token_hash',
        '*.tokenHash',
      ],
      censor: '[redacted]',
    },
    ...(config.NODE_ENV === 'development' && {
      transport: { target: 'pino-pretty', options: { colorize: true } },
    }),
  };
}
