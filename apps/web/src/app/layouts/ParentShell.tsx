import { type ReactNode } from 'react';
import { ThemeBoundary } from './ThemeBoundary';

/**
 * Outer chrome for the parent portal. Phase 0 ships an empty shell —
 * Phase 3 fills in the left rail + topbar + child selector once auth
 * (Phase 1) and templates (Phase 6) exist.
 */
export function ParentShell({ children }: { children: ReactNode }) {
  return (
    <ThemeBoundary theme="parent">
      <div className="min-h-screen bg-bg text-text">
        <main>{children}</main>
      </div>
    </ThemeBoundary>
  );
}
