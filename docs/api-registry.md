# API ↔ UI wiring registry

> Manually updated after feature implementation. Source of truth for
> "does this endpoint have a clickable surface?". When a row is **⚠️**,
> the endpoint exists but the UI doesn't reach it (yet) — track it as a
> punch-list item until it becomes **✅**.

## Public (no auth)

| Endpoint | Method | UI? | Surface |
|---|---|---|---|
| `/health` | GET | n/a | (operator monitoring) |
| `/api/auth/register` | POST | ✅ | `/parent-signup` |
| `/api/auth/login` | POST | ✅ | `/parent-login` |
| `/api/auth/refresh` | POST | ⚠️ | apiClient auto-refresh not wired yet |
| `/api/auth/logout` | POST | ✅ | Sign-out in `ParentShell` rail |
| `/api/devices/lookup` | POST | ✅ | `/setup-device` + `/` (kid roster fetch) |
| `/api/devices/child-login` | POST | ✅ | `/` PIN flow |
| `/api/children/pin/use-reset` | POST | ✅ | "Forgot PIN?" on `/` |

## Parent role

| Endpoint | Method | UI? | Surface |
|---|---|---|---|
| `/api/auth/me` | GET | ✅ | `/parent/settings` |
| `/api/auth/me/parent-pin` | POST | ✅ | `/parent/settings` (set/change) |
| `/api/auth/me/parent-pin/verify` | POST | ⚠️ | view-as-child verifies inline; standalone gate not yet shipped |
| `/api/auth/me/view-as-child` | POST | ✅ | Eye icon on `/parent/children` |
| `/api/children` | GET / POST | ✅ | `/parent/children` |
| `/api/children/:id` | GET / PATCH | ✅ / ⚠️ | GET used; PATCH not surfaced (workaround: archive + recreate) |
| `/api/children/:id/archive` | POST | ✅ | `/parent/children` |
| `/api/children/:id/restore` | POST | ✅ | `/parent/children` |
| `/api/children/:id/pin` | POST / DELETE | ✅ | `/parent/children` set + clear |
| `/api/children/:id/pin/issue-reset` | POST | ✅ | `/parent/children` |
| `/api/templates` | GET / POST | ✅ | `/parent/templates` + `/parent/templates/new` |
| `/api/templates/:id` | GET / PATCH | ✅ / ⚠️ | GET used; PATCH not yet surfaced |
| `/api/templates/:id/archive` | POST | ✅ | `/parent/templates` |
| `/api/templates/:id/restore` | POST | ✅ | `/parent/templates` |
| `/api/assignments` | GET / POST | ✅ | `/parent/assignments` (list) + `/parent/templates/:id/assign` (create) |
| `/api/assignments/:id` | GET / DELETE | ⚠️ / ✅ | DELETE wired; GET not directly surfaced |
| `/api/devices` | GET | ✅ | `/parent/devices` |
| `/api/devices/register` | POST | ✅ | `/parent/devices` |
| `/api/devices/:id/revoke` | POST | ✅ | `/parent/devices` |
| `/api/devices/:id/children` | POST | ✅ | `/parent/devices` roster chips |
| `/api/devices/:id/children/:childId` | DELETE | ✅ | `/parent/devices` roster chips |

## Mixed-role (parent + child[-readonly])

| Endpoint | Method | UI? | Surface |
|---|---|---|---|
| `/api/scheduling/calendar` | GET | ✅ | `/today` (child) |
| `/api/scheduling/materialize` | POST | n/a | superseded by `/api/instances/transition` |
| `/api/instances/transition` | POST | ✅ | `/today` Start + Done; `/today/execute/:id` Done |
| `/api/instances/:id/run` | GET | ✅ | `/today/execute/:id` |
| `/api/instances/:id/session` | GET / PUT | ✅ | `/today/execute/:id` save-progress + resume |

## Known gaps (carried forward)

- **Auto-refresh on 401**: when the 15-min parent access token expires the
  apiClient should silently call `/api/auth/refresh` once and retry.
- **Standalone parent-PIN re-gate**: only view-as-child verifies the PIN.
  Other sensitive actions (delete child, revoke device) should also re-gate
  per the v2.5 plan.
- **Calendar read on `/parent/assignments`**: list shows the rule, not the
  expanded occurrences. A "preview next 14 days" view would help spot
  scheduling collisions.
- **Template / child PATCH UI**: backend supports editing; the forms to
  surface those aren't built yet (workaround: archive + recreate).
