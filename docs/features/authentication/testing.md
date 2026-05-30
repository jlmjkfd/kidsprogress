# Authentication System - Test Cases

## Test Coverage Summary
- [x] Unit Tests - Backend Auth Service (35 tests - 100% passing)
- [x] Unit Tests - Backend Auth Routes (40 tests - 100% passing)
- [x] Unit Tests - Frontend Auth Mutations (34 tests - 100% passing)
- [x] Unit Tests - Frontend Auth Components (49 tests - 100% passing)
- [ ] Integration Tests - Auth API
- [ ] Integration Tests - Token Refresh Flow
- [ ] E2E Tests - Complete Authentication Flows

**Total Tests: 158/158 (100% passing)**

## Test Files

### Backend Tests (75 tests)
- ✅ `backend/services/__tests__/test_auth_service.py` (35 tests)
- ✅ `backend/routes/__tests__/test_auth.py` (40 tests)

### Frontend API Tests (34 tests)
- ✅ `frontend/src/api/mutations/__tests__/useLogin.test.tsx` (4 tests)
- ✅ `frontend/src/api/mutations/__tests__/useRegister.test.tsx` (5 tests)
- ✅ `frontend/src/api/mutations/__tests__/useLogout.test.tsx` (4 tests)
- ✅ `frontend/src/api/mutations/__tests__/useSetParentPin.test.tsx` (5 tests)
- ✅ `frontend/src/api/mutations/__tests__/useVerifyParentPin.test.tsx` (5 tests)
- ✅ `frontend/src/api/mutations/__tests__/useRemoveParentPin.test.tsx` (5 tests)
- ✅ `frontend/src/api/queries/__tests__/useParentPinStatus.test.tsx` (6 tests)

### Frontend Component Tests (49 tests)
- ✅ `frontend/src/pages/login/__tests__/index.test.tsx` (10 tests)
- ✅ `frontend/src/pages/register/__tests__/index.test.tsx` (9 tests)
- ✅ `frontend/src/components/__tests__/ParentPinModal.test.tsx` (12 tests)
- ✅ `frontend/src/pages/parent-portal/settings/__tests__/ParentPinChangeModal.test.tsx` (11 tests)
- ✅ `frontend/src/pages/parent-portal/settings/__tests__/ParentPinRemoveModal.test.tsx` (6 tests)

### Test Infrastructure
- ✅ `frontend/src/test/setup.ts` (MSW server with auth & PIN endpoints)
- ✅ `frontend/src/test/utils.tsx` (Test utilities with Redux & React Query)
- ✅ `frontend/vitest.config.ts` (Path aliases for imports)

## Unit Tests

### Backend - Auth Service ✅ (backend/services/auth_service.py) - 35 tests

#### Password Management
- [x] `hash_password()` - Generates valid bcrypt hash
- [x] `verify_password()` - Verifies correct password
- [x] `verify_password()` - Rejects incorrect password
- [x] `verify_password()` - Handles empty password
- [x] `verify_password()` - Handles null password

#### Access Token Management
- [x] `create_access_token()` - Generates valid JWT for trusted device (7 days)
- [x] `create_access_token()` - Generates valid JWT for temporary device (30 min)
- [x] `create_access_token()` - Includes correct subject (email)
- [x] `create_access_token()` - Includes is_trusted flag
- [x] `create_access_token()` - Sets correct expiration time

#### Refresh Token Management
- [x] `create_refresh_token()` - Generates valid JWT with user_id
- [x] `create_refresh_token()` - Stores hashed token in database
- [x] `create_refresh_token()` - Sets trusted device expiration (30 days)
- [x] `create_refresh_token()` - Sets temporary device expiration (7 days)
- [x] `create_refresh_token()` - Returns unhashed token
- [x] `verify_refresh_token()` - Validates token and returns user_id
- [x] `verify_refresh_token()` - Validates is_trusted flag
- [x] `verify_refresh_token()` - Rejects expired token
- [x] `verify_refresh_token()` - Rejects revoked token (deleted from DB)
- [x] `verify_refresh_token()` - Rejects invalid signature
- [x] `revoke_refresh_token()` - Deletes token from database
- [x] `revoke_refresh_token()` - Handles non-existent token gracefully

#### Parent Portal PIN Management
- [x] `set_parent_pin()` - Hashes and stores PIN
- [x] `set_parent_pin()` - Validates PIN length (4-6 digits)
- [x] `set_parent_pin()` - Rejects non-numeric PIN
- [x] `verify_parent_pin()` - Verifies correct PIN
- [x] `verify_parent_pin()` - Rejects incorrect PIN
- [x] `verify_parent_pin()` - Handles user with no PIN set
- [x] `remove_parent_pin()` - Removes PIN from database
- [x] `check_parent_pin_exists()` - Returns true when PIN set
- [x] `check_parent_pin_exists()` - Returns false when no PIN

#### User Management
- [x] `get_user_by_email()` - Retrieves user by email
- [x] `get_user_by_email()` - Returns None for non-existent email
- [x] `create_user()` - Creates new user with hashed password
- [x] `create_user()` - Sets default language to "en"
- [x] `create_user()` - Rejects duplicate email

### Backend - Auth Routes ✅ (backend/routes/auth.py) - 40 tests

#### Registration Endpoint
- [x] `POST /api/auth/register` - Creates user successfully
- [x] `POST /api/auth/register` - Returns 400 for duplicate email
- [x] `POST /api/auth/register` - Returns 400 for invalid email format
- [x] `POST /api/auth/register` - Returns 400 for weak password
- [x] `POST /api/auth/register` - Returns access token
- [x] `POST /api/auth/register` - Sets refresh token cookie (httpOnly)

#### Login Endpoint
- [x] `POST /api/auth/login` - Returns tokens for valid credentials
- [x] `POST /api/auth/login` - Returns 401 for invalid email
- [x] `POST /api/auth/login` - Returns 401 for invalid password
- [x] `POST /api/auth/login` - Sets refresh token cookie (httpOnly)
- [x] `POST /api/auth/login` - Respects is_trusted_device flag (trusted)
- [x] `POST /api/auth/login` - Respects is_trusted_device flag (temporary)
- [x] `POST /api/auth/login` - Returns user info with language

#### Token Refresh Endpoint
- [x] `POST /api/auth/refresh` - Returns new access token
- [x] `POST /api/auth/refresh` - Requires refresh token cookie
- [x] `POST /api/auth/refresh` - Returns 401 for expired token
- [x] `POST /api/auth/refresh` - Returns 401 for revoked token
- [x] `POST /api/auth/refresh` - Preserves is_trusted flag

#### Logout Endpoint
- [x] `POST /api/auth/logout` - Revokes refresh token
- [x] `POST /api/auth/logout` - Clears refresh token cookie
- [x] `POST /api/auth/logout` - Requires authentication
- [x] `POST /api/auth/logout` - Returns 200 even if token already revoked

#### Current User Endpoint
- [x] `GET /api/auth/me` - Returns current user info
- [x] `GET /api/auth/me` - Requires valid JWT
- [x] `GET /api/auth/me` - Returns 401 for expired JWT
- [x] `GET /api/auth/me` - Returns 401 for invalid JWT

#### Parent PIN Endpoints
- [x] `POST /api/auth/parent-pin/set` - Sets PIN successfully
- [x] `POST /api/auth/parent-pin/set` - Updates existing PIN
- [x] `POST /api/auth/parent-pin/set` - Returns 400 for invalid PIN format
- [x] `POST /api/auth/parent-pin/verify` - Returns true for correct PIN
- [x] `POST /api/auth/parent-pin/verify` - Returns false for incorrect PIN
- [x] `POST /api/auth/parent-pin/verify` - Returns 400 if no PIN set
- [x] `DELETE /api/auth/parent-pin` - Removes PIN successfully
- [x] `DELETE /api/auth/parent-pin` - Returns 200 even if no PIN set
- [x] `GET /api/auth/parent-pin/status` - Returns true when PIN set
- [x] `GET /api/auth/parent-pin/status` - Returns false when no PIN

### Frontend - API Mutations ✅ (frontend/src/api/mutations/) - 34 tests

#### useLogin Hook (4 tests)
- [x] Sends correct request payload
- [x] Handles 401 error (invalid credentials)
- [x] Handles network error
- [x] Returns user data on success

#### useRegister Hook (5 tests)
- [x] Sends correct request payload
- [x] Returns access token and user data
- [x] Handles 400 error (duplicate email)
- [x] Validates email format
- [x] Validates password requirements

#### useLogout Hook (4 tests)
- [x] Calls logout endpoint
- [x] Clears tokens on success
- [x] Handles errors gracefully
- [x] Can logout even without token

#### useSetParentPin (5 tests)
- [x] Calls set endpoint with PIN
- [x] Invalidates PIN status query on success
- [x] Validates PIN format (4-6 digits)
- [x] Handles errors
- [x] Returns success message

#### useRemoveParentPin (5 tests)
- [x] Calls delete endpoint
- [x] Invalidates PIN status query on success
- [x] Handles errors
- [x] Works even if no PIN set
- [x] Returns success message

#### useVerifyParentPin (5 tests)
- [x] Calls verify endpoint with PIN
- [x] Returns verification result (true/false)
- [x] Handles correct PIN
- [x] Handles incorrect PIN
- [x] Handles errors

#### useParentPinStatus (6 tests)
- [x] Fetches PIN status (has_pin boolean)
- [x] Returns true when PIN exists
- [x] Returns false when no PIN
- [x] Respects enabled parameter
- [x] Uses correct query key
- [x] Caches results properly

### Frontend - Components (frontend/src/pages/login/, frontend/src/components/)

#### Login Page ✅ (10/10 tests)
- [x] Renders email and password inputs
- [x] Renders trusted device checkbox (checked by default)
- [x] Submits form with correct data
- [x] Shows loading state during login
- [x] Shows error message on login failure
- [x] Navigates to portal-selection on success
- [x] Stores tokens in localStorage
- [x] Allows toggling trusted device checkbox
- [x] Renders link to registration page

**Test file:** `frontend/src/pages/login/__tests__/index.test.tsx`

#### Register Page ✅ (9/9 tests)
- [x] Renders all required fields
- [x] Validates email format
- [x] Validates password strength
- [x] Shows loading state during registration
- [x] Shows error message on registration failure
- [x] Navigates to dashboard on success
- [x] Auto-logins after successful registration
- [x] Stores token in localStorage
- [x] Renders link to login page

**Test file:** `frontend/src/pages/register/__tests__/index.test.tsx`

#### ParentPinModal ✅ (12/12 tests)
- [x] Renders PIN input when open
- [x] Does not render when closed
- [x] Accepts only numeric input
- [x] Limits input to 6 characters
- [x] Calls verify mutation on submit
- [x] Shows error on incorrect PIN
- [x] Calls onSuccess callback on correct PIN
- [x] Allows cancellation
- [x] Clears PIN on close
- [x] Clears PIN after successful verification
- [x] Disables submit when PIN is less than 4 digits
- [x] Enables submit when PIN is 4-6 digits
- [x] Shows loading state during verification

**Test file:** `frontend/src/components/__tests__/ParentPinModal.test.tsx`

#### ParentPinChangeModal ✅ (11/11 tests)
- [x] Renders PIN and confirm PIN inputs when open
- [x] Does not render when closed
- [x] Shows check mark when PINs match
- [x] Validates PIN length (4-6 digits)
- [x] Calls set mutation on submit with matching PINs
- [x] Shows error if PINs do not match
- [x] Closes modal on successful PIN set
- [x] Allows cancellation
- [x] Shows different title when changing existing PIN
- [x] Accepts only numeric input
- [x] Shows loading state during submission

**Test file:** `frontend/src/pages/parent-portal/settings/__tests__/ParentPinChangeModal.test.tsx`

#### ParentPinRemoveModal ✅ (6/6 tests)
- [x] Renders warning message when open
- [x] Does not render when closed
- [x] Calls remove mutation on confirm
- [x] Closes modal on successful removal
- [x] Allows cancellation
- [x] Shows loading state during removal

**Test file:** `frontend/src/pages/parent-portal/settings/__tests__/ParentPinRemoveModal.test.tsx`

## Integration Tests

### Auth API Flow
- [ ] Complete registration → login → me endpoint
- [ ] Login → logout → me endpoint (should fail)
- [ ] Login (trusted) → wait 7 days → access token expires → auto-refresh
- [ ] Login (temporary) → wait 30 min → access token expires → auto-refresh
- [ ] Login → set PIN → verify PIN → remove PIN
- [ ] Multiple concurrent requests during token refresh (request queue)

### Token Refresh Flow
- [ ] Expired access token triggers auto-refresh
- [ ] Refresh returns new access token
- [ ] Original request retries with new token
- [ ] Multiple requests queue during refresh
- [ ] Failed refresh redirects to login

### Cookie Handling
- [ ] Refresh token set as httpOnly cookie
- [ ] Cookie sent automatically on refresh endpoint
- [ ] Cookie cleared on logout
- [ ] Cookie has correct expiration time

## E2E Tests

### Complete User Flows

#### New User Registration Flow
- [ ] Navigate to /register
- [ ] Fill in registration form
- [ ] Submit and wait for success
- [ ] Verify redirect to /portal-selection
- [ ] Verify user is authenticated

#### Returning User Login Flow
- [ ] Navigate to /login
- [ ] Fill in email and password
- [ ] Check "trusted device" checkbox
- [ ] Submit and wait for success
- [ ] Verify redirect to /portal-selection
- [ ] Verify device registration modal appears (if first time)

#### Logout and Login Flow
- [ ] Login as user
- [ ] Navigate to parent portal
- [ ] Click logout
- [ ] Verify redirect to appropriate page
- [ ] Verify cannot access protected routes
- [ ] Login again successfully

#### Parent Portal PIN Flow
- [ ] Login and navigate to settings
- [ ] Set parent portal PIN (4 digits)
- [ ] Navigate away from parent portal
- [ ] Click "Parent" button from child portal
- [ ] Verify PIN modal appears
- [ ] Enter incorrect PIN → see error
- [ ] Enter correct PIN → access granted
- [ ] Remove PIN in settings
- [ ] Verify no PIN prompt on next access

#### Trusted Device Flow
- [ ] Login with "trusted device" checked
- [ ] Verify device registration modal appears
- [ ] Register device with name
- [ ] Verify device appears in settings
- [ ] Logout
- [ ] Verify redirect to /child-selection (not /login)

#### Temporary Device Flow
- [ ] Login with "trusted device" unchecked
- [ ] Verify no device registration modal
- [ ] Navigate to settings → device management
- [ ] Attempt to register device
- [ ] Verify confirmation dialog appears
- [ ] Cancel → device not registered
- [ ] Try again and confirm → device registered

#### Token Auto-Refresh Flow
- [ ] Login with temporary device (30 min token)
- [ ] Mock time passing 31 minutes
- [ ] Make API request
- [ ] Verify token auto-refreshes
- [ ] Verify request succeeds

#### Session Expiration Flow
- [ ] Login
- [ ] Manually delete refresh token from database
- [ ] Wait for access token to expire
- [ ] Make API request
- [ ] Verify redirect to login page

## Test Files

### Backend
- `backend/services/__tests__/test_auth_service.py`
- `backend/routes/__tests__/test_auth.py`

### Frontend
- `frontend/src/api/mutations/__tests__/useLogin.test.ts`
- `frontend/src/api/mutations/__tests__/useRegister.test.ts`
- `frontend/src/api/mutations/__tests__/useLogout.test.ts`
- `frontend/src/api/mutations/__tests__/useSetParentPin.test.ts`
- `frontend/src/pages/login/__tests__/index.test.tsx`
- `frontend/src/pages/register/__tests__/index.test.tsx`
- `frontend/src/components/__tests__/ParentPinModal.test.tsx`

### E2E
- `e2e/tests/auth-registration.spec.ts`
- `e2e/tests/auth-login.spec.ts`
- `e2e/tests/auth-logout.spec.ts`
- `e2e/tests/parent-pin.spec.ts`
- `e2e/tests/device-registration.spec.ts`
- `e2e/tests/token-refresh.spec.ts`

## Edge Cases & Known Issues

### Edge Cases to Test
- [ ] Login with email containing special characters
- [ ] Login with very long password (100+ chars)
- [ ] Rapid login/logout cycles
- [ ] Multiple tabs with same user logged in
- [ ] Token refresh while logout in progress
- [ ] Browser refresh during login
- [ ] Network interruption during token refresh
- [ ] Expired refresh token in cookie
- [ ] Malformed JWT token
- [ ] PIN with leading zeros (e.g., "0123")

### Known Issues
- None documented yet

### Security Tests
- [ ] Cannot access protected routes without token
- [ ] Expired tokens are rejected
- [ ] Refresh tokens are stored as bcrypt hashes
- [ ] Parent PIN is stored as bcrypt hash
- [ ] httpOnly cookie not accessible via JavaScript
- [ ] CORS configured correctly for cookies
- [ ] Refresh token revocation works immediately
