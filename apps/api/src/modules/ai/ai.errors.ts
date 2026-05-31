/**
 * AI-feature errors. Each carries a stable `code` string the web client
 * branches on (instead of pattern-matching the message). Names follow
 * SCREAMING_SNAKE so the client can compare against constants.
 *
 *  - `AI_DISABLED` (403)        — the account-level kill switch is OFF.
 *  - `AI_KEY_NOT_CONFIGURED` (503) — server has no GEMINI_API_KEY set.
 *  - `AI_TOKEN_CAP_EXCEEDED` (429) — this child's daily quota is spent.
 *  - `AI_CALL_FAILED` (502)     — upstream Gemini returned an error.
 *  - `AI_TEMPLATE_DISABLED` (409) — template's per-feature flag is off.
 */

abstract class AiError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  /** Extra metadata the route layer surfaces in the JSON response. */
  readonly meta: Record<string, unknown> = {};
}

export class AiDisabledError extends AiError {
  readonly code = 'AI_DISABLED';
  readonly statusCode = 403;
  constructor() {
    super('AI features are disabled on this account.');
  }
}

export class AiKeyNotConfiguredError extends AiError {
  readonly code = 'AI_KEY_NOT_CONFIGURED';
  readonly statusCode = 503;
  constructor() {
    super('Server has no Gemini API key configured.');
  }
}

export class AiTokenCapExceededError extends AiError {
  readonly code = 'AI_TOKEN_CAP_EXCEEDED';
  readonly statusCode = 429;
  override readonly meta: { used: number; cap: number };
  constructor(used: number, cap: number) {
    super('Daily AI token cap reached for this child.');
    this.meta = { used, cap };
  }
}

export class AiCallFailedError extends AiError {
  readonly code = 'AI_CALL_FAILED';
  readonly statusCode = 502;
  constructor(message: string) {
    super(message);
  }
}

export class AiTemplateDisabledError extends AiError {
  readonly code = 'AI_TEMPLATE_DISABLED';
  readonly statusCode = 409;
  constructor() {
    super('This task template does not have AI evaluation enabled.');
  }
}
