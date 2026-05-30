# KidsProgress Project Configuration (v2)

## Project Overview

Full-stack web app for tracking children's daily progress on parent-assigned tasks (school work, chores, practice exercises). Parent portal for setup, child portal for execution.

This is **v2** — a clean-room rebuild documented in [docs/refactoring/2026-rebuild-plan.md](docs/refactoring/2026-rebuild-plan.md). v1 code lives under [legacy/](legacy/) for reference until cutover and is **read-only**: do not modify files under `legacy/`.

## Tech Stack

- **Frontend**: React 19 · Vite 6 · TypeScript · TanStack Query · Zustand · Tailwind 4 · @tabler/icons-react · react-i18next
- **Backend**: Node 22 · Fastify 5 · Zod · `fastify-type-provider-zod` · pino · argon2 · `@fastify/jwt`
- **DB**: Drizzle ORM + SQLite (`better-sqlite3`); Postgres / Turso supported via env-driven driver selection
- **LLM**: Gemini (`@google/generative-ai`) — gated by per-child daily token cap + PII redaction
- **Testing**: Vitest (unit, frontend + backend) · Playwright (e2e, frontend)
- **Deploy**: Single multi-stage Docker image on Synology DS216+II via Container Manager

## Project Structure

```
kidsprogress/
├── apps/
│   ├── web/                    # React SPA — feature-sliced under src/features/<x>/
│   └── api/                    # Fastify API — feature-sliced under src/modules/<x>/
├── packages/
│   ├── shared/                 # Zod schemas, enums, domain types — used by BOTH web & api
│   └── db/                     # Drizzle schema + migrations + seed
├── docker/                     # Dockerfile, dev & Synology compose files
├── scripts/                    # migrate-from-v1.ts, backup, rotate-secrets
├── docs/                       # audit, rebuild plan, architecture, runbook
└── legacy/                     # v1 (Python/FastAPI/MongoDB) — read-only reference
```

Pair invariant: every feature has matching folders on both sides — `apps/web/src/features/<x>/` and `apps/api/src/modules/<x>/`.

## State Management Rules

- **Zustand**: client state only (UI toggles, auth token, user preferences). Never store fetched server data here.
- **TanStack Query**: all server data (fetching, caching, mutations, invalidation). Use a centralized query-key factory under `apps/web/src/lib/queryKeys.ts` (TODO: add when features land).
- **`packages/shared` Zod schemas**: validation rules. Frontend forms (via `@hookform/resolvers/zod`) and backend routes (via `fastify-type-provider-zod`) consume the *same* schema. Never duplicate validation.

## Development Rules

1. **SOLID + small functions**. Skills under `.claude/skills/` describe the standards in detail.
2. **Default-deny auth on every API route**. New routes inherit the `preHandler` auth check; public routes must explicitly set `config: { public: true }`. Never write an authless protected route. (See audit finding #1.)
3. **Every user-facing string via `t('namespace:key')`**. Translations live in `apps/web/locales/{en,zh}/<namespace>.json`. No hardcoded English in JSX, alerts, aria-labels, placeholders, or error toasts.
4. **Mobile-first responsive**. Tailwind breakpoints `sm:` / `md:` / `lg:` / `xl:`. Touch targets ≥ 44 px.
5. **Icons via @tabler/icons-react**. No emoji or raw inline SVG in production code.
6. **Never log request bodies or secrets**. Logger has redaction paths configured; if you log new structures, audit for sensitive fields.
7. **Server secrets only via env**. No fallback defaults for `JWT_SECRET`, API keys, DB URLs. App refuses to start on missing.
8. **No files under `legacy/` get edited**. Reference only. If you need information, read; never modify.
9. **Never add `Co-Authored-By` (or any author trailer) to commit messages.** Commit messages end with the subject + body — no `Co-Authored-By:`, no `Signed-off-by:` from the AI, no `🤖 Generated with …` footer. The user is the sole author of every commit.
10. **Keep commit messages short.** One-line subject by default. Add a body only when the *why* genuinely needs context that the diff doesn't show. Never paste exit-criteria checklists, dependency lists, or verification logs into the message — those belong in the PR description or the rebuild plan.

## Architecture Patterns

See [`.claude/skills/architecture-patterns/SKILL.md`](.claude/skills/architecture-patterns/SKILL.md):
- Value Objects for ids (`TaskId`, `ChildId`)
- State Machines for task lifecycle
- Strategy for plugin-kind behavior (`addition-subtraction`, `writing`, generic)
- Observer / Event Bus for decoupled side effects
- Repository pattern over Drizzle for query encapsulation

## Workflow

### Slash commands

- `/feature <name>` — scaffold `docs/features/<name>/{plan,context,tasks}.md`
- `/review-code [files]` — review against project skills
- `/test-gen <files>` — generate Vitest tests
- `/check-apis` — refresh `docs/api-registry.md` from the actual routes

### Before starting work

1. Read [`docs/refactoring/2026-rebuild-plan.md`](docs/refactoring/2026-rebuild-plan.md) — current phase, exit criteria
2. Check the audit ([`docs/findings/2026-05-22-full-audit.md`](docs/findings/2026-05-22-full-audit.md)) for any v1 lesson relevant to the feature
3. If the feature exists in `legacy/`, read it for behavior — don't copy code, port it

### When adding a feature

1. Define DTOs and domain types in `packages/shared`
2. Add DB schema in `packages/db/src/schema/<x>.ts`, generate migration with `pnpm db:generate`
3. Add API module in `apps/api/src/modules/<x>/` with routes + service + repo
4. Add web feature in `apps/web/src/features/<x>/` with api hooks + components + pages
5. Wire translations in both `en/<x>.json` and `zh/<x>.json`
6. Tests for: service logic, route auth+authz, key component behavior

## Environment

- Local dev: SQLite at `./data/kidsprogress.sqlite`; API on `:8000`, web on `:5173`
- Production: DS216+II via Container Manager; data on `/volume1/docker/kidsprogress/data`
- See `.env.example` for the complete env contract
