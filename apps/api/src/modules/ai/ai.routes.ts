import type {
  FastifyBaseLogger,
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  taskInstances,
  taskTemplates,
  type Database_,
} from '@kidsprogress/db';
import {
  writingConfigV1Schema,
  type WritingConfigV1,
} from '@kidsprogress/shared';
import type { AppConfig } from '../../config.js';
import { createGemini, type Gemini } from '../../lib/gemini.js';
import { AiTemplateDisabledError } from './ai.errors.js';

type ZodFastify = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  ZodTypeProvider
>;

const writingEvalRequestSchema = z.object({
  instanceId: z.string().uuid(),
  text: z.string().min(1).max(5000),
});

const writingEvalResponseSchema = z.object({
  feedback: z.string(),
  totalTokens: z.number().int().nonnegative(),
});

const aiStatusResponseSchema = z.object({
  accountEnabled: z.boolean(),
  serverKeyConfigured: z.boolean(),
});

export interface AiRoutesDeps {
  db: Database_;
  config: AppConfig;
  /** Override for tests. */
  gemini?: Gemini;
}

export async function registerAiRoutes(
  app: ZodFastify,
  deps: AiRoutesDeps,
): Promise<void> {
  const gemini = deps.gemini ?? createGemini({ db: deps.db, config: deps.config });

  /** Lightweight status check the UI uses to decide whether to render AI bits. */
  app.get(
    '/status',
    {
      schema: { response: { 200: aiStatusResponseSchema } },
      config: { role: ['parent', 'child', 'child-readonly'] },
    },
    async (req, reply) => {
      const { users } = await import('@kidsprogress/db');
      const [parent] = await deps.db
        .select()
        .from(users)
        .where(eq(users.familyId, req.currentUser!.familyId))
        .limit(1);
      return reply.send({
        accountEnabled: parent?.aiFeaturesEnabled ?? false,
        serverKeyConfigured: !!deps.config.GEMINI_API_KEY,
      });
    },
  );

  /**
   * Writing evaluation. Verifies the template uses the `writing` handler
   * AND has `aiEvalEnabled=true`, then dispatches to the Gemini wrapper.
   * Wrapper enforces the account-level toggle + cap + key checks; we just
   * surface the typed errors.
   */
  app.post(
    '/writing-eval',
    {
      schema: {
        body: writingEvalRequestSchema,
        response: { 200: writingEvalResponseSchema },
      },
      config: { role: ['parent', 'child'] },
    },
    async (req, reply) => {
      // Load instance + template + assignment to confirm family scope.
      const [row] = await deps.db
        .select({ instance: taskInstances, template: taskTemplates })
        .from(taskInstances)
        .innerJoin(taskTemplates, eq(taskTemplates.id, taskInstances.templateId))
        .where(eq(taskInstances.id, req.body.instanceId))
        .limit(1);
      if (!row) throw app.httpErrors.notFound('Instance not found');
      if (row.template.parentId !== req.currentUser!.familyId) {
        throw app.httpErrors.notFound('Instance not found');
      }
      // child role: own instance only.
      if (
        req.currentUser!.role === 'child' &&
        req.currentUser!.id !== row.instance.childId
      ) {
        throw app.httpErrors.notFound('Instance not found');
      }
      if (row.template.handlerId !== 'writing') {
        throw app.httpErrors.badRequest('Template is not a writing template');
      }
      const config = writingConfigV1Schema.parse(
        row.template.config,
      ) as WritingConfigV1;
      if (!config.aiEvalEnabled) throw new AiTemplateDisabledError();

      // System prompt: small, calm, friendly. Never references the kid's
      // name; the Gemini wrapper will inject the age band on its own.
      const systemPrompt =
        'You are a kind, encouraging writing tutor for a child. ' +
        'Read the text the student wrote (it is wrapped in <user_content> tags). ' +
        'In 2 to 4 short sentences, name ONE thing they did well, then ONE thing ' +
        'to try next time. Use plain language. No code, no Markdown headings. ' +
        'If a rubric is supplied, weigh it: ' +
        (config.rubric ?? '(no rubric supplied — be general).');

      const result = await gemini.call({
        childId: row.instance.childId,
        instanceId: row.instance.id,
        feature: 'writing_eval',
        systemPrompt,
        userContent: req.body.text,
        maxOutputTokens: 240,
        temperature: 0.35,
      });

      return reply.send({
        feedback: result.text,
        totalTokens: result.totalTokens,
      });
    },
  );
}
