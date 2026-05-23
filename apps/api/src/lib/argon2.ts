import argon2 from 'argon2';
import type { AppConfig } from '../config.js';

/**
 * argon2id with parameters tuned for the Atom CE5335 on DS216+II
 * (see audit fix #15 — v1 used bcrypt 4.0.1 + unmaintained passlib).
 *
 * The defaults from AppConfig produce ≈50 ms per hash on that CPU,
 * which gives meaningful resistance without blocking the event loop.
 */
export function makeHasher(config: Pick<AppConfig, 'ARGON2_MEMORY_KIB' | 'ARGON2_TIME' | 'ARGON2_PARALLELISM'>) {
  const options = {
    type: argon2.argon2id,
    memoryCost: config.ARGON2_MEMORY_KIB,
    timeCost: config.ARGON2_TIME,
    parallelism: config.ARGON2_PARALLELISM,
  } as const;

  return {
    hash(plain: string): Promise<string> {
      return argon2.hash(plain, options);
    },
    /** Constant-time verify. Returns false on any mismatch or malformed hash. */
    async verify(hash: string, plain: string): Promise<boolean> {
      try {
        return await argon2.verify(hash, plain);
      } catch {
        return false;
      }
    },
  };
}

export type Hasher = ReturnType<typeof makeHasher>;
