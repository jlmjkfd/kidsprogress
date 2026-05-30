---
description: Generate unit tests for the specified files
argument-hint: <file paths>
---

Generate unit tests for: **$ARGUMENTS**

For each file:

1. Read the file and identify testable units:
   - Frontend: component props/state behavior, hooks return values, util pure functions
   - Backend: route handlers (status + payload shape), service logic, repository queries

2. Generate test file alongside the source (or under `__tests__/` if that's the existing convention for the directory):
   - Frontend → Vitest + React Testing Library, file name `<source>.test.tsx`
   - Backend → pytest, file name `test_<source>.py`

3. Cover:
   - Happy path
   - Boundary inputs (empty, null, max length)
   - Error paths
   - Authorization (if backend route)
   - i18n key resolution (if user-facing strings)

4. Mock external dependencies (HTTP, DB, LLM) — never hit real services in unit tests.

5. After generating, report:
   - Files created
   - What's covered vs. intentionally skipped
   - How to run the tests (`pnpm test` / `pytest`)
