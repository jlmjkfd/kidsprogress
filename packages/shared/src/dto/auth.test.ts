import { describe, expect, it } from 'vitest';
import {
  childLoginRequestSchema,
  loginRequestSchema,
  passwordSchema,
  pinResetCodeSchema,
  pinSchema,
  registerRequestSchema,
  viewAsChildRequestSchema,
} from './auth.js';

describe('auth DTOs', () => {
  it('login: requires email + password', () => {
    expect(loginRequestSchema.safeParse({ email: 'a@b.co' }).success).toBe(false);
    expect(
      loginRequestSchema.safeParse({ email: 'parent@example.com', password: 'longenoughpwd' })
        .success,
    ).toBe(true);
  });

  it('register: accepts optional locale', () => {
    const ok = registerRequestSchema.safeParse({
      email: 'p@example.com',
      password: 'a-strong-pwd',
      displayName: 'Parent',
      locale: 'zh',
    });
    expect(ok.success).toBe(true);
  });

  it('pin: enforces 4–6 digit shape', () => {
    for (const ok of ['1234', '12345', '123456']) {
      expect(pinSchema.safeParse(ok).success).toBe(true);
    }
    for (const bad of ['123', '1234567', 'abcd', '12 34']) {
      expect(pinSchema.safeParse(bad).success).toBe(false);
    }
  });

  it('pin reset code: enforces 6 digits exactly', () => {
    expect(pinResetCodeSchema.safeParse('123456').success).toBe(true);
    expect(pinResetCodeSchema.safeParse('12345').success).toBe(false);
    expect(pinResetCodeSchema.safeParse('1234567').success).toBe(false);
    expect(pinResetCodeSchema.safeParse('abcdef').success).toBe(false);
  });

  it('password: enforces minimum length', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('longenough').success).toBe(true);
  });

  it('child login: requires deviceToken + childId; pin is optional', () => {
    const ok = childLoginRequestSchema.safeParse({
      deviceToken: 'a'.repeat(20),
      childId: '0192c2f8-9c5e-7000-8000-000000000001',
    });
    expect(ok.success).toBe(true);

    const withPin = childLoginRequestSchema.safeParse({
      deviceToken: 'a'.repeat(20),
      childId: '0192c2f8-9c5e-7000-8000-000000000001',
      pin: '1234',
    });
    expect(withPin.success).toBe(true);
  });

  it('view-as-child: requires childId + parent PIN', () => {
    const ok = viewAsChildRequestSchema.safeParse({
      childId: '0192c2f8-9c5e-7000-8000-000000000001',
      parentPin: '1234',
    });
    expect(ok.success).toBe(true);
    const noPin = viewAsChildRequestSchema.safeParse({
      childId: '0192c2f8-9c5e-7000-8000-000000000001',
    });
    expect(noPin.success).toBe(false);
  });
});
