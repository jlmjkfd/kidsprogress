import { describe, expect, it } from 'vitest';
import {
  avatarKeySchema,
  birthYearSchema,
  createChildRequestSchema,
  setChildPinRequestSchema,
  updateChildRequestSchema,
  useChildPinResetRequestSchema,
} from './children.js';

describe('children DTOs', () => {
  it('avatarKey: avatar-01..avatar-12 only', () => {
    for (const ok of ['avatar-01', 'avatar-09', 'avatar-10', 'avatar-12']) {
      expect(avatarKeySchema.safeParse(ok).success).toBe(true);
    }
    for (const bad of ['avatar-00', 'avatar-13', 'avatar-1', 'avatar-099', 'cat', '']) {
      expect(avatarKeySchema.safeParse(bad).success).toBe(false);
    }
  });

  it('birthYear: within a sane range, no half-years', () => {
    expect(birthYearSchema.safeParse(2017).success).toBe(true);
    expect(birthYearSchema.safeParse(2017.5).success).toBe(false);
    expect(birthYearSchema.safeParse(1999).success).toBe(false);
    expect(birthYearSchema.safeParse(2031).success).toBe(false);
  });

  it('create: avatarKey defaults to avatar-01', () => {
    const parsed = createChildRequestSchema.safeParse({ displayName: 'Alice' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.avatarKey).toBe('avatar-01');
  });

  it('create: rejects empty displayName', () => {
    expect(createChildRequestSchema.safeParse({ displayName: '' }).success).toBe(false);
  });

  it('create: accepts pin + dailyAiTokenCap + streakOptIn', () => {
    const ok = createChildRequestSchema.safeParse({
      displayName: 'Alice',
      birthYear: 2017,
      pinRequired: true,
      pin: '1234',
      dailyAiTokenCap: 3000,
      streakOptIn: true,
    });
    expect(ok.success).toBe(true);
  });

  it('update: omits `pin` (must use setChildPin), allows archivedAt', () => {
    const tryWithPin = updateChildRequestSchema.safeParse({ pin: '1234' });
    // Zod by default strips unknown keys silently — assert by checking the
    // parsed shape DOES NOT carry pin through.
    if (tryWithPin.success) {
      expect((tryWithPin.data as Record<string, unknown>)['pin']).toBeUndefined();
    }
    const archive = updateChildRequestSchema.safeParse({
      archivedAt: '2026-05-31T10:00:00.000Z',
    });
    expect(archive.success).toBe(true);
  });

  it('setChildPin: only takes a PIN', () => {
    expect(setChildPinRequestSchema.safeParse({ pin: '1234' }).success).toBe(true);
    expect(setChildPinRequestSchema.safeParse({}).success).toBe(false);
  });

  it('useChildPinReset: needs childId + 6-digit code + new PIN', () => {
    const ok = useChildPinResetRequestSchema.safeParse({
      childId: '0192c2f8-9c5e-7000-8000-000000000001',
      resetCode: '123456',
      newPin: '4321',
    });
    expect(ok.success).toBe(true);
    const noCode = useChildPinResetRequestSchema.safeParse({
      childId: '0192c2f8-9c5e-7000-8000-000000000001',
      newPin: '4321',
    });
    expect(noCode.success).toBe(false);
  });
});
