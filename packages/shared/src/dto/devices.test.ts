import { describe, expect, it } from 'vitest';
import {
  deviceLookupRequestSchema,
  registerDeviceRequestSchema,
} from './devices.js';

describe('devices DTOs', () => {
  it('register: requires label; empty childIds allowed', () => {
    expect(
      registerDeviceRequestSchema.safeParse({ label: 'Living room iPad', childIds: [] }).success,
    ).toBe(true);
    expect(registerDeviceRequestSchema.safeParse({ childIds: [] }).success).toBe(false);
  });

  it('register: childIds caps at 50', () => {
    const fifty = Array.from({ length: 50 }, (_, i) =>
      `0192c2f8-9c5e-7000-8000-${i.toString().padStart(12, '0')}`,
    );
    expect(
      registerDeviceRequestSchema.safeParse({ label: 'x', childIds: fifty }).success,
    ).toBe(true);
    expect(
      registerDeviceRequestSchema.safeParse({
        label: 'x',
        childIds: [...fifty, '0192c2f8-9c5e-7000-8000-000000000050'],
      }).success,
    ).toBe(false);
  });

  it('lookup: requires a device-token-ish string', () => {
    expect(deviceLookupRequestSchema.safeParse({ deviceToken: 'a'.repeat(20) }).success).toBe(true);
    expect(deviceLookupRequestSchema.safeParse({ deviceToken: 'short' }).success).toBe(false);
  });
});
