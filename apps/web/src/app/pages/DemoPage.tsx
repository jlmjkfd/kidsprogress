import { useState } from 'react';
import { ParentShell } from '../layouts/ParentShell';
import { ChildShell } from '../layouts/ChildShell';

type Mode = 'parent' | 'child-younger' | 'child-older';

/**
 * Visual smoke test for the KPDS token plumbing. Lets a developer toggle
 * theme + age and confirm `[data-theme]` selectors flow through Tailwind
 * utility classes. This page is dev-only and will be removed when real
 * pages land in Phase 2+.
 */
export function DemoPage() {
  const [mode, setMode] = useState<Mode>('parent');

  const Shell =
    mode === 'parent'
      ? ParentShell
      : ({ children }: { children: React.ReactNode }) => (
          <ChildShell age={mode === 'child-younger' ? 'younger' : 'older'}>{children}</ChildShell>
        );

  return (
    <div className="min-h-screen">
      <div className="border-b border-stone-200 bg-white p-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="text-sm font-medium">KPDS demo · theme:</span>
          {(['parent', 'child-younger', 'child-older'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md border px-3 py-1 text-sm ${
                m === mode
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-300 hover:bg-slate-50'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <Shell>
        <Showcase />
      </Shell>
    </div>
  );
}

function Showcase() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-md">
        <h1 className="font-display text-2xl">Typography</h1>
        <p className="mt-1 text-text-muted">
          Body text reads from <code>--kp-color-text</code> + <code>--kp-type-fontFamilySans</code>.
          Headings flip to display family.
        </p>
        <p className="mt-2 text-sm text-text-subtle">Subtle caption.</p>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-display text-xl">Buttons</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex min-h-touch items-center rounded-md bg-accent px-4 text-accent-fg shadow-sm transition-base ease-standard hover:opacity-90"
          >
            Primary
          </button>
          <button
            type="button"
            className="inline-flex min-h-touch items-center rounded-md border border-accent-border bg-accent-soft px-4 text-accent transition-base ease-standard hover:bg-white"
          >
            Soft
          </button>
          <button
            type="button"
            className="inline-flex min-h-touch items-center rounded-md border border-border bg-surface px-4 text-text transition-base ease-standard hover:bg-surface-muted"
          >
            Ghost
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-display text-xl">Status colors</h2>
        <ul className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <li className="rounded-lg border border-success/30 bg-success/10 p-3 text-success">
            Success — well done
          </li>
          <li className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-warning">
            Warning — needs attention
          </li>
          <li className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-danger">
            Danger — parent only
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-display text-xl">Gradient chips (child only)</h2>
        <p className="mt-1 text-sm text-text-muted">
          Five-gradient palette used on TaskTile + TodayHero. On parent, these classes still
          exist but design rule forbids their use anywhere outside those two surfaces.
        </p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {(['sunrise', 'forest', 'berry', 'ocean', 'citrus'] as const).map((g) => (
            <div
              key={g}
              className={`h-16 rounded-2xl bg-kp-${g} shadow-soft`}
              aria-label={g}
              title={g}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
