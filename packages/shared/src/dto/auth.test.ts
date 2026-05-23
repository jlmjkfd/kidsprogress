import { describe, expect, it } from 'vitest';
import { loginRequestSchema, pinSchema, passwordSchema } from './auth.js';

describe('auth DTOs', () => {
  it('login: rejects missing fields', () => {
    const result = loginRequestSchema.safeParse({ email: 'a@b.co' });
    expect(result.success).toBe(false);
  });

  it('login: accepts well-formed input', () => {
    const result = loginRequestSchema.safeParse({
      email: 'parent@example.com',
      password: 'longenoughpwd',
    });
    expect(result.success).toBe(true);
  });

  it('pin: enforces 4–6 digit shape', () => {
    expect(pinSchema.safeParse('1234').success).toBe(true);
    expect(pinSchema.safeParse('123456').success).toBe(true);
    expect(pinSchema.safeParse('123').success).toBe(false);
    expect(pinSchema.safeParse('1234567').success).toBe(false);
    expect(pinSchema.safeParse('abcd').success).toBe(false);
  });

  it('password: enforces minimum length', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('longenough').success).toBe(true);
  });
});
