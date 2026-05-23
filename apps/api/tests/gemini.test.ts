import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDb, resolveFromRepoRoot, type Database_ } from '@kidsprogress/db';
import {
  MockLlmProvider,
  createGeminiWrapper,
  DailyQuotaExceededError,
  scrubChildPii,
} from '../src/lib/gemini.js';
import { loadConfig } from '../src/config.js';

describe('gemini wrapper', () => {
  let db: Database_;
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'kp-gemini-test-'));
    process.env.JWT_SECRET = 'test-secret-with-enough-length-1234567890';
    process.env.NODE_ENV = 'test';
    process.env.SQLITE_PATH = join(dir, 'test.sqlite');
    process.env.LOG_LEVEL = 'fatal';
    db = createDb();
    migrate(db, { migrationsFolder: resolveFromRepoRoot('packages/db/src/migrations') });
  });
  afterEach(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch { /* windows */ }
  });

  it('scrubs the child name from outgoing prompts', () => {
    expect(scrubChildPii('Alice loves math.', { childId: 'x', displayName: 'Alice' })).toBe(
      'the student loves math.',
    );
  });

  it('mock provider returns a reply and tokens used', async () => {
    process.env.GEMINI_DAILY_TOKENS_PER_CHILD = '1000';
    const config = loadConfig();
    const wrapper = createGeminiWrapper({ db, config, provider: new MockLlmProvider() });
    const res = await wrapper.call(
      { childId: 'c1', systemPrompt: 'helpful', history: [], userInput: 'hi' },
      { childId: 'c1', displayName: 'Alice' },
    );
    expect(res.reply).toContain('[mock]');
    expect(res.tokensUsed).toBeGreaterThan(0);
  });

  it('enforces daily token cap', async () => {
    process.env.GEMINI_DAILY_TOKENS_PER_CHILD = '20';
    const config = loadConfig();
    const wrapper = createGeminiWrapper({ db, config, provider: new MockLlmProvider() });
    // First call (small) — passes
    await wrapper.call(
      { childId: 'c1', systemPrompt: 'sys', history: [], userInput: 'short' },
      { childId: 'c1' },
    );
    // Second call should push over the cap
    await expect(
      wrapper.call(
        {
          childId: 'c1',
          systemPrompt: 'a longer system prompt that uses more tokens',
          history: [],
          userInput: 'and a longer user input that should bust the cap',
        },
        { childId: 'c1' },
      ),
    ).rejects.toBeInstanceOf(DailyQuotaExceededError);
  });

  it('cap=0 disables enforcement', async () => {
    process.env.GEMINI_DAILY_TOKENS_PER_CHILD = '0';
    const config = loadConfig();
    const wrapper = createGeminiWrapper({ db, config, provider: new MockLlmProvider() });
    for (let i = 0; i < 5; i++) {
      const r = await wrapper.call(
        { childId: 'c2', systemPrompt: 'sys', history: [], userInput: 'whatever' },
        { childId: 'c2' },
      );
      expect(r.reply).toBeTruthy();
    }
  });
});
