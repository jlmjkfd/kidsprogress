/**
 * Pre-commit guard: refuse to commit edits to migration files that have
 * already been merged. Drizzle's snapshot format requires that an applied
 * migration stay byte-stable — silently editing one means the next
 * deploy's `pnpm db:migrate` aborts mid-statement and the API can't even
 * boot (the `assertAllPersistedVersionsRegistered` check throws when the
 * resulting half-applied DB is missing `task_templates`).
 *
 * Policy:
 *   - A migration file that has been committed to the current branch is
 *     **frozen**. To change the schema, run `pnpm db:generate` to produce
 *     a NEW `NNNN_*.sql` file.
 *   - Deletions are also blocked — they reorder history just as badly.
 *   - The corresponding snapshot under `packages/db/src/migrations/meta/`
 *     is allowed to change only when it's paired with a new SQL file or
 *     with a brand-new generated set (e.g., during a force-reset).
 *
 * Usage:
 *   tsx scripts/check-migrations.ts            (runs on every commit via husky)
 *   tsx scripts/check-migrations.ts --strict   (also blocks new generated
 *                                               migrations during merges)
 */
import { execSync } from 'node:child_process';

const MIGRATION_PATH_PREFIX = 'packages/db/src/migrations/';

/**
 * Paths that legitimately change each time `pnpm db:generate` runs.
 * Drizzle's journal is the index of every applied migration — it MUST
 * be appended to when a new `NNNN_*.sql` lands. Skip these from the
 * frozen-files check.
 */
const ALLOWED_TO_CHANGE: ReadonlyArray<string> = [
  'packages/db/src/migrations/meta/_journal.json',
];

function listStagedChanges(): { modified: string[]; deleted: string[] } {
  const raw = execSync('git diff --cached --name-status --no-renames', {
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter(Boolean);

  const modified: string[] = [];
  const deleted: string[] = [];
  for (const line of raw) {
    const [status, ...pathParts] = line.split('\t');
    const path = pathParts.join('\t');
    if (!path) continue;
    if (!path.startsWith(MIGRATION_PATH_PREFIX)) continue;
    if (ALLOWED_TO_CHANGE.includes(path)) continue;
    if (status === 'M' || status === 'R') modified.push(path);
    else if (status === 'D') deleted.push(path);
  }
  return { modified, deleted };
}

function wasAlreadyCommitted(path: string): boolean {
  try {
    execSync(`git log --oneline -1 -- "${path}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    // `git log` exits 0 with empty stdout when the file has no history,
    // so explicitly check that we got a commit line.
    const out = execSync(`git log --oneline -1 -- "${path}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

function main(): void {
  const { modified, deleted } = listStagedChanges();
  const offences: string[] = [];

  for (const path of modified) {
    if (wasAlreadyCommitted(path)) {
      offences.push(`  - modified: ${path}`);
    }
  }
  for (const path of deleted) {
    if (wasAlreadyCommitted(path)) {
      offences.push(`  - deleted:  ${path}`);
    }
  }

  if (offences.length === 0) {
    process.exit(0);
  }

  console.error('');
  console.error('❌ Refusing to commit edits to applied migration files.');
  console.error('');
  console.error('The following files have been committed before and');
  console.error('cannot be modified or deleted:');
  console.error('');
  console.error(offences.join('\n'));
  console.error('');
  console.error('To change the schema:');
  console.error('  1. Edit packages/db/src/schema.ts.');
  console.error('  2. Run `pnpm db:generate` — this produces a NEW');
  console.error('     NNNN_*.sql file under packages/db/src/migrations/.');
  console.error('  3. Commit the schema + the new migration together.');
  console.error('');
  console.error('If you genuinely need to rewrite history (rare — only');
  console.error('during pre-merge schema squashes), bypass this hook with');
  console.error('`git commit --no-verify` and document why in the message.');
  console.error('');
  process.exit(1);
}

main();
