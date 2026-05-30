# Cleanup and Setup Plan: v0.0.1 → MVP (v1.0.0-alpha)

## Overview
Transition from legacy v0.0.1 to new MVP architecture with clean scaffolding.

**Timeline:** Immediate
**Approach:** Hybrid (Claude proposes, user reviews/confirms before execution)

---

## Phase 1: Remove Deployment Pipeline & Legacy Docs

### Files to DELETE

#### Deployment Infrastructure (user requested removal)
- `.github/workflows/ci-cd.yml` - GitHub Actions workflow
- `docker-compose.yml` - Docker orchestration
- `backend/Dockerfile` - Backend container
- `frontend/Dockerfile` - Frontend container
- `CI-CD-SETUP.md` - Deployment documentation

#### Legacy Documentation (superseded by docs/)
- `ARCHITECTURE.md` - replaced by [docs/architecture.md](docs/architecture.md)
- `DESIGN_SYSTEM.md` - not needed for MVP
- `process.md` - old development process
- `devDocs/` - entire folder (old documentation)

#### Old AI/Workflow Code (not using LangGraph initially)
- `backend/workflows/` - entire folder (LangGraph workflows)
- `backend/llm/` - entire folder (old AI code)
- `backend/tools/` - entire folder (old tool implementations)

#### Temporary/Unused Files
- `frontend/src/temp/` - temporary files (if exists)
- Any `*.log`, `*.pyc`, `__pycache__/` directories

---

## Phase 2: Update Dependencies

### Frontend: [frontend/package.json](frontend/package.json)

**Keep these dependencies** (already aligned):
- ✓ React 19.0, TypeScript
- ✓ Redux Toolkit 2.8, React-Redux 9.2
- ✓ Vite 6.2, Tailwind 4.1
- ✓ React Router 7.7
- ✓ Axios 1.11 (for now, will add TanStack Query)
- ✓ Testing: Vitest, Playwright, Testing Library

**Add these dependencies:**
```bash
npm install @tanstack/react-query@^5.0.0 @tanstack/react-query-devtools@^5.0.0
npm install @tabler/icons-react@^3.0.0  # If not already present
```

**Update version:**
```json
"version": "1.0.0-alpha"
```

### Backend: [backend/requirements.txt](backend/requirements.txt)

**Issues with current file:**
- File has encoding issues (binary characters visible)
- Using PyMongo (need Motor instead)
- Has LangGraph/LangChain (not needed initially)

**Create NEW requirements.txt:**
```txt
# Core Framework
fastapi==0.116.1
uvicorn[standard]==0.35.0
python-dotenv==1.1.1
pydantic==2.11.7
pydantic-settings==2.7.0

# Database (Motor for async MongoDB)
motor==3.7.0

# Authentication
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.20

# AI (Gemini API)
google-generativeai==0.8.3

# Testing
pytest==8.3.0
pytest-asyncio==0.25.0
httpx==0.28.1  # For TestClient

# Development
black==25.1.0
ruff==0.9.3
```

**Remove these (not needed initially):**
- ❌ langchain, langchain-core, langchain-google-genai
- ❌ langgraph, langgraph-checkpoint, langgraph-prebuilt
- ❌ pymongo (replace with motor)
- ❌ SQLAlchemy (using MongoDB)
- ❌ sentry-sdk (defer to production)

---

## Phase 3: Reorganize Backend Structure

### Current Structure
```
backend/
  db/           # Keep, update for Motor
  llm/          # DELETE
  workflows/    # DELETE
  tools/        # DELETE
  main.py       # Rewrite
```

### New Structure (create these folders)
```
backend/
  routes/       # NEW - API endpoints
    __init__.py
    auth.py
    tasks.py
    users.py
  services/     # NEW - Business logic
    __init__.py
    auth_service.py
    task_service.py
    user_service.py
  models/       # NEW - Pydantic models
    __init__.py
    user.py
    task.py
    schedule.py
  ai/           # NEW - Gemini AI integration
    __init__.py
    gemini_client.py
    evaluators.py
  db/           # UPDATE - Motor connection
    __init__.py
    connection.py
  dependencies/ # NEW - FastAPI dependencies
    __init__.py
    auth.py
    database.py
  __tests__/    # NEW - Backend tests
    test_auth.py
    test_tasks.py
```

### Files to UPDATE in backend/db/
- Review existing files, convert PyMongo → Motor
- Update connection logic for async

---

## Phase 4: Reorganize Frontend Structure

### Current Structure
```
frontend/src/
  components/   # Keep, clean up
  pages/        # Keep, reorganize
  store/        # Keep, update slices
  contexts/     # Review (may not need with Redux)
  models/       # Keep, may rename to types/
  utils/        # Keep
```

### New Structure (create these folders)
```
frontend/src/
  api/          # NEW - TanStack Query hooks
    queries/
      useUsers.ts
      useTasks.ts
    mutations/
      useCreateTask.ts
      useUpdateTask.ts
    client.ts   # Axios instance
  store/        # UPDATE - Redux for client state only
    slices/
      uiSlice.ts      # Sidebar, modals, etc.
      authSlice.ts    # Auth tokens, user session
    store.ts
  pages/        # UPDATE - Clean structure
    login/
      index.tsx
      components/
      __tests__/
    dashboard/
      index.tsx
      components/
      hooks/
      __tests__/
  components/   # UPDATE - Shared components only
    Button/
      Button.tsx
      __tests__/Button.test.tsx
    Layout/
    Navigation/
  types/        # RENAME from models/
    user.ts
    task.ts
  hooks/        # Common hooks
    useMediaQuery.ts
  utils/        # Keep
```

### Files to REVIEW/UPDATE
- `frontend/src/contexts/` - May not need if using Redux + TanStack Query
- `frontend/src/store/` - Remove any API data from Redux slices
- `frontend/src/pages/` - Reorganize per new structure

---

## Phase 5: Environment Configuration

### Update `.env.example`

**New variables needed:**
```bash
# Backend
MONGO_URI=mongodb://localhost:27017
DB_NAME=kidsprogress_mvp
JWT_SECRET=your-secret-key-here
GEMINI_API_KEY=your-gemini-api-key-here

# Frontend (if needed)
VITE_API_BASE_URL=http://localhost:8000
```

### Create/Update environment files
- Keep `frontend/.env.development`, `frontend/.env.production`
- Update with new VITE_API_BASE_URL if needed
- Add `backend/.env.example` with MongoDB + Gemini config

---

## Phase 6: Core Files to Rewrite

### Backend
- `backend/main.py` - FastAPI app with new structure
- `backend/db/connection.py` - Motor async connection
- `backend/routes/auth.py` - Authentication endpoints
- `backend/services/auth_service.py` - Auth business logic
- `backend/models/user.py` - User Pydantic model

### Frontend
- `frontend/src/api/client.ts` - Axios + TanStack Query setup
- `frontend/src/store/store.ts` - Redux store (client state only)
- `frontend/src/store/slices/authSlice.ts` - Auth client state
- `frontend/src/pages/login/index.tsx` - Login page

---

## Phase 7: Testing Setup (Keep Current Config)

### Frontend Testing (already configured)
- ✓ Vitest + Testing Library
- ✓ Playwright for E2E
- Keep existing test configuration files

### Backend Testing (needs setup)
- Add `pytest.ini` or `pyproject.toml` config
- Add `backend/conftest.py` for fixtures
- Create test database setup

---

## Summary of Actions

| Phase | Action | Count |
|-------|--------|-------|
| DELETE | Files/folders to remove | ~15 items |
| UPDATE | Dependencies | 2 files (package.json, requirements.txt) |
| CREATE | New backend folders | 6 folders |
| CREATE | New frontend folders | 2 folders (api/, types/) |
| REORGANIZE | Existing folders | 3 folders (store/, pages/, components/) |
| REWRITE | Core files | ~10 files |

---

## Next Steps (After User Approval)

1. **Backup current state** (git commit v0.0.1)
2. **Execute deletion** (Phase 1)
3. **Update dependencies** (Phase 2)
4. **Create new folder structure** (Phase 3-4)
5. **Update environment files** (Phase 5)
6. **Implement Week 1-2: Authentication** (per Stage 1 MVP requirements)

---

## Decision Points for User

1. **Confirm deletion of deployment infrastructure?** (GitHub Actions, Docker files)
2. **Confirm removal of LangGraph/LangChain code?** (can add back later if needed)
3. **Keep or remove `frontend/src/contexts/`?** (may not need with Redux + TanStack Query)
4. **Any specific files in current codebase to preserve?**

Ready to proceed with user review and approval.
