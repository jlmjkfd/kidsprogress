/**
 * KidsProgress Design System (KPDS) — single source of truth for design tokens.
 *
 * Two themes, one spine:
 *   - `parent` — stone-warm neutral + indigo accent. Professional, calm.
 *     No gradients. Two motion durations (fast, base). Density tuned for tables.
 *   - `child`  — amber + violet. Friendly, focused. Gradients allowed ONLY on
 *     TaskTile background + TodayHero ring. Three motion durations + spring.
 *
 * The token shape is mirror-equal across themes — every key must exist in both
 * so a shared component reads one CSS variable and gets the right value via
 * the `[data-theme]` selector. That contract is checked in
 * `tokens.test.ts` (Phase 0a) and enforced by `build-tokens.ts` (Phase 0b).
 *
 * `data-age="younger|older"` is a sub-theme on the child portal that bumps
 * type scale + touch targets. Only used inside `[data-theme="child"]`.
 *
 * NEVER:
 *   - Use raw hex / px in components — always `var(--kp-…)` or Tailwind class.
 *   - Add red / animation / sound to a failed kid action.
 *   - Use mascot / gradient / celebration in parent portal.
 *   - Use numeric streak counter; only the opt-in growing-plant glyph.
 */

export type ThemeName = 'parent' | 'child';
export type AgeBand = 'younger' | 'older';

export interface PaletteSwatches {
  bg: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentFg: string;
  accentSoft: string;
  accentBorder: string;
  success: string;
  warning: string;
  danger: string;
  focusRing: string;
}

export interface TypeScale {
  fontFamilySans: string;
  fontFamilyDisplay: string;
  fontFamilyMono: string;
  size2xs: string;
  sizeXs: string;
  sizeSm: string;
  sizeBase: string;
  sizeLg: string;
  sizeXl: string;
  size2xl: string;
  size3xl: string;
  lineSnug: string;
  lineNormal: string;
  lineRelaxed: string;
  weightRegular: string;
  weightMedium: string;
  weightSemibold: string;
}

export interface MotionTokens {
  durationFast: string;
  durationBase: string;
  durationSlow: string;
  easingStandard: string;
  easingEnter: string;
  easingExit: string;
  easingSpring: string;
}

export interface RadiusTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  full: string;
}

export interface SpacingTokens {
  /** Minimum touch target (≥44 px on parent, ≥48 px on child). */
  touch: string;
  gutterSm: string;
  gutterMd: string;
  gutterLg: string;
}

export interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
  soft: string;
}

export interface ThemeTokens {
  palette: PaletteSwatches;
  type: TypeScale;
  motion: MotionTokens;
  radius: RadiusTokens;
  spacing: SpacingTokens;
  shadow: ShadowTokens;
  /** Optional gradients. Empty object on parent (no gradients allowed). */
  gradients: Record<string, string>;
}

// ── Shared base values used by both themes ───────────────────────────────
const FONT_SANS = '"Inter", "Noto Sans SC", system-ui, sans-serif';
const FONT_DISPLAY_PARENT = '"Sora", "Inter", system-ui, sans-serif';
const FONT_DISPLAY_CHILD = '"Nunito", "Noto Sans SC", system-ui, sans-serif';
const FONT_MONO = '"JetBrains Mono", ui-monospace, "Cascadia Code", monospace';

const RADIUS_PARENT: RadiusTokens = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.25rem',
  '3xl': '1.5rem',
  full: '9999px',
};

const RADIUS_CHILD: RadiusTokens = {
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '2rem',
  full: '9999px',
};

// ── Parent theme — stone neutral + indigo accent ─────────────────────────
export const parentTokens: ThemeTokens = {
  palette: {
    bg: '#FAF7F2', // warm stone-50
    surface: '#FFFFFF',
    surfaceMuted: '#F4F0E9', // stone-100
    border: '#E5DFD3', // stone-200
    text: '#1C1917', // stone-900
    textMuted: '#57534E', // stone-600
    textSubtle: '#A8A29E', // stone-400
    accent: '#4F46E5', // indigo-600
    accentFg: '#FFFFFF',
    accentSoft: '#EEF2FF', // indigo-50
    accentBorder: '#C7D2FE', // indigo-200
    success: '#15803D', // green-700
    warning: '#B45309', // amber-700
    danger: '#B91C1C', // red-700
    focusRing: '#818CF8', // indigo-400
  },
  type: {
    fontFamilySans: FONT_SANS,
    fontFamilyDisplay: FONT_DISPLAY_PARENT,
    fontFamilyMono: FONT_MONO,
    size2xs: '0.6875rem',
    sizeXs: '0.75rem',
    sizeSm: '0.875rem',
    sizeBase: '1rem',
    sizeLg: '1.125rem',
    sizeXl: '1.25rem',
    size2xl: '1.5rem',
    size3xl: '1.875rem',
    lineSnug: '1.35',
    lineNormal: '1.5',
    lineRelaxed: '1.65',
    weightRegular: '400',
    weightMedium: '500',
    weightSemibold: '600',
  },
  motion: {
    durationFast: '120ms',
    durationBase: '200ms',
    // Parent uses fast + base only. `slow` deliberately matches base so a
    // misuse in shared code is harmless on parent.
    durationSlow: '200ms',
    easingStandard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easingEnter: 'cubic-bezier(0, 0, 0.2, 1)',
    easingExit: 'cubic-bezier(0.4, 0, 1, 1)',
    easingSpring: 'cubic-bezier(0.4, 0, 0.2, 1)', // no spring in parent
  },
  radius: RADIUS_PARENT,
  spacing: {
    touch: '2.75rem', // 44 px
    gutterSm: '0.75rem',
    gutterMd: '1rem',
    gutterLg: '1.5rem',
  },
  shadow: {
    sm: '0 1px 2px 0 rgb(28 25 23 / 0.05)',
    md: '0 4px 6px -1px rgb(28 25 23 / 0.08), 0 2px 4px -2px rgb(28 25 23 / 0.05)',
    lg: '0 10px 15px -3px rgb(28 25 23 / 0.08), 0 4px 6px -4px rgb(28 25 23 / 0.04)',
    soft: '0 2px 8px -2px rgb(28 25 23 / 0.04)',
  },
  gradients: {},
};

// ── Child theme — amber + violet, gradient chips on Tile + Hero only ─────
export const childTokens: ThemeTokens = {
  palette: {
    bg: '#FFF9EE', // amber-50ish
    surface: '#FFFFFF',
    surfaceMuted: '#FEF3C7', // amber-100
    border: '#FDE68A', // amber-200
    text: '#1F2937', // slate-800 for legibility
    textMuted: '#4B5563', // slate-600
    textSubtle: '#9CA3AF', // slate-400
    accent: '#7C3AED', // violet-600
    accentFg: '#FFFFFF',
    accentSoft: '#F5F3FF', // violet-50
    accentBorder: '#DDD6FE', // violet-200
    success: '#059669', // emerald-600 — used for "well done" feedback
    warning: '#D97706', // amber-600
    // Danger is deliberately muted on child portal. NEVER use for kid failures
    // — reserve for parent-side critical action confirmations.
    danger: '#9A3412', // orange-800
    focusRing: '#C4B5FD', // violet-300
  },
  type: {
    fontFamilySans: FONT_SANS,
    fontFamilyDisplay: FONT_DISPLAY_CHILD,
    fontFamilyMono: FONT_MONO,
    size2xs: '0.75rem',
    sizeXs: '0.875rem',
    sizeSm: '1rem',
    sizeBase: '1.125rem', // 18px base
    sizeLg: '1.25rem',
    sizeXl: '1.5rem',
    size2xl: '1.875rem',
    size3xl: '2.25rem',
    lineSnug: '1.4',
    lineNormal: '1.55',
    lineRelaxed: '1.7',
    weightRegular: '400',
    weightMedium: '600', // bolder for friendliness
    weightSemibold: '700',
  },
  motion: {
    durationFast: '140ms',
    durationBase: '220ms',
    durationSlow: '360ms',
    easingStandard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easingEnter: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)', // gentle overshoot
    easingExit: 'cubic-bezier(0.4, 0, 1, 1)',
    easingSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // press-and-pop spring
  },
  radius: RADIUS_CHILD,
  spacing: {
    touch: '3rem', // 48 px — bigger for small fingers
    gutterSm: '1rem',
    gutterMd: '1.25rem',
    gutterLg: '1.75rem',
  },
  shadow: {
    sm: '0 1px 3px 0 rgb(124 58 237 / 0.08)',
    md: '0 4px 8px -2px rgb(124 58 237 / 0.10), 0 2px 4px -2px rgb(217 119 6 / 0.06)',
    lg: '0 12px 18px -4px rgb(124 58 237 / 0.12), 0 6px 8px -4px rgb(217 119 6 / 0.06)',
    soft: '0 2px 12px -2px rgb(217 119 6 / 0.10)',
  },
  /**
   * Five gradients. Used ONLY on TaskTile bg + TodayHero ring. Variety lets
   * the calendar feel lively without rotating colors per task.
   */
  gradients: {
    sunrise: 'linear-gradient(135deg, #FBBF24 0%, #F472B6 100%)',
    forest: 'linear-gradient(135deg, #34D399 0%, #60A5FA 100%)',
    berry: 'linear-gradient(135deg, #A78BFA 0%, #F472B6 100%)',
    ocean: 'linear-gradient(135deg, #38BDF8 0%, #818CF8 100%)',
    citrus: 'linear-gradient(135deg, #FBBF24 0%, #FB7185 100%)',
  },
};

// ── Age sub-theme deltas (child only) ────────────────────────────────────
// These are applied via additional CSS variables under
// `[data-theme="child"][data-age="younger|older"]`. They DO NOT replace base
// child tokens — they layer on top.
export interface AgeDelta {
  spacingTouch: string;
  fontSizeBase: string;
  fontSizeXl: string;
  fontSize2xl: string;
  radiusTileMin: string;
}

export const childYoungerDelta: AgeDelta = {
  spacingTouch: '3.5rem', // 56 px — very big for ages 5–8
  fontSizeBase: '1.25rem',
  fontSizeXl: '1.75rem',
  fontSize2xl: '2.125rem',
  radiusTileMin: '1.5rem',
};

export const childOlderDelta: AgeDelta = {
  spacingTouch: '3rem', // 48 px — matches base
  fontSizeBase: '1.125rem',
  fontSizeXl: '1.5rem',
  fontSize2xl: '1.875rem',
  radiusTileMin: '1rem',
};

// ── Indexed access for the generator + tests ─────────────────────────────
export const themes: Record<ThemeName, ThemeTokens> = {
  parent: parentTokens,
  child: childTokens,
};

export const ageDeltas: Record<AgeBand, AgeDelta> = {
  younger: childYoungerDelta,
  older: childOlderDelta,
};

/**
 * Flatten a ThemeTokens object into a list of `--kp-<group>-<key>` CSS
 * custom properties. Used by `scripts/build-tokens.ts` to emit `tokens.css`
 * and by the runtime to verify both themes expose the same keys.
 */
export function flattenTokens(theme: ThemeTokens): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [group, values] of Object.entries(theme) as Array<[
    keyof ThemeTokens,
    Record<string, string>,
  ]>) {
    for (const [k, v] of Object.entries(values)) {
      const safe = k.replace(/_/g, '-');
      out[`--kp-${groupAlias(group)}-${safe}`] = String(v);
    }
  }
  return out;
}

function groupAlias(g: keyof ThemeTokens): string {
  // Compact, predictable prefixes — keep CSS readable.
  switch (g) {
    case 'palette': return 'color';
    case 'type': return 'type';
    case 'motion': return 'motion';
    case 'radius': return 'radius';
    case 'spacing': return 'spacing';
    case 'shadow': return 'shadow';
    case 'gradients': return 'gradient';
  }
}

export function flattenAgeDelta(delta: AgeDelta): Record<string, string> {
  return {
    '--kp-spacing-touch': delta.spacingTouch,
    '--kp-type-size-base': delta.fontSizeBase,
    '--kp-type-size-xl': delta.fontSizeXl,
    '--kp-type-size-2xl': delta.fontSize2xl,
    '--kp-radius-tile-min': delta.radiusTileMin,
  };
}
