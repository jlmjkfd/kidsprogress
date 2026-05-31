/**
 * Rotate the local dev `JWT_SECRET` in `.env` to a fresh 256-bit value.
 *
 * Idempotent: re-running mints a new secret each time. Only touches the
 * `JWT_SECRET=...` line — every other env var is preserved byte-for-byte.
 *
 * Runs against the repo-root `.env` (the file `pnpm api:dev` actually
 * loads via `--env-file=../../.env`). Never touches `.env.example`.
 *
 * Usage:
 *   pnpm rotate:jwt-secret             — overwrites JWT_SECRET in .env
 *   pnpm rotate:jwt-secret --print     — prints a new secret without writing
 */
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_PATH = resolve(import.meta.dirname, '..', '.env');

function mint(): string {
  return randomBytes(32).toString('base64url');
}

function main(): void {
  const secret = mint();
  const args = new Set(process.argv.slice(2));

  if (args.has('--print')) {
    console.log(secret);
    return;
  }

  if (!existsSync(ENV_PATH)) {
    console.error(`No .env found at ${ENV_PATH}`);
    console.error('Run `cp .env.example .env` first, then rerun this command.');
    process.exit(1);
  }

  const original = readFileSync(ENV_PATH, 'utf8');
  const line = `JWT_SECRET=${secret}`;
  let next: string;

  if (/^JWT_SECRET=/m.test(original)) {
    next = original.replace(/^JWT_SECRET=.*$/m, line);
  } else {
    // Append at the end if for some reason it's missing.
    next = original.replace(/\n*$/, '\n') + line + '\n';
  }

  writeFileSync(ENV_PATH, next);
  console.log(`Rotated JWT_SECRET in ${ENV_PATH}.`);
  console.log('All existing parent + child sessions are now invalid.');
  console.log('Restart the API: pnpm --filter @kidsprogress/api dev');
}

main();
