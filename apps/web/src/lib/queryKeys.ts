/**
 * Centralized query keys. The audit found typo-driven cache misses in v1
 * ("activeTasks" vs "tasks") — keep all keys here so they can't drift.
 */
export const queryKeys = {
  health: () => ['health'] as const,
  me: () => ['me'] as const,
  children: {
    all: () => ['children'] as const,
    list: () => ['children', 'list'] as const,
    byId: (id: string) => ['children', 'byId', id] as const,
  },
  devices: {
    list: () => ['devices', 'list'] as const,
  },
};
