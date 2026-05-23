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
  tasks: {
    all: () => ['tasks'] as const,
    listByChild: (childId: string) => ['tasks', 'child', childId] as const,
    byId: (id: string) => ['tasks', 'byId', id] as const,
    instances: (childId: string, fromDate: string, toDate: string) =>
      ['tasks', 'instances', childId, fromDate, toDate] as const,
  },
  completions: {
    list: () => ['completions', 'list'] as const,
    byChild: (childId: string) => ['completions', 'child', childId] as const,
  },
};
