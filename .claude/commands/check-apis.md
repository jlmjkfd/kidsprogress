---
description: Audit backend API endpoints vs frontend usage and refresh docs/api-registry.md
---

Audit API endpoints to find unused APIs and document usage. **$ARGUMENTS**

1. Enumerate all backend endpoints:
   - Search `backend/routes/**/*.py` for `@router.(get|post|put|delete|patch)` and `APIRouter(prefix=...)` to derive full paths.
   - Note the prefix used when each router is included in `backend/main.py`.

2. Enumerate frontend API usages:
   - Search `frontend/src/api/queries/**` and `frontend/src/api/mutations/**` for the endpoint paths.
   - Also grep `frontend/src` for any direct `apiClient.(get|post|put|delete|patch)` calls.

3. Refresh `docs/api-registry.md`. For each endpoint write:
   - Method + full path (with the prefix)
   - Handler file:line
   - Frontend callers (file:line, or "unused")
   - Auth requirement (yes/no — does the handler depend on `get_current_user`?)

4. Summary table:
   - Total endpoints
   - Used endpoints
   - Unused endpoints (candidates for removal)
   - Endpoints missing auth (call this out — it's a real risk)
   - Prefix inconsistencies (e.g., `/attachments` vs `/api/...`)

5. Output the report in chat AND save it to `docs/api-registry.md`.
