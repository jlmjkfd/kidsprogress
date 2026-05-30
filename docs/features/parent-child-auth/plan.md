# Feature: Parent-Child Authentication System

## Goal
Enable parents to create child profiles with optional PINs, allowing kids to use devices independently while maintaining proper access control.

## Requirements
- [x] Parent can create multiple child profiles
- [x] Each child has optional 4-digit PIN
- [x] Device registration for "remember this device"
- [x] Child selection screen (multi-kid support)
- [x] Kids can switch between each other without parent
- [x] Kids can go back to child selection (no PIN required)
- [x] Parent portal requires parent authentication

## User Flows

### Flow 1: Parent Creates Child Profiles
1. Parent logs in with email/password
2. Goes to "Manage Children" page
3. Adds child: name, age, avatar, optional PIN
4. Saves child profile

### Flow 2: Device Setup (One-time)
1. Parent logs in on child's device
2. Clicks "Setup This Device"
3. Selects which children use this device
4. System stores device registration
5. Parent logs out

### Flow 3: Daily Kid Usage
1. Kid opens app → sees "Who's learning today?"
2. Shows avatars of all registered children
3. Kid taps their avatar
   - If no PIN: Goes directly to kid portal
   - If PIN enabled: Enter PIN → kid portal
4. Kid uses app
5. Kid clicks "Switch User" → back to selection (no PIN)

### Flow 4: Parent Access from Kid's Device
1. Small "Parent" button in corner
2. Requires parent password (not PIN)
3. Parent can view all kids' progress
4. Parent can manage settings

## Technical Approach

### Backend Changes

**New Models:**
```python
Child {
  _id: ObjectId
  parent_id: ObjectId          # Reference to parent
  name: str
  age: int
  avatar_url: str
  pin_required: bool = False   # Optional PIN toggle
  pin_hash: str | None         # 4-digit PIN (hashed)
  created_at: datetime
}

DeviceRegistration {
  _id: ObjectId
  device_token: str            # Unique device ID (UUID)
  parent_id: ObjectId
  child_ids: List[ObjectId]    # Multiple kids can use device
  device_name: str             # "Emma's iPad"
  registered_at: datetime
}
```

**New Endpoints:**
```
POST /api/children              # Create child profile
GET  /api/children              # List parent's children
PUT  /api/children/{id}         # Update child (name, PIN, etc.)
DELETE /api/children/{id}       # Delete child

POST /api/devices/register      # Register device with children
GET  /api/devices/{token}       # Get device info
GET  /api/devices/{token}/children  # Get children for device

POST /api/auth/child-login      # Child login with optional PIN
GET  /api/auth/child-session    # Get current child session
POST /api/auth/switch-child     # Switch to another child (no auth)
```

### Frontend Changes

**New Pages:**
```
pages/
  parent-portal/
    children/
      index.tsx               # Manage children page
      CreateChildModal.tsx
      EditChildModal.tsx
    dashboard/
      index.tsx               # Parent dashboard

  child-selection/
    index.tsx                 # "Who's learning today?"
    ChildCard.tsx

  child-pin-entry/
    index.tsx                 # PIN entry for child

  child-portal/
    dashboard/
      index.tsx               # Child dashboard
    tasks/
      index.tsx               # Child tasks view
```

**State Management:**
```typescript
// Redux (client state)
auth: {
  token: string
  parent: User | null
  activeChild: Child | null    // Currently selected child
  sessionType: 'parent' | 'child'
}

// Device storage (localStorage)
{
  deviceToken: string
  parentId: string
  registeredChildren: Child[]
}
```

### Database Schema

**Update User Model:**
- Keep current User model for parents
- Add role field if not exists

**Add Child Collection:**
```javascript
db.children.createIndex({ parent_id: 1 })
db.children.createIndex({ parent_id: 1, name: 1 })
```

**Add DeviceRegistration Collection:**
```javascript
db.device_registrations.createIndex({ device_token: 1 }, { unique: true })
db.device_registrations.createIndex({ parent_id: 1 })
```

## Architecture Decisions

### Decision 1: PIN Optional, Not Required
**Context:** Some parents want PIN protection, others don't
**Choice:** Make PIN optional per child
**Rationale:** Flexibility for different family needs. Young kids may not need PINs.

### Decision 2: Device Token in localStorage
**Context:** How to identify "this is Emma's tablet"
**Choice:** Generate UUID on device registration, store in localStorage
**Rationale:** Simple, works offline, no cookies needed

### Decision 3: Switch User Without PIN
**Context:** Should kids need PIN to switch between siblings?
**Choice:** No PIN required to go back to selection or switch
**Rationale:** They're already on a trusted device. PIN is just for initial entry.

### Decision 4: Parent Password Required (Not PIN)
**Context:** How does parent access portal from kid's device?
**Choice:** Require full parent password
**Rationale:** More secure than parent PIN. Settings changes are sensitive.

## Dependencies
- Backend: Current auth system (JWT, password hashing)
- Frontend: Current Redux + TanStack Query setup
- New: Device token generation (crypto.randomUUID())

## Testing Strategy
- Unit tests: Child CRUD, device registration
- Integration tests: Child login flow, parent access
- Manual: Full flow on actual device

## Security Considerations
- Child PINs hashed with bcrypt (same as passwords)
- Device token is UUID (hard to guess)
- Parent password required for sensitive actions
- Child sessions isolated (can't access siblings' data)
- Rate limiting on PIN attempts (5 tries → lock)

## Performance Considerations
- Device token lookup is fast (indexed)
- Child list cached in localStorage
- No extra API calls on app open (uses cached device data)

## Timeline Estimate
- Backend: 3-4 hours
- Frontend: 4-5 hours
- Testing: 1-2 hours
**Total: 8-11 hours** (1-2 days)

## Implementation Order
1. Backend models (Child, DeviceRegistration)
2. Backend endpoints (CRUD children, device registration)
3. Child login endpoint (with optional PIN)
4. Frontend: Manage children page
5. Frontend: Device setup flow
6. Frontend: Child selection page
7. Frontend: Child dashboard
8. i18n translations
9. Testing
