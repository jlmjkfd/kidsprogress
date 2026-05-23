import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * CLIENT STATE ONLY (project rule: Redux/Zustand never holds server data).
 * Only the access token + expiry live here. The user object itself comes
 * from TanStack Query's /api/auth/me cache — not duplicated.
 */
interface AuthState {
  accessToken: string | null;
  expiresAt: string | null;
  setToken: (token: string, expiresAt: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      expiresAt: null,
      setToken: (accessToken, expiresAt) => set({ accessToken, expiresAt }),
      clear: () => set({ accessToken: null, expiresAt: null }),
    }),
    { name: 'kp-auth' },
  ),
);

export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}
