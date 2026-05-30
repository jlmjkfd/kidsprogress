---
description: Scaffold docs and TODO list for a new feature
argument-hint: <feature-name>
---

Start development of a new feature. The feature name passed in: **$ARGUMENTS**

1. Create feature documentation under `docs/features/$ARGUMENTS/`:
   - `plan.md` — goals, technical approach, architecture decisions
   - `context.md` — current state, related APIs/components, dependencies
   - `tasks.md` — task breakdown with status tracking

   Copy from `docs/templates/` if templates exist there.

2. Ask the user to confirm:
   - Feature scope and acceptance criteria
   - Whether it touches frontend, backend, or both
   - Related APIs or components already in the codebase
   - Testing strategy

3. Use TodoWrite to seed the initial task list from `tasks.md`.

4. Wait for the user's approval before writing any production code.
