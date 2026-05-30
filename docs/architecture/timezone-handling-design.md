# Timezone Handling - Comprehensive Design

> **Date**: 2025-12-11
> **Status**: 📋 DESIGN PROPOSAL
> **Goal**: Automatic timezone handling using device/browser timezone

---

## Current State Analysis

### Frontend (Correct ✅)
- Uses browser's local timezone via `new Date()`
- Sends dates in ISO format: `"2025-12-15T00:00:00"` (naive, no TZ info)
- Calendar uses local dates to avoid timezone issues (line 58 in TaskCalendar.tsx)

### Backend (Inconsistent ❌)
- Some code uses `date.today()` (server timezone, likely UTC)
- Some code uses `datetime.now(timezone.utc)` (UTC)
- New code uses `get_local_today()` (hardcoded to Pacific/Auckland)
- **No way to detect user's actual timezone**

---

## Problem Statement

**Goal**: Timezone should be the same as the device setting (user's real place). If user travels to another country, use another timezone automatically.

**Current Issues**:
1. Backend doesn't know user's timezone
2. Hardcoded to Pacific/Auckland
3. Won't work for users outside NZ
4. Won't work when user travels

---

## Solution Design

### Option 1: Send Timezone in HTTP Header (RECOMMENDED)

**Flow**:
```
Browser (NZ):
  - Detects timezone: "Pacific/Auckland" (via Intl.DateTimeFormat)
  - Sends header: X-Timezone: Pacific/Auckland

Backend:
  - Reads header from request
  - Uses that timezone for all date operations
  - Returns dates in that timezone
```

**Pros**:
- ✅ Automatic detection from browser
- ✅ Works when user travels (browser auto-updates)
- ✅ No database changes needed
- ✅ Works per-request (handles multiple users/devices)

**Cons**:
- ❌ Need to modify all API endpoints to accept timezone
- ❌ Need middleware/dependency injection

---

### Option 2: Store Timezone in User Profile

**Flow**:
```
User registration/settings:
  - Detect browser timezone
  - Save to user.timezone field

Backend:
  - Read from user.timezone
  - Use for all date operations
```

**Pros**:
- ✅ Simple backend logic
- ✅ User can override if needed

**Cons**:
- ❌ Doesn't auto-update when user travels
- ❌ Requires database migration
- ❌ User must update manually when traveling

---

### Option 3: Hybrid Approach (BEST)

**Flow**:
```
1. Frontend sends timezone in header: X-Timezone: Pacific/Auckland
2. Backend reads header
3. If user has timezone preference in profile, use that instead
4. Fallback to header timezone
5. Final fallback: UTC
```

**Pros**:
- ✅ Automatic when traveling (header updates)
- ✅ User can override if needed (profile setting)
- ✅ Graceful fallbacks

**Cons**:
- ❌ Most complex to implement

---

## Recommended Implementation (Option 1 - HTTP Header)

### Phase 1: Frontend Changes

#### 1. Add Timezone to API Client

**File**: `frontend/src/api/client.ts`

```typescript
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ✅ ADD: Detect and send user's timezone
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      config.headers['X-Timezone'] = timezone;
    } catch (error) {
      // Fallback to UTC if detection fails
      config.headers['X-Timezone'] = 'UTC';
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

**How it works**:
- `Intl.DateTimeFormat().resolvedOptions().timeZone` detects browser timezone
- Returns IANA timezone name: `"Pacific/Auckland"`, `"America/New_York"`, etc.
- Automatically updates when user travels (browser detects new timezone)
- Works on all modern browsers (IE11+)

#### 2. Helper Function (Optional)

**File**: `frontend/src/utils/timezone.ts`

```typescript
/**
 * Get user's current timezone from browser
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Failed to detect timezone, using UTC');
    return 'UTC';
  }
}

/**
 * Get current local date in user's timezone
 */
export function getLocalToday(): Date {
  return new Date();
}

/**
 * Format date for API (YYYY-MM-DD)
 */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

---

### Phase 2: Backend Changes

#### 1. Create Timezone Context/Dependency

**File**: `backend/utils/timezone_context.py`

```python
"""Timezone context for request-scoped timezone handling."""
from contextvars import ContextVar
from datetime import date, datetime
from zoneinfo import ZoneInfo
from typing import Optional

# Request-scoped timezone storage
_request_timezone: ContextVar[Optional[str]] = ContextVar('request_timezone', default=None)


def set_request_timezone(tz: str):
    """Set timezone for current request context.

    Args:
        tz: IANA timezone string (e.g., 'Pacific/Auckland')
    """
    _request_timezone.set(tz)


def get_request_timezone() -> str:
    """Get timezone for current request context.

    Returns:
        IANA timezone string, defaults to 'UTC'
    """
    return _request_timezone.get() or 'UTC'


def get_local_today() -> date:
    """Get today's date in user's timezone.

    Uses timezone from request context (set via X-Timezone header).

    Returns:
        Today's date in user's local timezone
    """
    tz_str = get_request_timezone()
    try:
        tz = ZoneInfo(tz_str)
        return datetime.now(tz).date()
    except Exception:
        # Fallback to UTC
        return datetime.utcnow().date()


def get_local_now() -> datetime:
    """Get current datetime in user's timezone.

    Returns:
        Timezone-aware datetime in user's local timezone
    """
    tz_str = get_request_timezone()
    try:
        tz = ZoneInfo(tz_str)
        return datetime.now(tz)
    except Exception:
        # Fallback to UTC
        from datetime import timezone
        return datetime.now(timezone.utc)
```

#### 2. Create FastAPI Dependency

**File**: `backend/dependencies/timezone.py`

```python
"""FastAPI dependency for timezone injection."""
from fastapi import Header
from backend.utils.timezone_context import set_request_timezone


async def inject_timezone(x_timezone: str = Header(default="UTC")):
    """Inject timezone from request header into context.

    Args:
        x_timezone: Timezone from X-Timezone header
    """
    set_request_timezone(x_timezone)
    return x_timezone
```

#### 3. Apply Middleware Globally

**File**: `backend/main.py`

```python
from backend.utils.timezone_context import set_request_timezone

@app.middleware("http")
async def timezone_middleware(request: Request, call_next):
    """Extract timezone from header and set in context."""
    timezone = request.headers.get("X-Timezone", "UTC")
    set_request_timezone(timezone)

    response = await call_next(request)
    return response
```

#### 4. Update datetime_utils.py

**File**: `backend/utils/datetime_utils.py`

```python
"""Datetime utility functions."""
from datetime import datetime, timezone, date
from zoneinfo import ZoneInfo


def utcnow() -> datetime:
    """Get current UTC time as timezone-aware datetime."""
    return datetime.now(timezone.utc)


def get_local_today(tz: str = None) -> date:
    """Get today's date in specified timezone.

    Args:
        tz: Timezone string. If None, uses request context timezone.

    Returns:
        Today's date in the specified timezone
    """
    if tz is None:
        # Use request context timezone
        from backend.utils.timezone_context import get_request_timezone
        tz = get_request_timezone()

    try:
        local_tz = ZoneInfo(tz)
        return datetime.now(local_tz).date()
    except Exception:
        # Fallback to UTC
        return datetime.now(timezone.utc).date()


def get_local_now(tz: str = None) -> datetime:
    """Get current datetime in specified timezone.

    Args:
        tz: Timezone string. If None, uses request context timezone.

    Returns:
        Timezone-aware datetime
    """
    if tz is None:
        # Use request context timezone
        from backend.utils.timezone_context import get_request_timezone
        tz = get_request_timezone()

    try:
        local_tz = ZoneInfo(tz)
        return datetime.now(local_tz)
    except Exception:
        # Fallback to UTC
        return datetime.now(timezone.utc)
```

---

## Usage Examples

### Frontend

```typescript
// Timezone automatically sent in all API requests
const today = new Date();  // Browser's local time
const dateStr = formatDateForAPI(today);  // "2025-12-11"

// Send to API - header X-Timezone automatically added
await apiClient.post('/api/tasks', {
  scheduled_date: dateStr  // Backend will interpret in user's timezone
});
```

### Backend

```python
from backend.utils.datetime_utils import get_local_today, get_local_now

# In any endpoint - automatically uses user's timezone from header
async def get_overdue_tasks(child_id: str, user: User = Depends(...)):
    today = get_local_today()  # User's local date
    # If user in NZ: Dec 11
    # If user traveled to US: Dec 11 US time
    # If user in UK: Dec 11 UK time

    overdue_tasks = await crud.get_overdue_tasks(child_id, today)
    return overdue_tasks
```

---

## Migration Plan

### Step 1: Frontend (1 hour)
1. Add timezone header to apiClient interceptor
2. Test that header is sent
3. Deploy frontend

### Step 2: Backend - Middleware (2 hours)
1. Create timezone_context.py
2. Add middleware to main.py
3. Test context works

### Step 3: Update datetime_utils (1 hour)
1. Modify get_local_today() to use context
2. Test all date operations

### Step 4: Update All Date Usage (3-4 hours)
Files to update:
- `backend/services/task_service/crud.py`
- `backend/services/task_service/queries/specifications.py`
- `backend/jobs/daily_task_generator.py`
- `backend/ai/context_builder.py`
- Any other files using `date.today()`

### Step 5: Testing (2 hours)
- Test with different timezones
- Test overdue tasks across timezones
- Test task creation/completion

---

## Benefits

1. ✅ **Automatic**: No user configuration needed
2. ✅ **Travels with user**: Updates when user changes location
3. ✅ **Per-request**: Different users can have different timezones simultaneously
4. ✅ **Fallback**: Gracefully falls back to UTC if detection fails
5. ✅ **Simple**: One header, one middleware, consistent API

---

## Testing Scenarios

### Scenario 1: User in New Zealand
```
Browser: Pacific/Auckland (UTC+13)
Header: X-Timezone: Pacific/Auckland
Backend: get_local_today() → Dec 11, 2025 (NZ time)
```

### Scenario 2: User Travels to USA
```
Browser: America/New_York (UTC-5) ← Auto-detected!
Header: X-Timezone: America/New_York
Backend: get_local_today() → Dec 10, 2025 (US time)
```

### Scenario 3: Multiple Users Simultaneously
```
Request 1: X-Timezone: Pacific/Auckland → Returns Dec 11
Request 2: X-Timezone: Europe/London → Returns Dec 10
Each request isolated via ContextVar!
```

---

## Alternatives Considered

### Why not store dates in UTC?
- Dates are inherently timezone-less (there's no "UTC date")
- "Dec 10" means different things in different timezones
- Better to work in user's local timezone throughout

### Why not use UTC everywhere?
- Confusing for users ("It's Dec 11 but system shows Dec 10")
- Need timezone conversion anyway
- This approach is clearer

---

**Recommendation**: Implement Option 1 (HTTP Header) for automatic, travel-friendly timezone handling.

**Status**: Ready for implementation

**Estimated Time**: 8-10 hours total
