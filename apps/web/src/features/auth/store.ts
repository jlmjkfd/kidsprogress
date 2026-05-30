import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Auth client-state (Zustand). Only stores things the BROWSER owns:
 *   - `deviceToken` — the one-time token the parent pasted to "trust this
 *     device". Used to drive the public /api/devices/lookup roster + the
 *     /api/devices/child-login flow. Persisted to localStorage.
 *   - `parentAccessToken` — the short-lived parent JWT (15 min). Memory-only
 *     so it doesn't survive tab close; refresh cookie restores it.
 *   - `childAccessToken` — the short-lived child JWT (15 min). Memory-only.
 *
 * NEVER store parent passwords, child PINs, refresh tokens, or any server
 * data here.
 */
interface AuthState {
  deviceToken: string | null;
  parentAccessToken: string | null;
  parentAccessExpiresAt: string | null;
  childAccessToken: string | null;
  childAccessExpiresAt: string | null;
  setDeviceToken: (token: string | null) => void;
  setParentAccess: (token: string | null, expiresAt: string | null) => void;
  setChildAccess: (token: string | null, expiresAt: string | null) => void;
  clearAll: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      deviceToken: null,
      parentAccessToken: null,
      parentAccessExpiresAt: null,
      childAccessToken: null,
      childAccessExpiresAt: null,
      setDeviceToken: (token) => set({ deviceToken: token }),
      setParentAccess: (token, expiresAt) =>
        set({ parentAccessToken: token, parentAccessExpiresAt: expiresAt }),
      setChildAccess: (token, expiresAt) =>
        set({ childAccessToken: token, childAccessExpiresAt: expiresAt }),
      clearAll: () =>
        set({
          parentAccessToken: null,
          parentAccessExpiresAt: null,
          childAccessToken: null,
          childAccessExpiresAt: null,
        }),
    }),
    {
      name: 'kp-auth',
      // Persist ONLY the deviceToken to localStorage.
      partialize: (s) => ({ deviceToken: s.deviceToken }),
    },
  ),
);
