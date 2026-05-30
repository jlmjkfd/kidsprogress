import type { z } from 'zod';

/**
 * KidsProgress handler registry — the single point of truth for what a
 * task template's `config` blob means.
 *
 * Each concrete handler module exports `handler<ConfigVN>` per
 * `schemaVersion` it understands, plus a pure `migrateFromPrev` from the
 * previous version. The host (API + web) never reads `config` fields
 * directly — it dispatches through `validateConfig(handlerId, version, raw)`.
 *
 * AI metadata (prompt template, response schema, budget slot, model) lives
 * on the version manifest — NOT on `task_templates`. The parent's only AI
 * knob is the boolean `aiAssistEnabled`.
 */

export interface HandlerVersion<Config, ExecutionPayload = Config> {
  readonly schemaVersion: number;
  /** Validates the opaque `config` blob; throws on shape mismatch. */
  readonly configSchema: z.ZodType<Config>;
  /**
   * Builds the executor-facing payload from a validated config. Lets the
   * registry hot-path return a typed payload without re-validating.
   */
  readonly toExecutionPayload?: (config: Config) => ExecutionPayload;
  /**
   * Migrates a previously-stored config of the prior schema version up to
   * this one. Pure function — no I/O, no state. Returns the new config or
   * throws on irrecoverable drift.
   */
  readonly migrateFromPrev?: (prior: unknown) => Config;
  /** Optional AI metadata. Inspected only by the Gemini wrapper. */
  readonly ai?: {
    readonly budgetSlot: 'writing-eval' | 'math-hint' | 'recommendation' | 'none';
    readonly promptTemplate: string;
    readonly responseSchema: z.ZodType<unknown>;
    readonly maxTokens: number;
    readonly model: string;
  };
}

export interface HandlerModule<Config> {
  readonly handlerId: string;
  readonly versions: ReadonlyArray<HandlerVersion<Config>>;
}

export type AnyHandlerModule = HandlerModule<unknown>;
