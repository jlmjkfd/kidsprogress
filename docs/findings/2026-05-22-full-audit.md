# KidsProgress Full-Project Audit — 2026-05-22

Top-to-bottom review of the repository at `d:/workspaces/kidsprogress/`.
Performed via four parallel review agents (backend, frontend, security, docs/config)
plus a configuration upgrade of `.claude/`.

> **Read order:** §0 (configuration changes) → §1 (must-fix-before-ship) → §2-5
> (per-area findings) → §6 (recommended next steps).

---

## 0. Configuration changes already applied to `.claude/`

The previous structure used a custom hook-based skill auto-loader from an early
Claude Code era. It no longer matches what the current Claude Code harness
expects. The following was migrated in place — no behaviour was lost.

| Before | After |
|---|---|
| `.claude/skills/<name>.md` (flat) | `.claude/skills/<name>/SKILL.md` (folder) |
| `.claude/skills/config.json` (keyword/path/intent triggers) | **Deleted.** Each `SKILL.md` now has YAML frontmatter (`name`, `description`); the model invokes by matching the description. |
| Slash command bodies used `{{args}}` | Now use `$ARGUMENTS`, with YAML frontmatter (`description`, `argument-hint`). |
| `.claude/README.md` documented the old auto-loader | Rewritten to document the SKILL.md + frontmatter format. |
| `docs/hook-setup-guide.md` | **Stale** — references the old hook system. Recommend deleting (preserved for now). |

All 14 skills + 4 commands verified appearing correctly in the runtime skill
list with their new descriptions. No content was lost; the bodies of the
original `.md` files are preserved verbatim as the new `SKILL.md` bodies.

---

## 1. Must-fix-before-ship (blockers)

These are show-stoppers — most are exploitable from the public internet by an
unauthenticated user.

### 1.1 Unauthenticated route files (full IDOR on children's data)
**Severity: critical.** Five backend route modules have **zero** `get_current_user`
dependencies. Anyone with the URL can read/write/delete any family's data.

| File | Risk |
|---|---|
| [backend/routes/attachment_routes.py](backend/routes/attachment_routes.py) | Read/upload/delete any child's photos, audio, files |
| [backend/routes/session_routes.py](backend/routes/session_routes.py) | Drive any child's task lifecycle, read history |
| [backend/routes/subtask_routes.py](backend/routes/subtask_routes.py) | Full subtask CRUD for any task |
| [backend/routes/chat_routes.py](backend/routes/chat_routes.py) | Burn Gemini budget; read child profile; wipe chat history |
| [backend/routes/recurrence_routes.py:124](backend/routes/recurrence_routes.py#L124) | `parent_id` taken as a **query/body parameter** with a literal `# TODO: Get from auth token` |

Fix: add `current_user: User = Depends(get_current_user)` on every route and
verify `parent_id == current_user.id` before reading/writing.

### 1.2 Live Gemini API key on disk + hardcoded JWT secret fallback
- [backend/.env:14](backend/.env#L14) — `GEMINI_API_KEY=AIzaSyCTJMxh1r95jRlta-oo87vtxFHbeCWGoYY`. Rotate now. The file is gitignored but check `git log -p -S AIzaSy` to confirm it never landed in a commit.
- [backend/services/auth_service.py:13](backend/services/auth_service.py#L13) — JWT signing secret falls back to `"your-secret-key-change-in-production"` if the env var is missing. If `JWT_SECRET` is unset in any environment, anyone can forge admin tokens. Replace with `raise RuntimeError(...)` on missing secret.
- [config.ini](config.ini) at repo root — contains a Google API-key-shaped value too. Gitignored (`.gitignore:82`), but verify it never shipped, then rotate and delete the file.

### 1.3 Task lifecycle endpoints accept `child_id` without owner check
- [backend/routes/tasks.py:338,352,464](backend/routes/tasks.py#L338) — `start_task`, `complete_task`, `get_active_tasks` accept a `child_id` query param without checking that the caller owns the child.

### 1.4 Refresh-token verify is O(n·bcrypt) per request
- [backend/services/auth_service.py:79-104](backend/services/auth_service.py#L79) — `/refresh` loads every refresh token for the user and bcrypt-verifies them one by one. CPU DoS amplifier (≈50–100 ms per bcrypt × N tokens). Replace with SHA-256(token) lookup or a `jti` index.

### 1.5 `python-jose==3.3.0` (known-vulnerable, unmaintained)
- [backend/requirements.txt:16](backend/requirements.txt#L16) — CVE-2024-33664 (DoS) and CVE-2024-33663 (algorithm confusion). Combined with §1.2 above, this is a bad pair. Switch to `pyjwt>=2.8`.

### 1.6 Validation handler logs raw request bodies (passwords!)
- [backend/main.py:213-216](backend/main.py#L213) — `validation_exception_handler` calls `print(await request.body())`. A malformed `/register` or `/login` writes the **plaintext password** to stdout. Strip this; log only field names from `exc.errors()`.

### 1.7 No brute-force / lockout on login or PIN
- [backend/routes/auth.py:37,149,182](backend/routes/auth.py#L37) — 4-digit child PIN, 4–6-digit parent PIN, and email/password login all have no rate limit, no account lockout. Brute-forceable in seconds. Add `slowapi` per-IP + per-account.

### 1.8 Stub file-upload trusts client
- [backend/routes/attachment_routes.py:79-127](backend/routes/attachment_routes.py#L79) + [backend/services/task_attachment_service.py:24-75](backend/services/task_attachment_service.py#L24) — "create attachment" takes client-supplied `file_url`, `mime_type`, `file_size_bytes`, `uploaded_by`. No real upload. Combined with §1.1, an unauthenticated attacker can register attachments pointing at malicious URLs for any child. Replace with a real `UploadFile` handler with size cap, MIME allowlist, magic-byte check, and server-generated UUID name.

---

## 2. Backend (FastAPI · Motor · LangGraph) — full findings

### Architecture & layering
- **Delete stale `.backup` files**: `backend/services/task_service.py.backup`, `backend/services/task_service/crud.py.backup`.
- **Routes mutating Mongo directly** (bypass services): `attachment_routes.py:116,270`, `session_routes.py:109,209-213,247`, `subtask_routes.py:101,246,281,345`, `recurrence_routes.py:152`. Move into the relevant service.
- **Duplicated ownership check**: `routes/ai_routes.py:90,134,172,181`, `routes/schedule_routes.py:25,48,77,106`, `routes/activity_routes.py:33,58,148`, `routes/routine_routes.py:28,53` each open-code `db.children.find_one({_id, parent_id})`. Extract a `verify_child_ownership` dependency.
- **Three orphan route files** (no longer mounted in `main.py`): `routes/time_block_routes.py`, `routes/routine_routes.py`, `routes/activity_routes.py`. Delete them and their models/services.
- **`completion_routes.py:262`** references undefined `tasks_collection` (defined only in a different handler's branch); will `NameError` at runtime if hit.
- **`main.py` has 60 lines of commented-out router includes and indexes** ("Obsolete - removed for unified task model"). Delete.

### Async / await
- `services/schedule_service.py:185-194`, `services/ai_schedule_service.py:179`, `ai/task_recommender.py:102,203`, `routes/ai_routes.py:113,154` — naive `datetime.now()` mixed with timezone-aware datetimes. Use `backend/utils/datetime_utils.utcnow()`.

### MongoDB
- **[CRITICAL]** ObjectId stored as string vs ObjectId inconsistency continues — documented in `OBJECTID_STORAGE_ISSUES.md` but not resolved. Defensive `{"$or": [{"task_id": ObjectId(x)}, {"task_id": x_string}]}` queries sprinkled across `completion_routes.py:400-403,706,715,723-728,743`. Pick one canonical type (ObjectId) and run a migration script.
- Missing index: `refresh_tokens.user_id` (and TTL on `expires_at`).
- 60+ `create_index` calls inside `lifespan` — move to a migration script.
- `repositories/base_repository.py:81` — `find_many` calls `cursor.to_list(length=limit)` with `limit=None` → unbounded fetch. Default cap.
- No projection on ownership checks — entire documents fetched just to look at `parent_id`. Add `projection={"parent_id": 1}`.

### Error handling & input validation
- **12 bare `except:` clauses** swallow `KeyboardInterrupt`/`SystemExit`: `routes/ai_schedule_routes.py:105`, `routes/completion_routes.py:519,524,697,716,767`, `services/ai_schedule_service.py:365,518`, `services/task_service/crud.py:735`, `services/task_service/operations/helpers.py:38,63`, `models/task_identifier.py:88`.
- **Anti-pattern: catch-all → 500 + `str(e)` leak** at `attachment_routes.py:123-127`, `subtask_routes.py:108-112`, `session_routes.py:174-178,217-221,253-257`, `recurrence_routes.py:159-163`. Let unhandled exceptions surface; only catch known errors.
- `routes/tasks.py:264` — `add_recurrence_exception` accepts `overrides: Optional[dict] = None` body with no Pydantic schema. Mass-assignment risk on a Mongo `$set`.
- `utils/exceptions.py` defines `AppException` classes never caught anywhere — register a handler or delete.

### Dependencies
- `python-jose==3.3.0` — see §1.5.
- `bcrypt==4.0.1` + `passlib==1.7.4` — passlib unmaintained; bcrypt 4.x compatibility hacks. Migrate to `argon2-cffi` or use `bcrypt` directly without passlib.
- `python-multipart==0.0.20` — keep on latest 0.0.x patch.
- No `gunicorn` for production multi-worker.

### Tests
- `backend/__tests__/` (empty) and `backend/tests/` (real tests) both exist. Delete the empty one.
- `backend/tests/conftest.py.bak`, `test_chat_api.py.bak`, `test_writing_api.py.bak` from August 2025. Delete or restore.
- `pytest.ini:14-17` uses bogus `--cov-exclude` (not a real flag); use `.coveragerc`.
- `pytest.ini:23-24` uses `env_files = .env.test` which requires `pytest-env` plugin — not in `requirements-test.txt`.

### Dead / commented code (delete)
- `services/task_service.py.backup`
- `services/task_service/crud.py.backup`
- `main.py:33-53,87-92,231-236` (commented router includes / indexes)
- `routes/ai_routes.py:34-69` (commented DEPRECATED route)
- `services/task_service/__init__.py:259-265` (`_generate_recurring_instances_DEPRECATED`)
- `backend/check_tasks.py` — debug script at repo root; move to `scripts/` or delete.

---

## 3. Frontend (React · Vite · Redux · TanStack Query)

### State boundary violations (rule: Redux = client only)
- `store/slices/authSlice.ts:8-12` — holds `user: User | null` (server data). `useCurrentUser` already owns this. Keep only `token`/`isAuthenticated` in Redux.
- `components/Header.tsx:19-30` — raw `axios.get('http://localhost:8000/analytics/summary')` inside `useEffect`, hardcoded URL, response stored in `useState`. The component appears unused; consider deleting outright.
- `pages/child-portal/tasks/execute/[taskId].tsx:87-93` — direct `apiClient.post(...)` with manual invalidation. Move to a `useSaveProgress` mutation.

### TanStack Query
- `api/queries/useAISchedule.ts:43-62` — `useAIRecommendation` is a POST request masquerading as `useQuery`; queryKey drops `currentTime`/`childState`. Convert to `useMutation`.
- `api/mutations/useTaskMutations.ts:75-78, 313-316, 343-345` — coarse `["tasks"]` invalidation refetches every child's task list. Scope to `["tasks", "child", childId]`.
- No centralized query-key factory — typos like `"activeTasks"` vs `"tasks"` won't be caught.
- Queries don't gate on auth — 401s fire right after logout until the redirect lands.

### i18n violations (rule: every user-facing string via `t('ns:key')`)
| File | Examples |
|---|---|
| `App.tsx:192,204` | `"Learning Tools - Coming Soon"`, `"My Progress - Coming Soon"` |
| `templates/addition-subtraction/components/SettingsEditor.tsx` | Entire settings UI English-only (lines 24,29,40,47,70,73,89,93,100,107,115,120-125) |
| `components/modal/ModalRoot.tsx:70,78` | `"Success!"`, `"Awesome!"` |
| `pages/parent-portal/children/[id]/components/UnifiedTaskModal.tsx:205-216,548,564,571` | `alert()` messages |
| `pages/dashboard/index.tsx:44`, `pages/child-selection/index.tsx:52`, `pages/parent-portal/children/index.tsx:34`, `pages/task-list/index.tsx:37` | Error-fallback strings |
| `components/calendar/WeekSelector.tsx:53,95`, several `*Modal.tsx` | `aria-label`s untranslated |

### Type safety
- `tools/types.ts`, `templates/_shared/types/plugin-interface.ts`, `templates/addition-subtraction/components/SettingsEditor.tsx:110` — `any` casts. Use `Plugin<T>` generics.
- `types/template.ts` and `types/task.ts` — `Record<string, any>` proliferating (~30 occurrences). Replace with discriminated unions or `unknown`.
- Non-null assertions on possibly-null values: `components/calendar/DayView.tsx:326,404`, `WeekView.tsx:70`, `pages/parent-portal/analysis/[templateId].tsx:105`.
- `pages/child-portal/tasks/attempts/[taskId].tsx:124,142` — `const state: any = {}`.

### React anti-patterns
- **Pseudo-Observer via render-null components**: `pages/parent-portal/dashboard/index.tsx:122-205` (`ChildRecentCompletions` returns `null`, exists only to fetch and call `onCompletionsReady`; comparison via `JSON.stringify`). Refactor with `useQueries`.
- `pages/child-portal/tasks/index.tsx:84-92` — derived state stored in `useState`. Use `useMemo`.
- `pages/parent-portal/children/[id]/components/TaskListView.tsx:254` — `// eslint-disable-next-line react-hooks/exhaustive-deps` + triple-`setTimeout` scroll-to-today.
- Production `console.log` blocks across `TaskListView.tsx:161,170,178,181,190,192,201,225,226,232,236,251`.

### Responsive / a11y
- `pages/parent-portal/settings/index.tsx`, `TaskListView.tsx`, `TaskFilters.tsx` — page-level layouts with zero responsive classes.
- `TaskFilters.tsx:48` — 16px chevron without `min-h-[44px]` parent.
- `components/modal/ModalRoot.tsx:36,53` — close `×` glyph has no `aria-label`.

### Emoji / icon (rule: @tabler/icons-react)
- Inline emoji in `components/calendar/DayView.tsx:338` (`⊘`), `AIRecommendationPanel.tsx:217,253`, `AIRecommendationButton.tsx:175,176,188`, `modal/ModalRoot.tsx:29,72`, `SettingsEditor.tsx:120`, `i18n/locales/{en,zh}/tasks.json:64,390`.
- `contexts/ThemeContext.tsx`, `Sidebar.tsx`, `Header.tsx` are emoji-heavy — but appear unused and should be deleted (see Dead Code).

### Dead code (delete)
- `frontend/src/pages/HomePage.tsx.backup`, `MathPage.tsx.backup`
- `frontend/src/components/__tests__/Header.test.tsx.bak`, `Sidebar.test.tsx.bak`
- `frontend/src/store/modules/chatSlice.ts.bak`, `writingSlice.ts.bak`
- **Entire `frontend/src/temp/` directory** (contains `convert.js`, `notes.md`, `testdata.py` — Python in src/!).
- **`contexts/ThemeContext.tsx`, `components/Header.tsx`, `components/Sidebar.tsx`, `components/settings/SettingsPage.tsx`, `utils/themeUtils.ts`** — none imported by `App.tsx` or any active page; contain most emoji + i18n violations. Deleting eliminates many findings at once.

### Build / config
- `tsconfig.app.json:41-45` excludes `src/components/chat/**`, `src/components/writing/**`, `src/store/modules/chatSlice.ts`, `src/store/modules/writingSlice.ts` — `src/store/modules/` doesn't even exist (we have `slices/`). The "fix TS errors for Vercel" commits suggest these excludes are masking real errors.
- `eslint.config.js` — missing `eslint-config-prettier` integration even though both prettier packages are in devDependencies; eslint+prettier will fight.
- No `format` / `lint:fix` scripts in `package.json`.
- No `@typescript-eslint/no-explicit-any` or `no-non-null-assertion` rule (would catch many findings above).
- Path-alias inconsistency: codebase mixes `@/store/...`, `@store/...`, and relative `../../types/...` in 22 files. Pick one (recommend `@/...`) and ESLint-ban the others.

### Tests
- `useTaskMutations.ts` — the core domain — has no tests.
- No tests for child portal `pages/child-portal/tasks/index.tsx` or `execute/[taskId].tsx`.
- No tests for `UnifiedTaskModal.tsx` (the form with `alert()` validation).
- `frontend/tests/` directory exists but is empty.

---

## 4. Documentation & configuration

### Root-level clutter (move/delete)
- `NEW_REQURIEMENT.md` (misspelled) → `docs/features/ai-recommendations/requirements.md`
- `AI_Recommand_rule.md` (misspelled) → merge with above or delete
- `REMAINING_ISSUES.md` → `docs/findings/` or convert to GitHub issues
- `TEST_PLAN.md` (26 KB) → `docs/development/test-plan.md`
- `temp.md` (empty, 0 bytes) and `temp/` (Vite scaffolding from April 2024) → **delete**

### Top-level README
[README.md](README.md) describes a different project: Qdrant + OpenAI + Docker Compose + LangGraph workflows. Current code is FastAPI + Motor + Gemini + Vite/React 19, no docker-compose, no Qdrant, no `backend/workflows/`. Required-env section lists `MONGODB_URL`, `QDRANT_URL`, `OPENAI_API_KEY` — none match `.env.example`. **Rewrite Quick Start from scratch.**

### CLAUDE.md
- Line 10: claims "Testing: Jest (unit)" — project actually uses Vitest. Replace.
- Line 14: `MongoDB: localhost:27016` — backend code defaults to `27017`. Pick one and fix both.
- Project tree (line 36) is missing `frontend/src/api`, `contexts`, `i18n`, `tools`, `utils`, `types` and `backend/ai`, `repositories`, `jobs`, `dependencies`.

### `.env.example` and env-var naming
- Root `.env.example` missing variables actually read by code: `USE_MOCK_AI`, `LLM_PROVIDER`, `GEMINI_MODEL`, `CORS_ORIGINS`, `ACCESS_TOKEN_TRUSTED_DAYS`, `ACCESS_TOKEN_TEMP_MINUTES`, `REFRESH_TOKEN_TRUSTED_DAYS`, `REFRESH_TOKEN_TEMP_DAYS`. Either delete the root one (backend has its own complete `backend/.env.example`) or sync them.
- Inconsistent var names across code: `MONGO_URI`, `MONGO_URL`, `MONGODB_URL` and `DB_NAME`, `MONGO_DB_NAME`, `MONGODB_DB`. Pick one set.

### `.gitignore`
- Line 79 ignores `*.md` globally with allow-list only for `README.md` and `docs/api-registry.md` — every other `.md` in the repo (CLAUDE.md, all docs, all features) is **not** tracked unless force-added. Either remove the `*.md` rule or whitelist `docs/**/*.md` and `CLAUDE.md` and every other relevant pattern.
- Line 83 `.*/` ignores all dot-directories — including useful ones like `.github/`. Tighten.
- Missing `coverage/`, `playwright-report/`, `test-results/`.

### api-registry / component-map drift
- `docs/api-registry.md` (44 KB, "last updated 2026-01-06") — incomplete: missing entries for `/attachments/*`, `/subtasks/*`, `/sessions/*`, `/recurrence/*`, `/api/analysis/*`, `/api/chat/*`. Notes `/api/devices/register` as not-implemented in frontend but `useRegisterDevice` exists. Regenerate via `/check-apis`.
- Route prefix inconsistency: `attachment_routes`, `subtask_routes`, `session_routes`, `recurrence_routes` use bare prefixes (no `/api`) while the rest of the routes use `/api/...`. Standardise.
- `docs/component-map.md` last updated 2025-11-19 — missing ~11 components that exist on disk (`QuickCaptureModal`, `PlanAheadModal`, `FloatingActionButton`, `ChildPortalRoute`, `DeleteOccurrenceModal`, `EditOccurrenceModal`, `EditRecurringTemplateDialog`, `DeviceRegistrationModal`, `ParentPinModal`, `SchoolCalendarModal`, `CompleteTaskModal`).

### Roadmap
- `docs/roadmap/README.md` — "Current Focus: Points System (0%)" but git log shows lots of post-Stage-1 work has shipped (Vercel/Render deploys, writing AI evaluation, save/resume, virtual task materialization). Stage 2 listed in two places with contradictory status ("Not started" at line 89 vs "Partially done" at line 216).

### Doc rot to archive/delete
- `docs/CLEANUP_PLAN.md` — plan from Nov to delete files that have already been deleted. Archive.
- `backend/ARCHITECTURE-MIGRATION.md`, `backend/OBJECTID_STORAGE_ISSUES.md`, `backend/TESTING.md` — move to `docs/architecture/` if still relevant.
- `docs/architecture.md` (top-level, 24 KB) vs `docs/architecture/` (folder) — two parallel sources. Consolidate.
- `docs/features/system-redesign/` — docs/README itself says don't use for implementation. Archive.
- `docs/features/cross-night-task-handling-v2.md` + `v3.md` — v2 should be archived if v3 superseded.
- `docs/refactoring/typescript-error-fixes.md`, `typescript-any-removal.md` — refactoring journals; once shipped, archive.

---

## 5. Cross-cutting

- **`print()` debugging across hot paths** — 237 occurrences in 25 backend files. Replace with `logging`; redact PII; gate on env.
- **`backend/services/task_service.py` vs `backend/services/task_service/` package** — two parallel impls in source tree (the `.py.backup` is the old one). The package wins on import, but the backup shipping in source is confusing.
- **Inconsistent ObjectId handling** continues to drive defensive `$or` queries — fixing it once would simplify ~20 files.

---

## 6. Recommended next steps (priority-ordered)

**Today (security):**
1. Rotate the Gemini API key in `backend/.env:14`. Verify `git log -p -S AIzaSy` shows no commit. Rotate the key in `config.ini` too, then delete the file.
2. Replace the JWT secret fallback at `backend/services/auth_service.py:13` with `raise RuntimeError`.
3. Delete the `print(await request.body())` at `backend/main.py:213-216`.
4. Add `Depends(get_current_user)` to every route in `attachment_routes.py`, `session_routes.py`, `subtask_routes.py`, `chat_routes.py`, `recurrence_routes.py`, plus `tasks.py:338,352,464`. Verify ownership of `child_id`.
5. Add `slowapi` rate limiting on `/auth/login`, `/auth/child-login`, `/auth/parent-pin/verify`.

**This week (correctness & cleanup):**
6. Delete `services/task_service.py.backup`, `services/task_service/crud.py.backup`, `frontend/src/temp/`, `*.backup`/`*.bak` files in frontend.
7. Delete unused `contexts/ThemeContext.tsx`, `components/Header.tsx`, `Sidebar.tsx`, `settings/SettingsPage.tsx`, `utils/themeUtils.ts` — kills most emoji + i18n violations in one move.
8. Move `user` out of `authSlice.ts`; let `useCurrentUser` own it.
9. Replace bare `except:` (12 sites) with `except Exception:` + `logging`.
10. Migrate `python-jose` → `pyjwt`; revisit `passlib`/`bcrypt` pinning.
11. Run `/check-apis` to regenerate `docs/api-registry.md`. Standardise on `/api/...` prefix.

**This month (structure):**
12. Resolve ObjectId-as-string inconsistency once. Write a migration script; remove all `$or: [ObjectId, str]` defensive queries.
13. Rewrite root `README.md` to reflect 2026 reality (Gemini, Motor, Vite). Move loose root docs into `docs/`.
14. Fix `.gitignore` `*.md` allow-list; verify nothing important is silently ignored.
15. Introduce a TanStack query-key factory + ESLint rules (`no-explicit-any`, `no-non-null-assertion`).
16. Fix `tsconfig.app.json` stale excludes; surface and fix the real TS errors hiding behind them.
17. Add tests for `useTaskMutations`, `UnifiedTaskModal`, child-portal task pages — currently zero coverage on the core domain.

---

## Appendix: agent provenance

This report is the merged output of four parallel review agents that ran on
2026-05-22. Each agent received the same project tree and a category-specific
brief. None of them coordinated with one another, so overlapping findings
(authentication, file uploads, ObjectId, dead code, root clutter) appear in
multiple briefs — those are the highest-confidence items.
