import { useEffect, type ReactNode } from 'react';
import type { AgeBand, ThemeName } from '@kidsprogress/shared';

/**
 * Sets `data-theme` (and optional `data-age` on child) on a wrapping div AND
 * mirrors them onto <html> so the theme reaches global selectors (focus
 * rings, body bg) without prop-drilling.
 *
 * This is the ONLY component allowed to set those attributes. Hard rule.
 */
interface Props {
  theme: ThemeName;
  age?: AgeBand;
  children: ReactNode;
}

export function ThemeBoundary({ theme, age, children }: Props) {
  useEffect(() => {
    const root = document.documentElement;
    const prevTheme = root.dataset['theme'];
    const prevAge = root.dataset['age'];
    root.dataset['theme'] = theme;
    if (age) root.dataset['age'] = age;
    else delete root.dataset['age'];
    return () => {
      if (prevTheme) root.dataset['theme'] = prevTheme;
      else delete root.dataset['theme'];
      if (prevAge) root.dataset['age'] = prevAge;
      else delete root.dataset['age'];
    };
  }, [theme, age]);

  return (
    <div data-theme={theme} {...(age ? { 'data-age': age } : {})} className="min-h-full">
      {children}
    </div>
  );
}
