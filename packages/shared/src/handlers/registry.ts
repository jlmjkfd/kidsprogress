import type { AnyHandlerModule, HandlerVersion } from './types.js';
import { genericHandler } from './generic.js';
import { additionSubtractionHandler } from './addition-subtraction.js';
import { writingHandler } from './writing.js';
import { readingLogHandler } from './reading-log.js';

/**
 * Registered handler modules. Add a new module here when implementing a
 * new template type. The `assertAllPersistedVersionsRegistered` boot check
 * (called from API startup) refuses to start if the DB references a
 * (handlerId, schemaVersion) combination this list doesn't cover.
 */
const REGISTRY: ReadonlyArray<AnyHandlerModule> = [
  genericHandler as AnyHandlerModule,
  additionSubtractionHandler as AnyHandlerModule,
  writingHandler as AnyHandlerModule,
  readingLogHandler as AnyHandlerModule,
];

const byId: ReadonlyMap<string, AnyHandlerModule> = new Map(
  REGISTRY.map((m) => [m.handlerId, m] as const),
);

export function listHandlerIds(): readonly string[] {
  return REGISTRY.map((m) => m.handlerId);
}

export function getHandler(handlerId: string): AnyHandlerModule | undefined {
  return byId.get(handlerId);
}

export function getHandlerVersion(
  handlerId: string,
  schemaVersion: number,
): HandlerVersion<unknown> | undefined {
  return getHandler(handlerId)?.versions.find((v) => v.schemaVersion === schemaVersion) as
    | HandlerVersion<unknown>
    | undefined;
}

/**
 * Validate an opaque `config` blob against the (handlerId, schemaVersion)
 * the template was authored against. Returns the parsed-and-typed config
 * or throws a `ZodError` whose `.issues` the route layer maps to 400.
 */
export function validateConfig(
  handlerId: string,
  schemaVersion: number,
  raw: unknown,
): unknown {
  const version = getHandlerVersion(handlerId, schemaVersion);
  if (!version) {
    throw new Error(
      `No registered handler version for (${handlerId}, v${schemaVersion}).`,
    );
  }
  return version.configSchema.parse(raw);
}

/**
 * Boot-time invariant. Pass it the set of `(handlerId, schemaVersion)`
 * pairs that currently appear in `task_templates`; throws if any pair
 * isn't registered. Prevents shipping a build that can't read its own DB.
 */
export function assertAllPersistedVersionsRegistered(
  persistedPairs: ReadonlyArray<{ handlerId: string; schemaVersion: number }>,
): void {
  const missing: string[] = [];
  for (const p of persistedPairs) {
    if (!getHandlerVersion(p.handlerId, p.schemaVersion)) {
      missing.push(`${p.handlerId}@v${p.schemaVersion}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Persisted handler versions not registered: ${missing.join(', ')}. ` +
        `Add the missing module(s) under packages/shared/src/handlers/ before booting.`,
    );
  }
}
