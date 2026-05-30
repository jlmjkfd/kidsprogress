import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './store';

beforeEach(() => {
  useAuthStore.setState({
    deviceToken: null,
    parentAccessToken: null,
    parentAccessExpiresAt: null,
    childAccessToken: null,
    childAccessExpiresAt: null,
  });
  // Wipe localStorage between tests (jsdom).
  localStorage.clear();
});

describe('auth store', () => {
  it('starts empty', () => {
    const s = useAuthStore.getState();
    expect(s.deviceToken).toBeNull();
    expect(s.parentAccessToken).toBeNull();
    expect(s.childAccessToken).toBeNull();
  });

  it('setDeviceToken persists to localStorage', () => {
    useAuthStore.getState().setDeviceToken('abc-token-1234567890');
    expect(useAuthStore.getState().deviceToken).toBe('abc-token-1234567890');
    const raw = localStorage.getItem('kp-auth');
    expect(raw).toContain('abc-token-1234567890');
  });

  it('access tokens are NOT persisted', () => {
    useAuthStore.getState().setParentAccess('p-token', '2099-01-01T00:00:00Z');
    useAuthStore.getState().setChildAccess('c-token', '2099-01-01T00:00:00Z');
    const raw = localStorage.getItem('kp-auth') ?? '';
    expect(raw).not.toContain('p-token');
    expect(raw).not.toContain('c-token');
  });

  it('clearAll wipes access tokens but keeps deviceToken (logout)', () => {
    const s = useAuthStore.getState();
    s.setDeviceToken('d-token-1234567890');
    s.setParentAccess('p', '2099-01-01T00:00:00Z');
    s.setChildAccess('c', '2099-01-01T00:00:00Z');
    s.clearAll();
    const after = useAuthStore.getState();
    expect(after.parentAccessToken).toBeNull();
    expect(after.childAccessToken).toBeNull();
    expect(after.deviceToken).toBe('d-token-1234567890');
  });
});
