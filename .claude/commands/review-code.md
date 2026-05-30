---
description: Review code against project skills (React, TS, API, errors, tests, perf)
argument-hint: <file paths or globs>
---

Review the following files against KidsProgress guidelines: **$ARGUMENTS**

If no files passed, review the working tree diff (`git diff --name-only` against the merge base with `main`).

1. Identify which skills apply to the changed files and follow them:
   - Frontend `.tsx`/`.ts` → react-patterns, typescript-std, state-management, i18n, responsive-design, project-structure
   - Backend `.py` → api-design, database, error-handling, architecture-patterns
   - Tests → testing
   - Cross-cutting → development-principles, error-handling, performance

2. Verify:
   - File placement follows project-structure conventions
   - Icons via @tabler/icons-react (no emoji or raw SVG)
   - Unit tests exist for new logic
   - Error handling present at boundaries
   - Types are explicit (no implicit any, no unjustified `as` casts)
   - i18n used for every user-facing string
   - Mobile/tablet/desktop breakpoints present on new UI

3. Report violations as a table: file:line · violated rule · suggested fix · severity.

4. End with a short list of follow-ups the user should run before committing.
