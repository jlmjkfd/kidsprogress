import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Database_ } from '@kidsprogress/db';
import { buildTestApp } from './helpers/test-app.js';
import { createGemini } from '../src/lib/gemini.js';

let app: FastifyInstance;
let db: Database_;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  const built = await buildTestApp();
  app = built.app;
  db = built.db;
  cleanup = built.cleanup;
});

afterEach(async () => {
  await cleanup();
});

interface ParentSession {
  accessToken: string;
  userId: string;
  familyId: string;
}

async function registerParent(email = 'parent@example.com'): Promise<ParentSession> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'correct-horse-battery', displayName: 'Alex' },
  });
  expect(res.statusCode).toBe(201);
  const body = res.json() as {
    user: { id: string; familyId: string };
    tokens: { accessToken: string };
  };
  return {
    accessToken: body.tokens.accessToken,
    userId: body.user.id,
    familyId: body.user.familyId,
  };
}

async function setupWritingInstance(
  session: ParentSession,
  templateOverride: Record<string, unknown> = {},
): Promise<{ childId: string; instanceId: string }> {
  const child = await app.inject({
    method: 'POST',
    url: '/api/children',
    headers: { authorization: `Bearer ${session.accessToken}` },
    payload: { displayName: 'Mia', avatarKey: 'avatar-01', birthYear: 2018 },
  });
  const childId = (child.json() as { id: string }).id;
  const tpl = await app.inject({
    method: 'POST',
    url: '/api/templates',
    headers: { authorization: `Bearer ${session.accessToken}` },
    payload: {
      handlerId: 'writing',
      schemaVersion: 1,
      name: 'Write about your weekend',
      config: {
        prompt: 'Tell me about your weekend.',
        minWords: 5,
        maxWords: 50,
        aiEvalEnabled: true,
        ...templateOverride,
      },
    },
  });
  const templateId = (tpl.json() as { id: string }).id;
  const assignment = await app.inject({
    method: 'POST',
    url: '/api/assignments',
    headers: { authorization: `Bearer ${session.accessToken}` },
    payload: {
      templateId,
      childId,
      timezone: 'UTC',
      effectiveFrom: '2026-06-01T00:00:00.000Z',
      schedulingType: 'flexible',
      obligation: 'required',
    },
  });
  const assignmentId = (assignment.json() as { id: string }).id;
  const started = await app.inject({
    method: 'POST',
    url: '/api/instances/transition',
    headers: { authorization: `Bearer ${session.accessToken}` },
    payload: {
      assignmentId,
      originalDate: '2026-06-01T00:00:00.000Z',
      action: 'start',
    },
  });
  const instanceId = (started.json() as { id: string }).id;
  return { childId, instanceId };
}

const SAMPLE_TEXT =
  'I went to the park with my sister and we played on the swings.';

describe('GET /api/ai/status', () => {
  it('returns enabled=false + keyConfigured=false by default', async () => {
    const session = await registerParent();
    const res = await app.inject({
      method: 'GET',
      url: '/api/ai/status',
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      accountEnabled: false,
      serverKeyConfigured: false,
    });
  });

  it('reflects the toggle after enabling', async () => {
    const session = await registerParent();
    await app.inject({
      method: 'POST',
      url: '/api/auth/me/ai-features',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { enabled: true },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/ai/status',
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect((res.json() as { accountEnabled: boolean }).accountEnabled).toBe(true);
  });
});

describe('Gemini wrapper (unit)', () => {
  it('throws AI_DISABLED when the family toggle is off', async () => {
    const session = await registerParent();
    const { childId } = await setupWritingInstance(session);
    const gemini = createGemini({
      db,
      config: {
        GEMINI_API_KEY: 'fake-key-for-test',
        GEMINI_MODEL: 'gemini-test',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      transport: vi.fn(),
    });
    await expect(
      gemini.call({
        childId,
        feature: 'writing_eval',
        systemPrompt: 'system',
        userContent: 'hello',
        maxOutputTokens: 50,
      }),
    ).rejects.toMatchObject({ code: 'AI_DISABLED', statusCode: 403 });
  });

  it('throws AI_KEY_NOT_CONFIGURED when env key is missing', async () => {
    const session = await registerParent();
    const { childId } = await setupWritingInstance(session);
    await app.inject({
      method: 'POST',
      url: '/api/auth/me/ai-features',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { enabled: true },
    });
    const gemini = createGemini({
      db,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: { GEMINI_MODEL: 'gemini-test' } as any,
      transport: vi.fn(),
    });
    await expect(
      gemini.call({
        childId,
        feature: 'writing_eval',
        systemPrompt: 'system',
        userContent: 'hello',
        maxOutputTokens: 50,
      }),
    ).rejects.toMatchObject({ code: 'AI_KEY_NOT_CONFIGURED', statusCode: 503 });
  });

  it('throws AI_TOKEN_CAP_EXCEEDED when the call would push past the cap', async () => {
    const session = await registerParent();
    const { childId } = await setupWritingInstance(session);
    await app.inject({
      method: 'POST',
      url: '/api/auth/me/ai-features',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { enabled: true },
    });
    // Bump child's cap to a tiny value so we trip on the first request.
    const { children } = await import('@kidsprogress/db');
    const { eq } = await import('drizzle-orm');
    await db.update(children).set({ dailyAiTokenCap: 5 }).where(eq(children.id, childId));

    const gemini = createGemini({
      db,
      config: {
        GEMINI_API_KEY: 'fake',
        GEMINI_MODEL: 'gemini-test',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      transport: vi.fn(),
    });
    await expect(
      gemini.call({
        childId,
        feature: 'writing_eval',
        systemPrompt: 'a long system prompt that easily exceeds five tokens',
        userContent: 'long enough to bust the cap',
        maxOutputTokens: 200,
      }),
    ).rejects.toMatchObject({ code: 'AI_TOKEN_CAP_EXCEEDED', statusCode: 429 });
  });

  it('happy path: returns feedback + logs a row', async () => {
    const session = await registerParent();
    const { childId } = await setupWritingInstance(session);
    await app.inject({
      method: 'POST',
      url: '/api/auth/me/ai-features',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { enabled: true },
    });

    const transport = vi.fn().mockResolvedValue({
      text: 'Great descriptive words! Next time try varying your sentences.',
      promptTokens: 40,
      completionTokens: 22,
    });
    const gemini = createGemini({
      db,
      config: {
        GEMINI_API_KEY: 'fake-key-for-test',
        GEMINI_MODEL: 'gemini-test',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      transport,
    });

    const result = await gemini.call({
      childId,
      feature: 'writing_eval',
      systemPrompt: 'you are kind tutor',
      userContent: SAMPLE_TEXT,
      maxOutputTokens: 100,
    });
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.totalTokens).toBe(62);
    // Verify transport called with fenced user content (no kid name leak).
    const body = (transport.mock.calls[0]?.[2] ?? {}) as {
      contents: { parts: { text: string }[] }[];
      systemInstruction: { parts: { text: string }[] };
    };
    const sentText = body.contents[0]!.parts[0]!.text;
    expect(sentText).toContain('<user_content>');
    expect(sentText).toContain(SAMPLE_TEXT);
    expect(body.systemInstruction.parts[0]!.text).not.toContain('Mia');
    expect(body.systemInstruction.parts[0]!.text).toContain('the student');

    // llm_log row written.
    const { llmLogs } = await import('@kidsprogress/db');
    const rows = await db.select().from(llmLogs);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.totalTokens).toBe(62);
  });
});

describe('POST /api/ai/writing-eval (HTTP)', () => {
  it('rejects with AI_DISABLED when the toggle is off', async () => {
    const session = await registerParent();
    const { instanceId } = await setupWritingInstance(session);
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/writing-eval',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { instanceId, text: SAMPLE_TEXT },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: 'AI_DISABLED' });
  });

  it("rejects with AI_TEMPLATE_DISABLED when the template's flag is off", async () => {
    const session = await registerParent();
    await app.inject({
      method: 'POST',
      url: '/api/auth/me/ai-features',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { enabled: true },
    });
    const { instanceId } = await setupWritingInstance(session, {
      aiEvalEnabled: false,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/writing-eval',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { instanceId, text: SAMPLE_TEXT },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'AI_TEMPLATE_DISABLED' });
  });
});
