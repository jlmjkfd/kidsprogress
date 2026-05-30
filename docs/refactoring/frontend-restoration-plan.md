# Frontend Restoration Plan

Companion to [2026-rebuild-plan.md](2026-rebuild-plan.md). The backend rebuild (Phases 0–4) reached feature parity for the API; the frontend reached only a thin shell. This document is the ordered work list to bring the frontend back to v1 daily-use parity.

Each numbered step is **one commit**, demoable in the browser as it lands.

## Tier 1 — restores daily-use fidelity (parent role)

| # | What | Backend ready? | Why first |
|---|---|---|---|
| 1 | **Task detail page** (`/tasks/:taskId`) — view fields, child name, collection, subtasks, recent completions | yes | Everything below opens from here |
| 2 | **Task edit** — inline form on detail page, save via PATCH | yes | #1 most-asked v1 feature missing |
| 3 | **Rich completion modal** — duration, score, notes; occurrenceDate for recurring | yes | Without this, "Complete" loses all the data v1 captured |
| 4 | **Subtask checklist** on task detail — add/edit/delete (parent), toggle done | yes | Common per-task workflow |
| 5 | **Day view** — task list switches to `/api/tasks/instances` for a chosen date with per-occurrence Complete/Skip | yes | Without this, recurring tasks can't be marked done per-day from the UI |
| 6 | **Week calendar view** — toggle between Day and Week; 7-column grid | yes | The most-missed v1 view |

## Tier 2 — completes the parent portal

| # | What | Backend ready? |
|---|---|---|
| 7 | **Completion history page** (`/history`) — list + simple bar chart (Recharts), last 14 days | yes |
| 8 | **Task collections UI** (`/collections`) — list/create/edit/delete + picker in task form | yes |
| 9 | **Device management UI** (`/devices`) — register (shows one-time token), list, revoke | yes |
| 10 | **Settings page** (`/settings`) — change display name, set/change PIN, language toggle | partly (no settings endpoint for display name yet — will add) |

## Tier 3 — child portal

| # | What | Backend ready? |
|---|---|---|
| 11 | **Child portal layout + login** (`/child`) — device-token URL + PIN entry | yes (`/api/auth/child-login`) |
| 12 | **Child task list (today)** — child sees own instances for today, can Start | yes |
| 13 | **Child execute page** — task title + subtasks + Complete button → rich completion | yes |
| 14 | **Generic session save/resume** — auto-save in-progress state to `/api/sessions` every 30 s | yes |
| 15 | **Math plugin executor** — addition/subtraction practice using `task.settings`; auto-score on complete | yes (uses sessions + completion) |
| 16 | **Writing plugin executor** — textarea + word count + save-progress | yes |

## Tier 4 — AI features (need Gemini API key)

| # | What | Backend status |
|---|---|---|
| 17 | **Chat module** — backend routes + parent + child chat UI | wrapper exists, routes pending |
| 18 | **AI recommendations** — module + parent panel | not built |
| 19 | **AI scheduling** — module + parent UI | not built |

## Order of execution

Top-to-bottom. Each step is committed before the next is started so:
- you can pull and try it at any point
- a regression can be `git revert <hash>` clean
- a step that turns out unwanted can be dropped without unwinding others

## Out of scope for this restoration

These were in v1 but not flagged as essential — defer unless requested:
- Theme toggle / dark mode (audit flagged the v1 theme code as dead anyway)
- School calendar / day types (only used by AI scheduling; rebuild together with #19)
- Activity / audit log viewer (the data is in the DB; ad-hoc SQL is fine for now)
- Plan-ahead modal (composite of edit + create — covered by #1, #2)
- Analytics dashboard beyond the basic chart in #7 (deferred to Tier 5 if requested)

---

When all of Tier 1–3 is in, the parent + child user experience matches v1 for daily use. Tier 4 layers AI on top.
