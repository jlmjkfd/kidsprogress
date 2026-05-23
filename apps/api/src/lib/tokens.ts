import { createHash, randomBytes } from 'node:crypto';

/**
 * Refresh tokens are high-entropy random strings stored as SHA-256 hashes
 * in the DB. This gives O(1) lookup by hash (audit fix #9 — v1 stored
 * bcrypt'd refresh tokens and did O(n·bcrypt) verify on every refresh).
 *
 * The plaintext token is shown to the client ONCE. Server only ever keeps
 * the hash + family + expiry.
 */

const REFRESH_TOKEN_BYTES = 48; // 384 bits — well over any brute-force concern

export function generateRefreshToken(): { token: string; tokenHash: string } {
  const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Parse a Fastify-JWT duration string like "15m" / "30d" into seconds.
 * Mirrors `ms` semantics for the subset we use.
 */
export function parseDurationSeconds(d: string): number {
  const m = /^(\d+)(s|m|h|d)$/.exec(d.trim());
  if (!m) throw new Error(`invalid duration: ${d}`);
  const n = Number(m[1]);
  const unit = m[2];
  const mult = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86_400;
  return n * mult;
}
