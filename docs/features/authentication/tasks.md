# Tasks: Authentication System + i18n

## Status Overview
- **Started**: 2025-11-05
- **Updated**: 2025-11-06
- **Status**: Complete (Basic Auth + i18n)
- **Completion**: Phase 1-3 Complete, Phase 4-5 Deferred

## Task Breakdown

### Phase 1: Setup & Planning ✓
- [x] Create feature documentation
- [x] Define data models and API contracts

### Phase 2: Backend Implementation ✓
- [x] Create database connection (Motor)
- [x] Create dependencies/database.py
- [x] Create User Pydantic model
- [x] Create auth service (password hash, JWT)
- [x] Create auth routes (register, login, /me)
- [x] Update main.py with CORS and routes
- [x] Add auth dependency injection
- [ ] Write backend unit tests (Deferred to testing phase)

### Phase 3: Frontend Implementation ✓
- [x] Set up TanStack Query client
- [x] Create auth Redux slice
- [x] Create API client with axios
- [x] Create auth mutations (register, login)
- [x] Create Login page
- [x] Create Register page
- [x] Add axios interceptor for JWT
- [x] Update App routing
- [ ] Write frontend unit tests (Deferred to testing phase)

### Phase 3.5: i18n Support ✓
- [x] Install i18n dependencies (react-i18next, i18next, i18next-browser-languagedetector)
- [x] Set up i18next configuration
- [x] Create translation files (en/zh):
  - [x] common.json (buttons, language names, loading)
  - [x] auth.json (login, register, child selection, PIN entry)
  - [x] errors.json (validation, network, server errors)
- [x] Update Login page with i18n
- [x] Update Register page with i18n
- [x] Create LanguageSwitcher component
- [x] Add language switcher to auth pages
- [x] Add i18n skill to .claude/skills/

### Phase 4: Integration & Testing (Deferred)
- [ ] Test registration flow (manual testing done, automated tests deferred)
- [ ] Test login flow (manual testing done, automated tests deferred)
- [ ] Test protected routes
- [ ] Test error scenarios
- [ ] Write automated tests

### Phase 5: Documentation & Cleanup ✓
- [x] Update context.md with file locations
- [x] Mark basic auth + i18n complete

## Completed Features

### Authentication
- Parent registration with email/password
- Login with JWT tokens (30min expiration)
- Password hashing with bcrypt
- Token stored in localStorage and Redux
- Protected routes
- Auto-login after registration

### Internationalization
- English and Chinese (zh-CN) support
- Language switcher component
- Language persistence in localStorage
- Browser language detection
- All auth pages and error messages translated

## Notes & Decisions
- 2025-11-05: Using Motor instead of PyMongo for async MongoDB
- 2025-11-05: JWT stored in Redux (in-memory) AND localStorage for persistence
- 2025-11-06: Added i18n support for English and Chinese
- 2025-11-06: Deferred automated testing to dedicated testing phase

## Next Steps (Parent-Child Auth System)
Will be implemented as separate feature:
- Parent-child account hierarchy
- Child profiles with optional PIN
- Device registration
- Child selection flow
- See parent-child-auth feature folder (to be created)
