import { type ReactNode } from 'react';
import type { AgeBand } from '@kidsprogress/shared';
import { ThemeBoundary } from './ThemeBoundary';

/**
 * Child portal chrome. Age sub-theme bumps type scale + touch targets.
 * Younger (default at age ≤ 8) is gentler; older (≥ 9) is denser.
 *
 * Phase 0 ships an empty shell. Phase 3 fills in TodayHero + bottom sheet.
 */
interface Props {
  age?: AgeBand;
  children: ReactNode;
}

export function ChildShell({ age = 'younger', children }: Props) {
  return (
    <ThemeBoundary theme="child" age={age}>
      <div className="min-h-screen bg-bg text-text">
        <main>{children}</main>
      </div>
    </ThemeBoundary>
  );
}
