---
name: testing
description: Testing conventions for KidsProgress: Vitest + Testing Library for frontend, Playwright for e2e, pytest for backend. Where tests live, what to mock, coverage expectations. Use when writing or updating tests, or before marking a feature complete.
---

# Testing Guidelines

## Test Documentation Structure

### Organizing Test Cases in Dev Docs

**IMPORTANT: Before writing tests, ensure feature documentation is up-to-date.**

Test cases should be organized alongside feature documentation:

```
docs/
  features/
    [feature-name]/
      context.md          # Feature overview, APIs, components
      plan.md             # Implementation plan
      tasks.md            # Task tracking
      testing.md          # 鈫?Test cases and coverage
```

### Test Documentation Template

Create `docs/features/[feature-name]/testing.md` for each feature:

```markdown
# [Feature Name] - Test Cases

## Test Coverage Summary
- [ ] Unit Tests
- [ ] Integration Tests
- [ ] E2E Tests
- [ ] Edge Cases

## Unit Tests

### Frontend Components
- [ ] Component renders correctly
- [ ] Handles user interactions
- [ ] Displays error states
- [ ] Validates input

### Backend Services
- [ ] Service methods return expected data
- [ ] Error handling works correctly
- [ ] Validation logic is correct
- [ ] Database operations succeed

## Integration Tests

### API Endpoints
- [ ] POST /api/endpoint - Creates resource
- [ ] GET /api/endpoint - Retrieves resource
- [ ] PUT /api/endpoint - Updates resource
- [ ] DELETE /api/endpoint - Deletes resource

### Frontend-Backend Integration
- [ ] API calls succeed with correct data
- [ ] Error responses handled properly
- [ ] Loading states work correctly

## E2E Tests

### User Flows
- [ ] User can complete primary workflow
- [ ] User can handle error scenarios
- [ ] User sees appropriate feedback

## Test Files

### Frontend
- `frontend/src/components/[Component]/__tests__/[Component].test.tsx`
- `frontend/src/pages/[page]/__tests__/index.test.tsx`
- `frontend/src/api/__tests__/[hook].test.ts`

### Backend
- `backend/services/__tests__/test_[service].py`
- `backend/routes/__tests__/test_[route].py`

### E2E
- `e2e/tests/[feature].spec.ts`

## Edge Cases & Known Issues
- List any edge cases to test
- Document known issues or limitations
```

### Testing Workflow

**Before Writing Tests:**

1. **Check feature documentation exists:**
   ```
   docs/features/[feature-name]/context.md
   docs/features/[feature-name]/plan.md
   ```

2. **Update feature docs if outdated:**
   - Review context.md - ensure APIs, components, file locations are current
   - Review plan.md - mark completed tasks
   - Update any changed implementation details

3. **Create testing.md if it doesn't exist:**
   - Use the template above
   - List all test cases for the feature
   - Track test completion status

4. **Write tests according to the test plan:**
   - Follow the test cases in testing.md
   - Check off completed tests
   - Add notes for edge cases discovered

**Example: Authentication Feature Testing**

```
docs/features/authentication/
  鈹溾攢鈹€ context.md          # Updated with latest auth flow
  鈹溾攢鈹€ plan.md             # All tasks marked complete
  鈹溾攢鈹€ tasks.md            # Historical task tracking
  鈹斺攢鈹€ testing.md          # 鈫?Create this for test cases

testing.md content:
# Authentication - Test Cases

## Test Coverage Summary
- [x] Unit Tests - Login service
- [x] Unit Tests - Token refresh
- [ ] E2E Tests - Login flow
- [ ] E2E Tests - Device registration

## Unit Tests

### Frontend
- [x] LoginPage renders form correctly
- [x] LoginPage submits credentials
- [x] LoginPage shows error on invalid credentials
- [x] DeviceRegistrationModal registers device

### Backend
- [x] AuthService.create_access_token() generates valid JWT
- [x] AuthService.verify_refresh_token() validates token
- [x] POST /api/auth/login returns tokens
- [x] POST /api/auth/refresh refreshes access token

## E2E Tests
- [ ] User can login with valid credentials
- [ ] User sees error with invalid credentials
- [ ] User stays logged in after refresh (trusted device)
- [ ] User can register device after login

## Test Files
- frontend/src/pages/login/__tests__/index.test.tsx
- frontend/src/api/__tests__/useLogin.test.ts
- backend/services/__tests__/test_auth_service.py
- backend/routes/__tests__/test_auth.py
- e2e/tests/auth.spec.ts
```

## Test Structure
```
frontend/src/
  components/
    Button/
      Button.tsx
      __tests__/
        Button.test.tsx
  pages/
    users/
      __tests__/
        index.test.tsx

backend/
  services/
    user_service.py
    __tests__/
      test_user_service.py

e2e/
  tests/
    auth.spec.ts
    users.spec.ts
```

## Frontend Testing (Jest)

### Unit Test Template
```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should render correctly', () => {
    // Test
  });

  it('should handle user interaction', () => {
    // Test
  });
});
```

### React Component Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Testing TanStack Query
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useUsers } from './useUsers';

describe('useUsers', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should fetch users successfully', async () => {
    const { result } = renderHook(() => useUsers(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(3);
  });
});
```

### Testing Redux
```typescript
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import uiReducer, { toggleSidebar } from './uiSlice';

describe('uiSlice', () => {
  it('should toggle sidebar', () => {
    const store = configureStore({ reducer: { ui: uiReducer } });

    expect(store.getState().ui.sidebarOpen).toBe(true);
    store.dispatch(toggleSidebar());
    expect(store.getState().ui.sidebarOpen).toBe(false);
  });
});
```

### Mocking
```typescript
// Mock API client
jest.mock('@/api/client', () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: [] }),
    post: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

// Mock hooks
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '1' }, isAuthenticated: true }),
}));

// Spy on functions
const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
// ... test
spy.mockRestore();
```

## Backend Testing (Python)

### Test Template
```python
import pytest
from services.user_service import UserService
from models.user import User

@pytest.fixture
def user_service():
    return UserService()

@pytest.fixture
def sample_user():
    return {
        "name": "Test User",
        "email": "test@example.com"
    }

class TestUserService:
    async def test_get_user_by_id(self, user_service):
        user = await user_service.get_by_id("123")
        assert user.name == "Test User"
        assert user.email == "test@example.com"

    async def test_get_user_not_found(self, user_service):
        with pytest.raises(HTTPException) as exc_info:
            await user_service.get_by_id("invalid")
        assert exc_info.value.status_code == 404
```

### Testing FastAPI Routes
```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_users():
    response = client.get("/api/users")
    assert response.status_code == 200
    assert isinstance(response.json()["data"], list)

def test_create_user():
    response = client.post(
        "/api/users",
        json={"name": "Test", "email": "test@example.com"}
    )
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Test"
```

### Mocking Database
```python
import pytest
from unittest.mock import AsyncMock, MagicMock

@pytest.fixture
def mock_db():
    db = MagicMock()
    db.users.find_one = AsyncMock(return_value={
        "_id": "123",
        "name": "Test User",
        "email": "test@example.com"
    })
    return db

async def test_get_user(mock_db):
    service = UserService(db=mock_db)
    user = await service.get_by_id("123")
    assert user.name == "Test User"
```

## E2E Testing (Playwright)

### Test Template
```typescript
import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should login successfully', async ({ page }) => {
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should display error on invalid credentials', async ({ page }) => {
    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrong');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toBeVisible();
  });
});
```

### Page Object Model
```typescript
// e2e/pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('[name="email"]', email);
    await this.page.fill('[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  async getErrorMessage() {
    return this.page.locator('.error-message').textContent();
  }
}

// Usage
test('should login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('test@example.com', 'password');
  await expect(page).toHaveURL('/dashboard');
});
```

## Coverage Requirements
- **Frontend**: >80% coverage
- **Backend**: >80% coverage
- **Critical paths**: 100% coverage
- **E2E**: Key user flows must be covered

## Test Naming

```typescript
// 鉁?Descriptive test names
it('should display error message when login fails', () => {});
test('should redirect to dashboard after successful login', async () => {});

// 鉁?Vague names
it('works', () => {});
it('test login', () => {});
```

## Async Testing

```typescript
// Frontend
it('should load data on mount', async () => {
  render(<UserProfile userId="123" />);
  await screen.findByText('John Doe');
  expect(screen.getByText('john@example.com')).toBeInTheDocument();
});

// Backend
async def test_async_operation():
    result = await some_async_function()
    assert result is not None
```

## Test Data

```typescript
// Frontend fixtures
export const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
};

function createMockUser(overrides = {}) {
  return { ...mockUser, ...overrides };
}

// Backend fixtures
@pytest.fixture
def sample_user():
    return {
        "name": "Test User",
        "email": "test@example.com"
    }
```

## Common Testing Mistakes & Rules

### Critical Rules (Learn from Past Mistakes)

**1. Database Port Configuration**
- 鉂?**MISTAKE**: Using default MongoDB port (27017) in tests when production uses different port
- 鉁?**RULE**: Always check `.env` file for actual database port before writing test fixtures
- 鉁?**RULE**: Use the same port across all test files (service tests, route tests, conftest.py)
- **Example**: If production uses `MONGO_URI=mongodb://localhost:27016`, ALL tests must use port 27016

**2. Async/Await with FastAPI Route Tests**
- 鉂?**MISTAKE**: Using `TestClient` (sync) with async fixtures causes event loop conflicts
- 鉁?**RULE**: Use `httpx.AsyncClient` for testing FastAPI routes with async database operations
- 鉁?**RULE**: Make test fixtures async (`@pytest_asyncio.fixture`) when they perform async operations
- 鉁?**RULE**: Make test methods async and add `@pytest.mark.asyncio` decorator to test classes
- **Example**:
  ```python
  # 鉂?Wrong - TestClient with async DB
  @pytest.fixture
  def client(test_app, test_db):
      with TestClient(test_app) as c:
          yield c

  # 鉁?Correct - AsyncClient with async DB
  @pytest_asyncio.fixture
  async def client(test_app, test_db):
      async with AsyncClient(app=test_app, base_url="http://test") as c:
          yield c

  # 鉁?Test methods must be async
  @pytest.mark.asyncio
  class TestAuth:
      async def test_login(self, client):
          response = await client.post("/login", json={...})
          assert response.status_code == 200
  ```

**3. Python Module Imports in Tests**
- 鉂?**MISTAKE**: Using `from services.auth_service import ...` when package structure requires `backend.` prefix
- 鉁?**RULE**: If production code uses `from backend.services...`, tests must import the same way
- 鉁?**RULE**: Add root `conftest.py` to configure Python path: `sys.path.insert(0, str(parent_dir))`
- **Example**:
  ```python
  # backend/conftest.py (root level)
  import sys
  from pathlib import Path
  backend_root = Path(__file__).parent
  parent_dir = backend_root.parent
  sys.path.insert(0, str(parent_dir))

  # Now tests can import with backend. prefix
  from backend.services.auth_service import AuthService
  ```

**4. Datetime Timezone Comparisons**
- 鉂?**MISTAKE**: Comparing timezone-naive and timezone-aware datetime objects
- 鉁?**RULE**: Strip timezone info from both datetimes before comparison: `.replace(tzinfo=None)`
- 鉁?**RULE**: When using `datetime.fromtimestamp()`, explicitly set `tz=None` to get naive datetime
- **Example**:
  ```python
  # 鉂?Wrong - mixing naive and aware
  exp_time = datetime.fromtimestamp(payload["exp"])
  expected_exp = utcnow() + timedelta(days=7)  # utcnow() returns aware
  assert exp_time == expected_exp  # TypeError!

  # 鉁?Correct - both naive
  exp_time = datetime.fromtimestamp(payload["exp"], tz=None)
  expected_exp = utcnow().replace(tzinfo=None) + timedelta(days=7)
  assert abs((exp_time - expected_exp).total_seconds()) < 10
  ```

**5. Test Database Isolation**
- 鉁?**RULE**: Use unique database name for tests (e.g., `test_kidsprogress_routes`)
- 鉁?**RULE**: Always clean up test database in fixture teardown: `await client.drop_database(test_db_name)`
- 鉁?**RULE**: Create necessary indexes in test fixtures before running tests
- **Example**:
  ```python
  @pytest_asyncio.fixture(scope="function")
  async def test_db():
      client = AsyncIOMotorClient("mongodb://localhost:27016")  # Correct port!
      db = client["test_kidsprogress"]

      # Create indexes
      await db.users.create_index("email", unique=True)

      yield db

      # Cleanup
      await client.drop_database("test_kidsprogress")
      client.close()
  ```

**6. Dependency Injection in FastAPI Tests**
- 鉁?**RULE**: Override dependencies BEFORE creating test client
- 鉁?**RULE**: Use `app.dependency_overrides[dependency] = mock_dependency`
- 鉁?**RULE**: Clear overrides after tests: `app.dependency_overrides.clear()`
- 鉁?**RULE**: Mock dependencies must match original signature (async vs sync)
- **Example**:
  ```python
  @pytest_asyncio.fixture
  async def client(test_app, test_db):
      # Override MUST be async to match get_db signature
      async def override_get_db():
          return test_db

      test_app.dependency_overrides[get_db] = override_get_db

      async with AsyncClient(app=test_app, base_url="http://test") as c:
          yield c

      test_app.dependency_overrides.clear()
  ```

**7. Test Configuration Checklist**

Before running tests, verify:
- [ ] Correct database port in ALL test fixtures
- [ ] Root conftest.py exists with proper sys.path configuration
- [ ] AsyncClient used for route tests (not TestClient)
- [ ] All test methods are async with @pytest.mark.asyncio
- [ ] All imports use correct module prefix (backend. if needed)
- [ ] Datetime comparisons strip timezone info
- [ ] Test database has unique name and cleanup
- [ ] Dependency overrides match original signatures

## Running Tests

```bash
# Frontend unit tests
npm run test

# Frontend with coverage
npm run test:coverage

# Backend tests
cd backend && pytest

# Backend with coverage
cd backend && pytest --cov

# E2E tests
npx playwright test

# E2E with UI
npx playwright test --ui
```
