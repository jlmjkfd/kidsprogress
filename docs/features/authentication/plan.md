# Feature: Authentication System

## Goal
Implement basic authentication with user registration and login for MVP.

## Requirements
- [x] User registration with email and password
- [x] User login with JWT tokens
- [x] Password hashing with bcrypt
- [x] Token-based session management
- [x] Auth state management in Redux
- [x] Protected route support

## Technical Approach

### Frontend
- Redux slice for auth state (token, user info)
- TanStack Query mutations for register/login API calls
- Login/Register pages with form validation
- Axios interceptor for JWT token injection
- Route protection with auth check

### Backend
- FastAPI routes: POST /api/auth/register, POST /api/auth/login
- Pydantic models: User, UserCreate, UserLogin, Token
- Service layer: password hashing, JWT token generation
- MongoDB Motor for async user operations
- JWT with python-jose, password hashing with passlib

### Database Changes
Users collection with fields:
- _id (ObjectId)
- email (unique index)
- hashed_password
- full_name
- role (parent/child)
- created_at
- updated_at

## Architecture Decisions

### Decision: Redux for auth vs TanStack Query
**Context**: Need to store JWT token and user session
**Choice**: Redux for auth state, TanStack Query for API calls
**Rationale**: Token needs to persist across pages, fits client state definition. TanStack Query handles API mutations.

### Decision: JWT storage location
**Context**: Where to store JWT token
**Choice**: Redux state (in-memory), not localStorage
**Rationale**: More secure for MVP. Can add refresh token in localStorage later.

## Dependencies
- Backend: motor, python-jose, passlib, pydantic-settings
- Frontend: @reduxjs/toolkit, @tanstack/react-query, axios

## Testing Strategy
- Unit tests: Password hashing, JWT generation
- Integration tests: Register/login endpoints
- Manual: Registration flow, login flow, protected routes

## Security Considerations
- Passwords hashed with bcrypt (12 rounds)
- JWT with expiration (30 minutes)
- Email validation
- HTTPS only in production

## Performance Considerations
- MongoDB index on email field
- JWT verification is fast (symmetric key)

## Timeline Estimate
4-6 hours
