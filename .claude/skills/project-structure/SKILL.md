---
name: project-structure
description: Folder layout and path-alias conventions for KidsProgress (@api, @components, @pages, @store, @types). Use when creating new files, deciding where they go, or setting up imports.
---

# Project Structure & Path Aliases

## Path Aliases (CRITICAL)

Always use **multiple domain-specific aliases**, not a single `@/` alias.

### Configuration

**TypeScript (tsconfig.app.json):**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@api/*": ["src/api/*"],
      "@components/*": ["src/components/*"],
      "@pages/*": ["src/pages/*"],
      "@store/*": ["src/store/*"],
      "@types/*": ["src/types/*"],
      "@hooks/*": ["src/hooks/*"],
      "@utils/*": ["src/utils/*"],
      "@i18n/*": ["src/i18n/*"]
    }
  }
}
```

**Vite (vite.config.ts):**
```typescript
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@api': path.resolve(__dirname, './src/api'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@store': path.resolve(__dirname, './src/store'),
      '@types': path.resolve(__dirname, './src/types'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@i18n': path.resolve(__dirname, './src/i18n'),
    },
  },
})
```

### Usage Rules

**鉁?Always use domain aliases:**
```typescript
// API calls
import { useLogin } from '@api/mutations/useLogin';
import { useUsers } from '@api/queries/useUsers';

// Components
import Button from '@components/Button';
import Modal from '@components/Modal';

// Pages
import LoginPage from '@pages/login';
import Dashboard from '@pages/dashboard';

// Store (Redux)
import { useAppDispatch } from '@store/hooks';
import { setCredentials } from '@store/slices/authSlice';

// Types
import { User } from '@types/user';
import { Task } from '@types/task';

// Hooks
import { useMediaQuery } from '@hooks/useMediaQuery';

// Utils
import { formatDate } from '@utils/date';

// i18n
import '@i18n/config';
```

**鉁?Never use relative paths:**
```typescript
// BAD
import { useLogin } from '../../api/mutations/useLogin';
import Button from '../../../components/Button';

// GOOD
import { useLogin } from '@api/mutations/useLogin';
import Button from '@components/Button';
```

**鉁?Don't use single `@/` when domain alias exists:**
```typescript
// BAD
import { useLogin } from '@/api/mutations/useLogin';

// GOOD
import { useLogin } from '@api/mutations/useLogin';
```

### Benefits

1. **Shorter imports**: `@api/` vs `@/api/` or `../../../api/`
2. **Clear separation**: Easy to see which layer you're importing from
3. **Refactor-friendly**: Moving files doesn't break imports
4. **Auto-complete**: Type `@api` to see all API imports
5. **Enforces architecture**: Hard to accidentally mix concerns

---

## Folder Structure

### Frontend Structure
```
frontend/src/
  api/              # TanStack Query (server state)
    queries/        # GET operations
    mutations/      # POST/PUT/DELETE operations
    client.ts       # Axios instance
    queryClient.ts  # TanStack Query config

  store/            # Redux (client state)
    slices/         # Feature slices
    hooks.ts        # Typed hooks
    index.ts        # Store config

  pages/            # Route pages
    login/
      index.tsx
      components/   # Page-specific components
      hooks/        # Page-specific hooks
      __tests__/
    dashboard/
      index.tsx
      components/
      hooks/
      __tests__/

  components/       # Shared components
    Button/
      Button.tsx
      __tests__/
    Modal/
      Modal.tsx
      __tests__/

  types/            # Shared TypeScript types
    user.ts
    task.ts
    common.ts

  hooks/            # Shared custom hooks
    useMediaQuery.ts
    useDebounce.ts

  utils/            # Utility functions
    date.ts
    string.ts
    validation.ts

  i18n/             # Internationalization
    config.ts
    locales/
      en/
      zh/
```

### Backend Structure
```
backend/
  routes/           # API route definitions
    auth.py
    tasks.py

  services/         # Business logic
    auth_service.py
    task_service.py

  models/           # Pydantic models
    user.py
    task.py

  ai/               # AI-specific code
    gemini_client.py
    evaluators.py

  db/               # Database
    connection.py

  dependencies/     # FastAPI dependencies
    auth.py
    database.py

  __tests__/        # Backend tests
```

---

## Import Order Convention

Organize imports in this order:

```typescript
// 1. React and external libraries
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// 2. Internal domain imports (grouped by domain)
import { useLogin } from '@api/mutations/useLogin';
import { useCurrentUser } from '@api/queries/useCurrentUser';

import Button from '@components/Button';
import Modal from '@components/Modal';

import { useAppDispatch } from '@store/hooks';
import { setCredentials } from '@store/slices/authSlice';

import { User } from '@types/user';

// 3. Relative imports (only for same-folder files)
import './styles.css';
```

---

## File Naming Conventions

### TypeScript/React Files
- **Components**: PascalCase - `Button.tsx`, `UserCard.tsx`
- **Hooks**: camelCase with `use` prefix - `useAuth.ts`, `useMediaQuery.ts`
- **Utils**: camelCase - `formatDate.ts`, `validateEmail.ts`
- **Types**: camelCase - `user.ts`, `task.ts`, `common.ts`
- **Pages**: camelCase folder, `index.tsx` - `login/index.tsx`

### Python Files
- **Routes**: snake_case - `auth.py`, `tasks.py`
- **Services**: snake_case with `_service` suffix - `auth_service.py`
- **Models**: snake_case - `user.py`, `task.py`

---

## When to Create New Folders

### Pages
Create new page folder when:
- Page has 3+ components specific to it
- Page has custom hooks
- Page needs its own types

### Components
Move to shared components/ when:
- Used in 2+ pages
- Reusable across features

### Hooks
Move to shared hooks/ when:
- Used in 2+ components/pages
- Generic functionality (not feature-specific)

### Types
Create new type file when:
- Type is used in 3+ files
- Represents a domain entity (User, Task, etc.)

---

## Examples

### Good Structure
```
pages/
  dashboard/
    index.tsx           # Main page
    components/
      TaskList.tsx      # Only used in dashboard
      StatsCard.tsx     # Only used in dashboard
    hooks/
      useDashboard.ts   # Dashboard-specific logic
```

### Bad Structure
```
pages/
  Dashboard.tsx         # 鉁?Everything in one file
  DashboardTaskList.tsx # 鉁?Should be in dashboard/components/
```

---

## Anti-Patterns to Avoid

### 鉁?Don't mix relative and alias imports
```typescript
// BAD - inconsistent
import { useLogin } from '@api/mutations/useLogin';
import Button from '../../components/Button';  // Why relative here?

// GOOD - all use aliases
import { useLogin } from '@api/mutations/useLogin';
import Button from '@components/Button';
```

### 鉁?Don't create deep nesting
```typescript
// BAD
src/features/auth/components/login/form/fields/EmailField.tsx

// GOOD
src/pages/login/components/EmailField.tsx
```

### 鉁?Don't use index.ts barrels everywhere
```typescript
// BAD - adds complexity
components/index.ts  // exports everything

// GOOD - import directly
import Button from '@components/Button';
```

Only use index.ts for:
- Page main entry point
- Store configuration
- API client setup
