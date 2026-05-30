# Context: Authentication System

## File Locations

### Backend
```
backend/
  db/
    connection.py          # MongoDB Motor connection
  models/
    user.py               # User Pydantic models
  services/
    auth_service.py       # Auth business logic
  routes/
    auth.py              # Auth endpoints
  dependencies/
    database.py          # DB dependency
    auth.py             # Auth dependency
  main.py               # FastAPI app with auth routes
```

### Frontend
```
frontend/src/
  types/
    user.ts             # User types
  store/
    slices/
      authSlice.ts      # Auth Redux slice (client state)
    hooks.ts            # Typed hooks
    index.ts            # Store config
  api/
    client.ts           # Axios client with interceptor
    queryClient.ts      # TanStack Query config
    mutations/
      useLogin.ts       # Login mutation
      useRegister.ts    # Register mutation
    queries/
      useCurrentUser.ts # Current user query
  pages/
    login/index.tsx     # Login page
    register/index.tsx  # Register page
  App.tsx              # Routes with protection
```

## Key Implementation Details

### Backend
- Motor for async MongoDB operations
- JWT tokens with 30-minute expiration
- Bcrypt for password hashing
- Email uniqueness enforced via MongoDB index
- FastAPI dependency injection for auth

### Frontend
- Redux stores token + user (client state)
- TanStack Query handles API calls (server state)
- Token stored in localStorage and Redux
- Axios interceptor injects JWT automatically
- Protected routes with auth check

## API Endpoints
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user
- GET /api/auth/me - Get current user (protected)

## Testing
Manual testing completed:
- Registration flow
- Login flow
- Protected route access
- Token persistence
