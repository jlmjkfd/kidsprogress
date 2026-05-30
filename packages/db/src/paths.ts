import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolves the repo root from this file's location.
 *
 *   packages/db/src/paths.ts → ../../.. → repo root
 *
 * Used so that scripts run with different `cwd`s (pnpm runs each workspace
 * script from that workspace's directory) still resolve `./data/...` to the
 * same SQLite file at the repo root.
 */
export const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');

export function resolveFromRepoRoot(p: string): string {
  return resolve(repoRoot, p);
}
