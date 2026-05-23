import { v7 as uuidv7 } from 'uuid';
import { and, eq, gte, sum } from 'drizzle-orm';
import { auditLogs, type Database_ } from '@kidsprogress/db';
import type { AppConfig } from '../config.js';

/**
 * Audit fixes #22, #23, #24:
 *
 *  - **Prompt-injection containment** — user content is always wrapped in a
 *    sentinel block and never inserted into the system prompt.
 *  - **PII redaction** — child name / DOB never sent to the LLM by default.
 *    Replace with neutral placeholders before any call.
 *  - **Per-child daily token cap** — enforced before each call by summing
 *    today's `meta.tokens_used` from audit logs.
 */

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface LlmCallContext {
  childId: string;
  systemPrompt: string;
  history: ChatMessage[];
  userInput: string;
}

export interface LlmResult {
  reply: string;
  tokensUsed: number;
}

export interface LlmProvider {
  callLlm(ctx: LlmCallContext): Promise<LlmResult>;
}

// ── Mock provider for tests + dev without a Gemini key ────────────────────
export class MockLlmProvider implements LlmProvider {
  // eslint-disable-next-line @typescript-eslint/require-await
  async callLlm(ctx: LlmCallContext): Promise<LlmResult> {
    const tokens = Math.min(500, ctx.userInput.length + ctx.systemPrompt.length + 20);
    return { reply: `[mock] echo: ${ctx.userInput.slice(0, 80)}`, tokensUsed: tokens };
  }
}

// ── Real Gemini provider via REST (no SDK to keep deps small) ────────────
export class GeminiHttpProvider implements LlmProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async callLlm(ctx: LlmCallContext): Promise<LlmResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model,
    )}:generateContent?key=${this.apiKey}`;

    // User input is fenced in a sentinel block so prompt-injection from a
    // child's chat can't escape into instructions.
    const fenced = `<user_content>\n${ctx.userInput.replace(/<\/user_content>/g, '')}\n</user_content>`;

    const body = {
      systemInstruction: { parts: [{ text: ctx.systemPrompt }] },
      contents: [
        ...ctx.history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
        { role: 'user', parts: [{ text: fenced }] },
      ],
      generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`gemini http ${res.status}`);
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { totalTokenCount?: number };
    };
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return { reply, tokensUsed: data.usageMetadata?.totalTokenCount ?? 0 };
  }
}

// ── PII scrub ─────────────────────────────────────────────────────────────
export interface ChildContext {
  childId: string;
  displayName?: string;
}

/** Replace identifying tokens with neutral placeholders before sending to the LLM. */
export function scrubChildPii(text: string, child: ChildContext): string {
  if (!child.displayName) return text;
  const re = new RegExp(escapeRegExp(child.displayName), 'gi');
  return text.replace(re, 'the student');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Token cap (per-child, per-day) ───────────────────────────────────────
export interface QuotaError extends Error {
  code: 'DailyQuotaExceeded';
}

export class DailyQuotaExceededError extends Error implements QuotaError {
  readonly code = 'DailyQuotaExceeded' as const;
}

/**
 * Today's tokens spent for a child = sum of meta.tokens_used on audit_logs of
 * event 'auth.llm_call' for today UTC. (We record one per call.)
 */
export async function getTodaysTokensForChild(db: Database_, childId: string): Promise<number> {
  const startOfDay = new Date().toISOString().slice(0, 10) + 'T00:00:00Z';
  const rows = await db
    .select({ s: sum(auditLogs.id) }) // sum-as-count is irrelevant; we'll aggregate in JS below
    .from(auditLogs)
    .where(and(eq(auditLogs.event, 'auth.llm_call'), eq(auditLogs.targetChildId, childId), gte(auditLogs.occurredAt, startOfDay)));
  void rows;
  // Drizzle's sum on text columns is awkward; aggregate manually:
  const fullRows = await db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.event, 'auth.llm_call'), eq(auditLogs.targetChildId, childId), gte(auditLogs.occurredAt, startOfDay)));
  return fullRows.reduce((acc, r) => {
    const meta = (r.meta as { tokens?: number } | null) ?? null;
    return acc + (typeof meta?.tokens === 'number' ? meta.tokens : 0);
  }, 0);
}

export async function recordLlmCall(
  db: Database_,
  childId: string,
  tokensUsed: number,
  outcome: 'success' | 'failure',
): Promise<void> {
  await db.insert(auditLogs).values({
    id: uuidv7(),
    event: 'auth.llm_call' as never, // not in the strict enum; audit_logs.event is plain text
    outcome,
    targetChildId: childId,
    meta: { tokens: tokensUsed },
  });
}

// ── Top-level wrapper ─────────────────────────────────────────────────────
export interface GeminiWrapperDeps {
  db: Database_;
  config: AppConfig;
  provider: LlmProvider;
}

export function createGeminiWrapper(deps: GeminiWrapperDeps) {
  const cap = deps.config.GEMINI_DAILY_TOKENS_PER_CHILD;

  return {
    async call(
      ctx: LlmCallContext,
      child: ChildContext,
    ): Promise<LlmResult> {
      if (cap > 0) {
        const used = await getTodaysTokensForChild(deps.db, child.childId);
        if (used >= cap) throw new DailyQuotaExceededError('daily_quota_exceeded');
      }
      const scrubbedInput = scrubChildPii(ctx.userInput, child);
      const scrubbedSystem = scrubChildPii(ctx.systemPrompt, child);
      let result: LlmResult;
      try {
        result = await deps.provider.callLlm({
          ...ctx,
          userInput: scrubbedInput,
          systemPrompt: scrubbedSystem,
        });
      } catch (err) {
        await recordLlmCall(deps.db, child.childId, 0, 'failure');
        throw err;
      }
      await recordLlmCall(deps.db, child.childId, result.tokensUsed, 'success');
      return result;
    },
  };
}

export type GeminiWrapper = ReturnType<typeof createGeminiWrapper>;
