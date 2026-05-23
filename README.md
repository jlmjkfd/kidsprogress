# KidsProgress

Children's progress tracker — parents schedule tasks, kids complete them on a tablet, AI helps with recommendations and writing feedback.

This is **v2**, a clean-room rebuild on Node + TypeScript end-to-end. v1 (Python + FastAPI + MongoDB) lives under [`legacy/`](legacy/) until cutover.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 · Vite 6 · TanStack Query · Zustand · Tailwind 4 · @tabler/icons-react · react-i18next |
| Backend | Node 22 · Fastify 5 · Zod · `fastify-type-provider-zod` · pino · argon2 · `@fastify/jwt` |
| ORM / DB | Drizzle ORM · SQLite (`better-sqlite3`) — Postgres / Turso driver also wired by env |
| LLM | Gemini (`@google/generative-ai`) — daily token cap + PII redaction |
| Deploy | Single Docker image on Synology Container Manager — see `docker/` |

Repo layout follows a pnpm-workspace monorepo. Each feature has paired folders under `apps/web/src/features/<x>/` and `apps/api/src/modules/<x>/`. All DTOs and validation schemas live in `packages/shared` and are imported by both sides — one Zod schema = one source of truth.

```
apps/
  web/   — React SPA
  api/   — Fastify API
packages/
  shared/ — Zod schemas, enums, domain types (used by web AND api)
  db/     — Drizzle schema + migrations
docker/   — Dockerfile + compose for local dev and Synology
scripts/  — migration, backup, secret-rotation tools
docs/     — architecture, audit, rebuild plan, runbook
legacy/   — v1 code, deleted at cutover
```

## Quick start

Requires Node 22 and pnpm 9. (`corepack enable && corepack prepare pnpm@9.1.2 --activate` if you don't have pnpm yet.)

```bash
# 1. Install
pnpm install

# 2. Copy env template and fill in JWT_SECRET at minimum
cp .env.example .env
# Edit .env — JWT_SECRET must be ≥16 chars or the API refuses to start.

# 3. Run migrations against a local SQLite DB
pnpm db:generate     # generates SQL from the Drizzle schema if needed
pnpm db:migrate      # applies them

# 4. Run dev (api on :8000, web on :5173)
pnpm dev
```

Open <http://localhost:5173>. The placeholder page polls `/health` to confirm the API + DB are alive.

## Common scripts

| Command | What |
|---|---|
| `pnpm dev` | Run api + web in parallel |
| `pnpm typecheck` | All workspaces |
| `pnpm test` | All workspaces |
| `pnpm build` | Build all workspaces |
| `pnpm format` | Prettier across the repo |
| `pnpm api:dev` / `pnpm web:dev` | Run a single app |
| `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:seed` | DB ops |

## Deploy to Synology DS216+II

See [`docs/deployment-synology.md`](docs/deployment-synology.md) (to be written in Phase 6). Outline:

1. Build the image in CI (`.github/workflows/image.yml`, added in Phase 6).
2. `docker pull` on the NAS.
3. `docker compose -f docker/docker-compose.yml -f docker/docker-compose.synology.yml up -d`.
4. Synology reverse proxy + Let's Encrypt fronts port 8000 with TLS.
5. Hyper Backup snapshots `/volume1/docker/kidsprogress/data` nightly.

## Docs

- [`docs/findings/2026-05-22-full-audit.md`](docs/findings/2026-05-22-full-audit.md) — v1 audit (~100 findings)
- [`docs/refactoring/2026-rebuild-plan.md`](docs/refactoring/2026-rebuild-plan.md) — v2 plan (this rebuild's source of truth)
- [`CLAUDE.md`](CLAUDE.md) — project rules for AI-assisted development

## v1 → v2 status

| Phase | Status |
|---|---|
| 0 — Foundations | in progress |
| 1 — Auth + Children | pending |
| 2 — Tasks | pending |
| 3 — Attachments / Sessions / Subtasks | pending |
| 4 — AI features | pending |
| 5 — Data migration + cutover | pending |
| 6 — Deploy + harden | pending |
