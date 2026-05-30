# Authentication System

## Overview

KidsProgress uses a **dual authentication system**:
1. **Parent Authentication**: JWT with refresh tokens (device-aware expiration)
2. **Child Authentication**: Device registration (passwordless for trusted devices)

---

## 1. Parent Authentication (JWT + Refresh Tokens)

### Token Types

| Token Type | Purpose | Storage | Expiration |
|------------|---------|---------|------------|
| **Access Token** | API authentication | localStorage | Trusted: 7 days<br>Temporary: 30 min |
| **Refresh Token** | Auto-refresh access token | httpOnly cookie | Trusted: 30 days<br>Temporary: 7 days |

### Device Trust Levels

#### **Trusted Device** (Personal/Family Device)
- Checkbox **checked** on login: "This is my personal/family device"
- **Long token duration**: 7 days access, 30 days refresh
- **Auto-prompt** for device registration after login
- **Use case**: Family tablet, parent's phone

#### **Temporary Device** (Public/Shared Device)
- Checkbox **unchecked** on login
- **Short token duration**: 30 min access, 7 days refresh
- **No auto-prompt** for device registration
- **Manual registration** requires confirmation dialog
- **Use case**: Public computer, friend's device

---

## 2. Parent Portal PIN

### Purpose
Optional 4-6 digit PIN for quick access to Parent Portal on **trusted devices**.

### Behavior
- **All devices**: PIN prompt before entering Parent Portal (if set)
- **Untrusted devices**: PIN still required (in addition to login password)
- **Storage**: User model (`parent_portal_pin_hash`)

### Endpoints
- `POST /api/auth/parent-pin/set` - Set/update PIN
- `POST /api/auth/parent-pin/verify` - Verify PIN
- `DELETE /api/auth/parent-pin` - Remove PIN
- `GET /api/auth/parent-pin/status` - Check if PIN is set

---

## 3. Device Registration (Child Access)

### Purpose
Allow children to access their portal on trusted devices **without parent login**.

### How It Works

1. **Parent registers device** (in Parent Portal → Settings → Device Management)
2. **Device gets UUID** (`device_token` stored in localStorage)
3. **Children linked to device** (parent selects which children)
4. **Children can login** with device_token + optional child PIN

### Device Token Flow

```
App Start
├─ Check localStorage for device_token
├─ If exists → GET /api/devices/{device_token}/children
│   └─ Show child selection page
└─ If not exists → Show login page
```

### Child Login Endpoint
`POST /api/auth/child-login`

**Request:**
```json
{
  "device_token": "uuid-here",
  "child_id": "child-object-id",
  "pin": "1234"  // Optional, only if child has PIN
}
```

**Response:** Child profile

---

## 4. Refresh Token Flow

### Login Flow
```
1. User logs in with email/password + is_trusted_device flag
2. Backend creates:
   - Access token (JWT with email in "sub")
   - Refresh token (JWT with user_id in "sub", stored in DB)
3. Backend returns:
   - access_token in response body
   - refresh_token in httpOnly cookie
4. Frontend stores access_token in localStorage
```

### Auto-Refresh Flow
```
1. Frontend API call gets 401 Unauthorized
2. Frontend sends POST /api/auth/refresh (cookie auto-sent)
3. Backend:
   - Verifies refresh token from cookie
   - Checks token exists in database (not revoked)
   - Creates new access token
4. Backend returns new access_token
5. Frontend retries original request with new token
```

### Logout Flow
```
1. User clicks logout
2. Frontend sends POST /api/auth/logout
3. Backend:
   - Revokes refresh token (deletes from DB)
   - Clears refresh_token cookie
4. Frontend:
   - Clears access_token from localStorage
   - Redirects based on device_token:
     - Exists → /child-selection
     - Not exists → /login
```

---

## 5. API Endpoints

### Authentication

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/register` | No | Register new parent |
| POST | `/api/auth/login` | No | Login parent (returns access + refresh tokens) |
| POST | `/api/auth/refresh` | Cookie | Refresh access token |
| POST | `/api/auth/logout` | JWT | Logout and revoke refresh token |
| GET | `/api/auth/me` | JWT | Get current user info |
| POST | `/api/auth/child-login` | No | Login child on registered device |

### Parent Portal PIN

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/parent-pin/set` | JWT | Set/update parent portal PIN |
| POST | `/api/auth/parent-pin/verify` | JWT | Verify parent portal PIN |
| DELETE | `/api/auth/parent-pin` | JWT | Remove parent portal PIN |
| GET | `/api/auth/parent-pin/status` | JWT | Check if PIN is set |

### Device Management

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/devices/register` | JWT | Register device |
| GET | `/api/devices/{device_token}` | No | Get device info |
| GET | `/api/devices/{device_token}/children` | No | Get children on device |
| GET | `/api/devices` | JWT | Get all parent's devices |

---

## 6. Frontend Implementation

### Device Token Generation

```typescript
// On app start
function getOrCreateDeviceToken(): string {
  let deviceToken = localStorage.getItem('device_token');
  if (!deviceToken) {
    deviceToken = crypto.randomUUID();
    localStorage.setItem('device_token', deviceToken);
  }
  return deviceToken;
}
```

### Login with Trust Flag

```typescript
const login = async (email: string, password: string, isTrustedDevice: boolean) => {
  const response = await apiClient.post('/api/auth/login', {
    email,
    password,
    is_trusted_device: isTrustedDevice
  });

  // access_token in response body
  // refresh_token in httpOnly cookie (auto-stored by browser)
  localStorage.setItem('auth_token', response.data.access_token);
};
```

### Auto-Refresh Interceptor

```typescript
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Try to refresh token
      const refreshResponse = await apiClient.post('/api/auth/refresh');
      const newToken = refreshResponse.data.access_token;

      localStorage.setItem('auth_token', newToken);

      // Retry original request
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return apiClient.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

## 7. Database Schema

### User Collection
```json
{
  "_id": ObjectId,
  "email": "parent@example.com",
  "hashed_password": "bcrypt-hash",
  "full_name": "John Doe",
  "language": "en",
  "parent_portal_pin_hash": "bcrypt-hash",  // Optional
  "created_at": ISODate,
  "updated_at": ISODate
}
```

### Refresh Tokens Collection
```json
{
  "_id": ObjectId,
  "user_id": ObjectId,
  "token": "bcrypt-hash-of-jwt",
  "is_trusted_device": true,
  "created_at": ISODate,
  "expires_at": ISODate
}
```

**Indexes:**
- `user_id` (for fast lookup)
- `expires_at` (TTL index for auto-deletion)

### Device Registration Collection
```json
{
  "_id": ObjectId,
  "device_token": "uuid",
  "parent_id": ObjectId,
  "device_name": "Family iPad",
  "child_ids": [ObjectId, ObjectId],
  "registered_at": ISODate,
  "last_used_at": ISODate
}
```

**Indexes:**
- `device_token` (unique)
- `parent_id`

---

## 8. Security Considerations

### Access Token
- **Stored in**: localStorage (vulnerable to XSS)
- **Mitigation**: Short expiration (7 days max)
- **HttpOnly**: No (needed for API calls)

### Refresh Token
- **Stored in**: httpOnly cookie (protected from XSS)
- **Mitigation**: Can only be accessed by backend
- **Revocable**: Stored in database, can be deleted

### Parent Portal PIN
- **Storage**: Bcrypt hash in user collection
- **Purpose**: Convenience, not primary security
- **Not a replacement**: For login password

### Device Token
- **Storage**: localStorage (UUID, not sensitive)
- **Purpose**: Device identification only
- **No secrets**: Does not grant access alone

---

## 9. Environment Variables

```bash
# JWT Configuration
JWT_SECRET="your-secret-key-change-in-production"
JWT_ALGORITHM="HS256"

# Token Expiration (Trusted Devices)
ACCESS_TOKEN_TRUSTED_DAYS=7
REFRESH_TOKEN_TRUSTED_DAYS=30

# Token Expiration (Temporary Devices)
ACCESS_TOKEN_TEMP_MINUTES=30
REFRESH_TOKEN_TEMP_DAYS=7
```

---

## 10. Testing Checklist

### Parent Login
- [ ] Login with trusted device → 7 day token
- [ ] Login with temporary device → 30 min token
- [ ] Refresh token auto-refresh works
- [ ] Logout clears tokens and redirects correctly

### Parent Portal PIN
- [ ] Set PIN successfully
- [ ] PIN prompt appears before entering parent portal
- [ ] Correct PIN grants access
- [ ] Incorrect PIN shows error
- [ ] Remove PIN works

### Device Registration
- [ ] Auto-prompt appears on trusted device after login
- [ ] Can register device manually in settings
- [ ] Confirmation dialog shows on untrusted device registration
- [ ] Device appears in device management list

### Child Access
- [ ] Children can select themselves on registered device
- [ ] Child PIN verification works
- [ ] Child cannot access on unregistered device without parent login
- [ ] Warning message shows on temporary device
