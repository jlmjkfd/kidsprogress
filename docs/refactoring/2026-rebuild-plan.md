# KidsProgress v2 — Industry-Standard Rebuild Plan

Status: draft for discussion · Author: audit follow-up · Date: 2026-05-23

> Companion to [docs/findings/2026-05-22-full-audit.md](../findings/2026-05-22-full-audit.md).
> Treat that audit as the source of truth for "what's wrong with v1".
> This plan is the proposed answer to "what does v2 look like and how do we get there".

---

## 0. TL;DR

| Decision | Recommendation | Why |
|---|---|---|
| **Build approach** | Clean-room rebuild in a new monorepo with feature parity, then cut over | v1 has ~100 audit findings including 5 fully-unauthenticated route modules. Patching is more work than rebuilding for a single-developer project this size (~12.6k LOC backend). |
| **Backend language** | **Node.js 22 LTS + TypeScript** | Unified TS across frontend/backend → shared types, single tooling. Lower idle memory (~50 MB vs 150 MB) is critical for the 1 GB RAM NAS target. |
| **Backend framework** | **Fastify 5** + **Zod** for validation | Lean, fast, mature plugin ecosystem; lower overhead than NestJS. |
| **Database** | **SQLite** (via Drizzle ORM) for production on the NAS; **PostgreSQL** swap-in for future cloud deploy | Family-scale data + 1 GB RAM = SQLite is the right answer. Drizzle's multi-driver design means swapping engines later is a config change. |
| **Frontend** | Keep React 19 + Vite + TypeScript + TanStack Query + Tailwind; **replace Redux with Zustand** | Frontend is already modern; only the state layer needs simplification. Zustand removes ~70 lines of boilerplate per slice and fits "client state only" naturally. |
| **LLM** | Keep Gemini via REST; **add per-user/day token cap and PII scrubbing** | Audit finding #23/24 — child PII shipped to Google and no cost cap. Fixed at v2 design time. |
| **Repo layout** | **pnpm workspace monorepo**: `apps/web`, `apps/api`, `packages/shared`, `packages/db` | Shared types are the single biggest DX win of unifying languages. |
| **Deploy target** | **Single Docker image** (multi-stage build, ≤120 MB) on Synology Container Manager + persistent volume for SQLite + uploads | One container = one thing to monitor. NAS reverse proxy + DSM Let's Encrypt handles TLS. |
| **Auth** | argon2id + JWT access (15 min) + rotating refresh tokens stored as SHA-256 hashes + per-IP rate limit | Fixes every audit finding in the auth area at once. |
| **Total effort estimate** | 8 weeks part-time (or 4 weeks full-time) for v2 feature-parity + cutover | Schema and behaviour are well-known; UI components mostly portable verbatim. |

---

## 1. Why rebuild instead of refactor

The audit produced ~100 findings. The most serious aren't bugs — they're structural:

1. **Five route modules have zero authentication.** Adding `Depends(get_current_user)` everywhere is mechanical but ~50 endpoints need ownership checks layered on top, which would touch most of the service layer.
2. **ObjectId stored as both string and ObjectId** drives defensive `$or` queries in 20+ places. The right fix is a one-shot migration + type discipline — easier in a fresh schema.
3. **`python-jose` is unmaintained with active CVEs**; `passlib` is unmaintained; `bcrypt` pinning is fragile. The whole auth dep chain needs replacement.
4. **Redux holds server data, components fetch via raw axios, alert() validators** — the frontend's state-boundary story is broken in patches across pages.
5. **Two parallel service implementations** (`task_service.py.backup` vs `task_service/` package) and three orphan route files indicate the project lost its shape during organic growth.
6. **TS excludes are masking real type errors** (`tsconfig.app.json:41-45` excludes paths that don't exist).

The features themselves are fine — they're working in production. The implementation has accumulated more entropy than is worth disentangling. A clean-room rebuild with the **same features, same UX, same data** but on a tighter foundation is a smaller project than fixing v1 in place.

---

## 2. Target deployment: Synology DS216+II

### Hardware envelope
- **CPU**: Intel Atom CE5335, 1.6 GHz dual-core, x86_64
- **RAM**: 1 GB DDR3 (effectively non-upgradeable; assume ~500 MB available after DSM)
- **Storage**: 2-bay HDD (slow random I/O — favours SQLite over a separate DB server)
- **OS**: DSM 7.2+, Docker via Container Manager *(verify this is enabled on your unit — DS216+II is borderline-supported)*

### Design implications
- **Memory budget**: Node API ≤120 MB resident, SQLite in-process, Nginx-or-Fastify serves the SPA static files. Total app footprint ≤180 MB.
- **CPU budget**: Avoid bcrypt (~100 ms × cores limited); argon2 with conservative parameters (`m=19456, t=2, p=1` ≈ 50 ms on this CPU). LLM calls are cloud-side so CPU isn't bottlenecked there.
- **I/O budget**: HDDs are slow at random writes — SQLite WAL mode + batch writes for completion records (not 1 fsync per task tick).
- **Process model**: One container with one Node process. No worker pools. PM2-style supervision is unnecessary at this scale; Docker `restart: unless-stopped` is enough.
- **No Docker fallback path**: Provide a `node dist/main.js` entrypoint that works directly under Synology's "Task Scheduler" if Container Manager isn't available on your DS216+II.

---

## 3. Recommended stack

### Backend
| Layer | Choice | Rejected alternatives |
|---|---|---|
| Runtime | **Node.js 22 LTS** | Bun (immature on Alpine ARM/x86), Deno (smaller ecosystem) |
| Framework | **Fastify 5** | Express (slower, more memory), NestJS (heavier), Hono (less mature plugins) |
| Validation | **Zod** | Yup (slower), io-ts (verbose) |
| ORM | **Drizzle ORM** | Prisma (heavier, separate engine binary), TypeORM (legacy patterns), Kysely (less ergonomic) |
| DB | **SQLite** via `better-sqlite3` (sync, fastest), with **PostgreSQL** as alternative driver | MongoDB (RAM-heavy, audit pain), MariaDB (no clear win over Postgres) |
| Auth | `@fastify/jwt`, `argon2`, rotating refresh tokens | `jsonwebtoken` (fine, but jwt plugin is integrated) |
| Rate limit | `@fastify/rate-limit` | `slowapi`-equivalents in Express world |
| File upload | `@fastify/multipart` to local volume | S3 (overkill for NAS — local FS is the whole point) |
| LLM | `@google/generative-ai` (Gemini SDK) | OpenAI (no — already on Gemini), local LLM (Atom CPU can't) |
| Background jobs | Plain `setInterval` + Postgres advisory lock (or SQLite + `node-cron`) | BullMQ (needs Redis — 100 MB RAM is too much for this target) |
| Logging | `pino` (Fastify's default) | Winston (heavier) |
| Testing | **Vitest** (matches frontend) + supertest for HTTP | Jest (slower), Mocha (legacy) |

### Frontend (mostly unchanged — already modern)
| Layer | Keep / Change |
|---|---|
| React 19 + Vite 7 + TS | **Keep** |
| TanStack Query v5 | **Keep** |
| Tailwind 4 | **Keep** |
| @tabler/icons-react | **Keep** |
| react-i18next | **Keep** |
| Redux Toolkit | **Replace with Zustand** — fits "client state only" rule; ~70 lines/slice → ~15 |
| axios | **Replace with native `fetch`** + tiny wrapper — one less dep, fetch is fine in 2026 |
| Playwright | **Keep** for e2e |
| Vitest | **Keep** |

### Infra
- **Monorepo**: pnpm workspaces (lighter than Turborepo; no caching daemon)
- **Build**: `tsc` for libraries, `vite build` for web, `esbuild` (via tsup) for API → single `dist/`
- **Container**: multi-stage Dockerfile, `node:22-alpine` runtime, ~80–120 MB image
- **CI**: GitHub Actions builds + pushes image to ghcr.io; you `docker pull` on the NAS (no public exposure of the NAS to CI)
- **Reverse proxy + TLS**: Synology DSM built-in reverse proxy + Let's Encrypt
- **Backups**: Synology Hyper Backup snapshots the SQLite file nightly (single file = trivial backup)

### 3.1 Cloud-portable variant (note — not the current target)

**Primary deploy target remains the Synology NAS.** This subsection exists only to record that the architecture is portable to free-tier cloud hosts with three small swaps, so the decision can be revisited later without re-architecting.

| NAS path (primary) | Cloud-free path (later option) |
|---|---|
| SQLite via `better-sqlite3` on a persistent volume | Managed DB via Drizzle's alternate driver: **Turso** (libSQL, SQLite-compatible) or **Neon** (Postgres) |
| Local-FS file uploads under a Docker volume | Object storage: **Cloudflare R2** (S3-compatible API, zero egress fees) |
| Single Docker container on Synology Container Manager | Container host: **Fly.io** (recommended — same Docker image, scales-to-zero) or **Render** (free web service has cold-start sleep, worse UX for a kids' app) |

Why this stays cheap to swap to later:
- `packages/db/src/client.ts` is designed to pick a driver by env var — Drizzle supports SQLite and Postgres from the same schema definitions.
- `apps/api/src/lib/upload.ts` will be written against an `UploadStore` interface with a local-FS implementation; an S3/R2 implementation is ~50 lines.
- Everything else (Fastify, Zod, the Gemini wrapper, the React frontend, the migration script) is host-neutral.

Recommended cloud combo if/when this path is taken: **Fly.io + Turso + Cloudflare R2 + Cloudflare Pages**. Cost stays at $0 within free tiers, and the same Docker image runs on either target.

**Reasons to stay on the NAS for now**:
- No cold starts — kids tap and expect things to work; Render free tier sleeps after ~15 min and a 30–60s cold start is the wrong UX for this audience.
- Children's photos, audio, and chat content stay on hardware you own. Meaningful for a kids' product where you can't audit a free tier's privacy policy.
- Free tiers churn — Heroku, Railway, and PlanetScale all walked back free plans in the past 3 years; the NAS doesn't change its mind.
- No bandwidth caps; uploads of completed-task photos won't eat into a monthly allowance.
- The NAS is already paid for.

**Reasons to flip later**: reliable external access without exposing the NAS to the public internet (DDNS + reverse-proxy + cert management is workable but fiddly), or growth beyond the NAS's 1 GB RAM headroom. Neither is true today.

Action items required to *preserve* this option as we build v2:
1. Keep `packages/db` driver selection behind an env var (`DB_DRIVER=sqlite|postgres|turso`).
2. Write `lib/upload.ts` against an `UploadStore` interface; ship the local-FS implementation first, leave a TODO comment for the S3-compatible one.
3. Don't lean on Synology-specific paths in code — only in `docker/docker-compose.synology.yml`.

That's it. Until the day we choose to flip, nothing else changes.

---

## 4. New repository layout

**Same repo, fresh subtree.** We do *not* create a new GitHub repository. v1 is moved (not copied) into `legacy/` in a single rename commit so `git log --follow` still resolves history; v2 lives at the root as a pnpm workspace monorepo. At cutover, `legacy/` is deleted in one commit. See §4.3 below for rationale.

### 4.1 Layout

```
kidsprogress/                          # existing repo, stays
├── README.md                          # rewritten for v2 (old README → legacy/)
├── CLAUDE.md                          # updated to point at v2 paths
├── .gitignore                         # cleaned up (see audit §4)
├── .env.example                       # root-level template for v2
├── package.json                       # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.js
├── .prettierrc
├── .nvmrc                             # node 22
│
├── .claude/                           # already migrated to current format
│   ├── skills/<14 skills>/SKILL.md
│   └── commands/<4 commands>.md
│
├── apps/
│   ├── web/                           # React 19 + Vite + TanStack Query + Zustand
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── vitest.config.ts
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   ├── index.html
│   │   ├── public/
│   │   ├── locales/
│   │   │   ├── en/{common,auth,tasks,errors,...}.json
│   │   │   └── zh/{common,auth,tasks,errors,...}.json
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── app/                   # router, providers, layout shells
│   │   │   │   ├── router.tsx
│   │   │   │   ├── providers.tsx      # QueryClient, i18n, error boundary
│   │   │   │   └── layouts/{ParentLayout,ChildLayout}.tsx
│   │   │   ├── features/              # feature-sliced
│   │   │   │   ├── auth/
│   │   │   │   │   ├── api/           # TanStack Query hooks
│   │   │   │   │   ├── components/    # LoginForm, ParentPinModal, ...
│   │   │   │   │   ├── pages/         # LoginPage, RegisterPage
│   │   │   │   │   ├── store.ts       # Zustand: token + isAuthenticated only
│   │   │   │   │   └── types.ts
│   │   │   │   ├── children/
│   │   │   │   ├── tasks/             # the heaviest feature
│   │   │   │   │   ├── api/           # useTask, useTaskMutations
│   │   │   │   │   ├── components/    # TaskList, TaskCard, UnifiedTaskModal
│   │   │   │   │   ├── pages/         # parent + child portals
│   │   │   │   │   ├── plugins/       # addition-subtraction, writing, ...
│   │   │   │   │   ├── recurrence/    # RRule parsing + UI
│   │   │   │   │   └── types.ts
│   │   │   │   ├── completions/
│   │   │   │   ├── sessions/
│   │   │   │   ├── subtasks/
│   │   │   │   ├── attachments/
│   │   │   │   ├── chat/
│   │   │   │   ├── ai/                # recommendations, scheduling
│   │   │   │   ├── calendar/          # school calendar, day types
│   │   │   │   └── devices/
│   │   │   ├── shared/                # cross-feature UI primitives
│   │   │   │   ├── ui/                # Button, Input, Modal, Toast
│   │   │   │   ├── icons/             # Tabler wrappers if needed
│   │   │   │   └── hooks/             # useDebounce, useMediaQuery
│   │   │   ├── lib/
│   │   │   │   ├── apiClient.ts       # fetch wrapper (auth, retries, errors)
│   │   │   │   ├── queryClient.ts
│   │   │   │   ├── i18n.ts
│   │   │   │   └── env.ts
│   │   │   └── styles/
│   │   └── tests/                     # Playwright e2e
│   │
│   └── api/                           # Fastify 5 + Drizzle ORM
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       ├── src/
│       │   ├── main.ts                # entrypoint
│       │   ├── app.ts                 # Fastify factory
│       │   ├── config.ts              # env parsing via Zod; throws on missing
│       │   ├── plugins/               # Fastify plugins
│       │   │   ├── auth.ts            # @fastify/jwt + currentUser preHandler
│       │   │   ├── cors.ts
│       │   │   ├── helmet.ts
│       │   │   ├── rate-limit.ts
│       │   │   ├── multipart.ts
│       │   │   └── error-handler.ts   # never logs request bodies
│       │   ├── modules/               # feature-sliced, mirrors web/
│       │   │   ├── auth/
│       │   │   │   ├── auth.routes.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── auth.repo.ts   # uses packages/db
│       │   │   │   └── auth.schema.ts # Zod request/response (re-exports from packages/shared)
│       │   │   ├── children/
│       │   │   ├── tasks/
│       │   │   ├── completions/
│       │   │   ├── sessions/
│       │   │   ├── subtasks/
│       │   │   ├── attachments/
│       │   │   ├── chat/
│       │   │   ├── ai/
│       │   │   ├── calendar/
│       │   │   ├── devices/
│       │   │   └── health/
│       │   ├── jobs/                  # node-cron + advisory locks
│       │   │   ├── materialize-recurring-tasks.ts
│       │   │   ├── expire-refresh-tokens.ts
│       │   │   └── prune-attachments.ts
│       │   ├── lib/
│       │   │   ├── logger.ts          # pino, redacts password/token fields
│       │   │   ├── argon2.ts
│       │   │   ├── tokens.ts          # access/refresh issuance + SHA-256 hash
│       │   │   ├── gemini.ts          # token caps, PII scrub, fenced prompts
│       │   │   ├── upload.ts          # MIME + magic-byte validation
│       │   │   └── state-machine.ts   # task lifecycle
│       │   └── types/
│       └── tests/                     # vitest + supertest
│
├── packages/
│   ├── shared/                        # ⭐ single source of truth, depended on by web AND api
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── domain/                # Task, Child, User, Completion, Session, ...
│   │   │   ├── dto/                   # Zod schemas — used by frontend forms AND backend validation
│   │   │   ├── enums/                 # TaskStatus, TaskKind, DayType, ...
│   │   │   ├── recurrence/            # rule serializer/parser shared by both sides
│   │   │   └── index.ts
│   │
│   └── db/                            # Drizzle schema + migrations
│       ├── package.json
│       ├── drizzle.config.ts
│       ├── src/
│       │   ├── client.ts              # better-sqlite3 (or pg) driver, chosen by env
│       │   ├── schema/
│       │   │   ├── users.ts
│       │   │   ├── refresh-tokens.ts
│       │   │   ├── devices.ts
│       │   │   ├── children.ts
│       │   │   ├── tasks.ts
│       │   │   ├── subtasks.ts
│       │   │   ├── completions.ts
│       │   │   ├── sessions.ts
│       │   │   ├── attachments.ts
│       │   │   ├── recurrence-exceptions.ts
│       │   │   ├── task-collections.ts
│       │   │   ├── chat-messages.ts
│       │   │   ├── school-calendar.ts
│       │   │   ├── day-types.ts
│       │   │   ├── llm-logs.ts
│       │   │   ├── legacy-id-map.ts   # bookmark fallback for first 90 days
│       │   │   └── index.ts
│       │   ├── migrations/            # generated *.sql
│       │   └── seed.ts                # dev seed
│
├── scripts/
│   ├── migrate-from-v1.ts             # Mongo → SQLite, one-shot ETL
│   ├── verify-migration.ts            # diff aggregates between v1 and v2
│   ├── rotate-secrets.ts
│   └── backup-sqlite.sh
│
├── docker/
│   ├── Dockerfile                     # multi-stage, single image, ~120 MB
│   ├── docker-compose.yml             # local dev (api + sqlite volume)
│   ├── docker-compose.synology.yml    # NAS production overrides
│   └── nginx.conf                     # only if you want a sidecar; Fastify can serve static itself
│
├── .github/
│   └── workflows/
│       ├── ci.yml                     # lint + typecheck + test + build
│       ├── image.yml                  # build + push to ghcr.io
│       └── secrets-scan.yml           # trufflehog
│
├── docs/                              # shared across v1 (legacy) and v2
│   ├── findings/                      # the 2026-05-22 audit lives here
│   ├── refactoring/                   # this plan lives here
│   ├── architecture/                  # v2 architecture, ADRs
│   ├── features/                      # carry over the useful ones
│   ├── api-registry.md                # regenerated by /check-apis against v2
│   ├── component-map.md               # regenerated
│   ├── deployment-synology.md         # NEW: step-by-step NAS deploy
│   ├── runbook.md                     # NEW: rotate secrets, restore backup, etc.
│   └── README.md
│
└── legacy/                            # ENTIRE current codebase, frozen — deleted at cutover
    ├── README.md                      # "v1, kept for reference until cutover"
    ├── backend/                       # was: kidsprogress/backend/
    ├── frontend/                      # was: kidsprogress/frontend/
    └── *.md                           # old root-level docs land here too
```

### 4.2 Why feature-sliced

v1's layout is by *kind* (`routes/`, `services/`, `models/`). When adding a new feature you touch 4–6 folders. Feature-sliced groups files by *domain* — adding "school calendar" means one new folder. The audit found three orphan route files (`time_block_routes.py`, `routine_routes.py`, `activity_routes.py`) left behind precisely because the kind-based layout makes feature deletion hard: their service files, models, and tests were never cleaned up. Feature-sliced makes deletion a `rm -rf apps/{web,api}/src/{features,modules}/<feature>`.

The pair `apps/web/src/features/<x>/` ↔ `apps/api/src/modules/<x>/` is intentional: same feature name on both sides of the wire, so the mental map stays simple.

### 4.3 Why same repo, not a new repo

- Audit, rebuild plan, feature docs, and architecture notes are already in `docs/`. Splitting repos means cross-repo links rot or duplicates drift.
- During the 8-week build we'll constantly reference v1: `git log --follow legacy/backend/services/task_service/...` is one command vs. cloning a second repo.
- Single CI, single GitHub Actions secrets, single deploy pipeline, single issue tracker.
- Cutover is a `git rm -rf legacy/` + reverse-proxy switch, not a repo migration.
- Rollback is `git revert` + restart of the v1 container; no repo to re-clone.

### 4.4 The rename commit (one shot, before any v2 work)

```bash
git mv backend                legacy/backend
git mv frontend               legacy/frontend
git mv README.md              legacy/README.md
git mv TEST_PLAN.md           legacy/TEST_PLAN.md
git mv REMAINING_ISSUES.md    legacy/REMAINING_ISSUES.md
git mv NEW_REQURIEMENT.md     legacy/NEW_REQURIEMENT.md
git mv AI_Recommand_rule.md   legacy/AI_Recommand_rule.md
git mv config.ini             legacy/config.ini   # then rotate the key, then delete
rm    temp.md
rm -rf temp/

git commit -m "chore: move v1 into legacy/ ahead of v2 rebuild"
```

`docs/`, `.claude/`, `.gitignore`, `.git/`, and `.vscode/` are NOT moved — they belong to the repo, not to either version. `git log --follow legacy/backend/services/<x>.py` resolves cleanly through the rename.

### 4.5 The cutover commit (end of Phase 5)

```bash
git rm -r legacy/
git commit -m "chore: remove v1 legacy tree after v2 cutover"
```

If anything goes wrong after this point, `git revert` brings v1 back; the Docker image registry still has the last v1 image; the data has been migrated forward (not destroyed).

---

## 5. v1 → v2 feature mapping

All current features are preserved. The mapping is straightforward because the audit gave us a complete feature list.

| v1 module | v2 module | Behaviour change |
|---|---|---|
| `backend/routes/auth.py` + `services/auth_service.py` | `apps/api/src/modules/auth/` | argon2id, rotating refresh tokens, rate limit, `type:"access"\|"refresh"` claim |
| `backend/routes/children.py` | `apps/api/src/modules/children/` | Owner check enforced via per-route Fastify hook |
| `backend/routes/tasks.py` + `services/task_service/` | `apps/api/src/modules/tasks/` | State machine becomes an explicit `TaskStateMachine` class; recurrence rules in Postgres-compatible JSONB / SQLite JSON column |
| `routes/completion_routes.py` | `modules/completions/` | ObjectId mess gone (integer or UUIDv7 ids) |
| `routes/attachment_routes.py` | `modules/attachments/` | **Real `@fastify/multipart` upload**, MIME allowlist, magic-byte sniff, 25 MB cap, UUID filenames |
| `routes/session_routes.py` | `modules/sessions/` | Authenticated; per-session token; save/resume cleanly modeled |
| `routes/subtask_routes.py` | `modules/subtasks/` | Authenticated; ownership inferred via parent task |
| `routes/chat_routes.py` + `services/chat_service.py` | `modules/chat/` | Per-child daily token cap; PII redacted before Gemini call; user content fenced in `<user_content>` |
| `routes/ai_routes.py` + AI services | `modules/ai/` | Same Gemini calls; structured prompt builders in `lib/gemini-prompts.ts` |
| `routes/school_calendar_routes.py`, `day_type_routes.py`, etc. | `modules/calendar/` | Consolidate small routers |
| `jobs/` (APScheduler) | `apps/api/src/jobs/` | `node-cron` + advisory lock for safety on restart |
| `frontend/src/store/slices/authSlice.ts` (with user data) | `apps/web/src/features/auth/store.ts` (Zustand) — token only | Server data moves to TanStack Query |
| `frontend/src/components/Header/Sidebar/ThemeContext` (dead) | Deleted |
| `frontend/src/temp/`, `.backup`, `.bak` files | Deleted (don't carry forward to v2) |

Frontend components (modals, calendar views, page layouts) port over largely verbatim — only their imports and store/query bindings change. That's where ~60% of the LOC lives and it's the lowest-risk part of the move.

---

## 6. Phased plan

Each phase ends in a runnable, demoable state. No phase requires the previous phase to be "complete" in production — it's just ready for the next phase to build on.

### Phase 0 — Foundations (week 1)
- Create new repo `kidsprogress-v2` (clean git history)
- pnpm workspace, TS configs, ESLint+Prettier, Vitest, CI
- `packages/shared` with first DTOs: `User`, `Child`
- `packages/db` with Drizzle schema for `users`, `children`, `refresh_tokens`, `devices`
- `apps/api` skeleton: Fastify + JWT + argon2 + Zod + helmet + rate-limit + cors
- `/health` endpoint with DB ping
- **Exit criteria**: `pnpm dev` runs API on :8000, frontend on :5173, both type-check, CI is green

### Phase 1 — Auth + Children (week 2)
- Implement: register, login, refresh (with rotation), logout, parent PIN, child device login
- Web: login page, child portal entry, parent PIN modal
- Rate limit on `/auth/login`, `/auth/child-login`, `/auth/parent-pin/verify` (5/min/IP)
- Audit logs for auth events
- **Exit criteria**: Full auth flow works end-to-end; manual security smoke test of unauthenticated routes confirms 401

### Phase 2 — Tasks (week 3-4) — biggest phase
- Drizzle schema: `tasks`, `subtasks`, `completions`, `recurrence_exceptions`, `task_collections`, `task_attachments`
- Implement task state machine as a typed class (carry over the architecture-patterns skill content verbatim)
- CRUD + lifecycle: create, start, complete, skip, exception
- Virtual instance materialization job (`node-cron`)
- Port frontend task pages, list views, calendar views, modals — switch axios → fetch, redux user → query, etc.
- **Exit criteria**: Parent can create recurring tasks; child portal can complete them; completion history shows; data round-trips correctly

### Phase 3 — Attachments + sessions + subtasks (week 5)
- Real file upload with MIME + magic-byte validation, 25 MB cap, UUID names, local volume storage
- Task session save/resume
- Subtask CRUD
- **Exit criteria**: Upload a photo to a completed task and view it; pause + resume a writing task

### Phase 4 — AI features (week 6)
- Chat with per-child token cap (default 5k/day) + PII redaction
- AI recommendations + AI scheduling endpoints
- All AI service calls go through one `lib/gemini.ts` wrapper that enforces caps, logs cost, and accepts a redaction policy
- **Exit criteria**: Gemini surface is rate-limited; PII not in outbound payloads (verify via log inspection)

### Phase 5 — Migration script + cutover (week 7)
- Write `scripts/migrate-from-v1.ts` — reads MongoDB, writes SQLite via Drizzle
- Map ObjectIds → UUIDv7 (canonical type going forward); store mapping table for any external references
- Dry-run with production data on a copy; diff against v1 API outputs
- Plan a 1-hour cutover window: stop v1, run migration, smoke test, switch reverse proxy to v2
- **Exit criteria**: Migration runs cleanly; v2 serves real data; rollback path documented

### Phase 6 — Deploy + harden (week 8)
- Multi-stage Dockerfile finalized; image size ≤120 MB
- Synology Container Manager compose file with persistent volumes for SQLite + uploads
- DSM reverse proxy + Let's Encrypt
- Backup job: nightly `sqlite3 backup` to a separate share + offsite copy via Hyper Backup
- Monitoring: pino logs → Synology Log Center
- **Exit criteria**: Running on the NAS, accessible from outside, backups verified, restore tested once

### Phase 7 — Optional polish
- E2E tests (Playwright) for golden paths
- Storybook for shared components if it earns its keep
- Performance profiling on the NAS hardware specifically — measure cold-start, p95 task list query, etc.

---

## 7. Data migration strategy

- **One-shot ETL**, not dual-write. v1 stops, migration runs, v2 starts.
- Migration script in `scripts/migrate-from-v1.ts` connects to MongoDB read-only and writes to SQLite via Drizzle (the same schema the app uses — so any drift breaks the build before it breaks the migration).
- Maintain a `legacy_id_map` table (`{ collection, mongo_id, new_id }`) for the first 90 days so any URL bookmarks / external references can still be resolved via a fallback lookup.
- ObjectIds → UUIDv7 (time-sortable, fits well in SQLite and Postgres alike).
- Dates: normalize all timestamps to UTC ISO-8601 strings, drop the naive-datetime pollution from v1.
- Recurrence rules: keep as JSON column (Postgres JSONB / SQLite JSON1); v2 schema validates with Zod on read and write.
- **Test the migration twice**: once on a copy of the dev DB, once on a snapshot of prod. Diff key aggregates (counts per collection, total completions per child) before/after.

---

## 8. Security baked in from day 1

Every audit critical/high finding has a v2 design answer. Listing the mapping so nothing is lost:

| Audit finding | v2 answer |
|---|---|
| 5 unauthenticated route modules | All routes go through a Fastify `preHandler` requiring an authenticated `current_user` by default. Public routes opt out explicitly. |
| Hardcoded JWT secret fallback | `config.ts` reads required env vars and throws on missing — no defaults for secrets. |
| Live API key in `.env` (and `config.ini`) | `.env` always gitignored; `config.ini` not used; CI checks for committed secrets via `trufflehog` action. |
| `python-jose` CVEs | Replaced by Fastify's JWT plugin (jsonwebtoken under the hood — actively maintained). |
| Bcrypt-loop refresh-token verification | SHA-256-of-token stored in `refresh_tokens.token_hash` with a unique index → O(1) lookup. |
| No login rate limit | `@fastify/rate-limit` on `/auth/*` (5/min/IP, with lockout on 10 consecutive failures). |
| `print(await request.body())` on 422 | Pino logger never serializes request bodies; validation errors log field names only. |
| Stub file upload trusts client | Real multipart upload; magic-byte sniff; MIME allowlist; 25 MB cap; server-side UUID names. |
| No CORS / header hardening | `@fastify/helmet` + explicit CORS allowlist. |
| Prompt injection / unbounded LLM cost | `lib/gemini.ts` enforces per-child daily token cap; user content always fenced in `<user_content>`; system prompts never contain user-supplied text. |
| Child PII to Google | Names replaced with placeholders; DOB never sent; reviewed at LLM-call boundary. |

---

## 9. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **DS216+II RAM too tight** | Medium | High | SQLite + Node keeps headroom; if a future feature pushes us over, swap NAS or move DB to a cheap external Postgres host. Provide a `docker stats` reading after Phase 6. |
| **Container Manager not available on DS216+II** | Medium | Medium | Plan B: run Node directly on DSM via Task Scheduler with a watchdog script. Same artifact, no container. |
| **Drizzle SQLite + concurrent writes** | Low | Medium | WAL mode + single-writer Node process eliminates contention. If we ever multi-process, switch to Postgres (already supported by Drizzle). |
| **Feature parity gaps discovered late** | Medium | Medium | Phase 5 cutover is the gate. Spend ~3 days running v1 and v2 side-by-side against the same dataset and diffing API responses on golden flows. |
| **LLM behaviour drift after Gemini SDK swap** | Low | Low | Snapshot tests of prompt builders + a manual 10-prompt regression set. |
| **Data migration loses recurrence-rule corner cases** | Medium | High | Migration script preserves raw v1 JSON in a `legacy_payload` column for 90 days; can re-derive if a rule misbehaves. |
| **Rebuild scope creep** | High | Medium | Strict "feature parity only" rule in Phases 0–5. No new features until cutover is done. Roadmap items wait. |
| **Cutover bricks production** | Low | High | DSM snapshots the data volume before cutover. Reverse proxy can switch back to v1 container in <5 minutes. Documented rollback. |

---

## 10. Open decisions

I've made opinionated calls above; flag if any disagree and I'll redo affected sections.

1. **Node + TypeScript vs keep Python**. Recommended Node. If you have a strong preference for Python, the rest of the plan still works with FastAPI + SQLModel + SQLite, but you lose the shared-types DX win and pay ~80 MB more RAM.
2. **SQLite vs PostgreSQL**. Recommended SQLite (family-scale, 1 GB RAM target). Postgres is the right answer the moment we add a second writer, multi-tenant, or NAS-external clients. Drizzle's swap is a config change.
3. **Redux → Zustand vs keep Redux Toolkit**. Recommended Zustand — fits "client state only" much better. RTK Query overlaps with TanStack Query and would be a mistake to mix.
4. **Big rebuild vs incremental refactor in place**. Recommended rebuild. If you'd rather refactor v1 in place, I can convert this plan into an incremental "Strangler Fig" with the same security-critical items first, but it will take longer total.
5. **`@google/generative-ai` Node SDK vs raw fetch**. Recommended Node SDK — it's stable; one less thing to write.
6. **Translations carry forward verbatim** or re-extract from the new component tree? Recommended carry-forward — both `en` and `zh` JSON files port directly; only the namespaces need light tidying.

---

## 11. What needs to happen this week (regardless of plan choice)

These are independent of the rebuild — fix on v1 today because they're exploitable now:

1. **Rotate the Gemini key** at `backend/.env:14`. Verify `git log -p -S AIzaSy` shows no commit. Rotate again every 90 days going forward.
2. **Add `Depends(get_current_user)`** to every route in `attachment_routes.py`, `session_routes.py`, `subtask_routes.py`, `chat_routes.py`, plus `tasks.py:338,352,464`. ~1 hour of mechanical work.
3. **Delete the `print(await request.body())`** at `backend/main.py:213-216`. Two-minute fix; the only thing blocking it is awareness.
4. **Replace the JWT secret fallback** with a startup-time `raise`. Five-minute fix.
5. **Add slowapi rate limit** to login + PIN endpoints. ~30 minutes.

Items 1-4 fix the worst exposures while the v2 plan is being executed.
