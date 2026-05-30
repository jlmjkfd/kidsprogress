# Context: Dashboard & Child Selection

## Current State

### Existing Code
- Auth system: Parent authentication with JWT tokens
- Child API: Backend CRUD for child profiles
- Child models: Backend has Child, ChildCreate models with parent_id linking

### File Locations
```
frontend/src/
  pages/dashboard/index.tsx                      # Dashboard page
  pages/dashboard/components/AddChildModal.tsx   # Add child modal form
  api/queries/useChildren.ts                     # Children query hook
  api/mutations/useCreateChild.ts                # Create child mutation hook
  types/child.ts                                 # Child type definitions
  i18n/locales/en/common.json                    # Dashboard translations
  i18n/locales/zh/common.json                    # Dashboard translations
  i18n/locales/en/errors.json                    # Error translations
  i18n/locales/zh/errors.json                    # Error translations

backend/
  routes/children.py                 # Child CRUD routes
  services/child_service.py          # Child service
  models/child.py                    # Child model
```

## Available Resources

### Reusable Components
- `LanguageSwitcher`: frontend/src/components/LanguageSwitcher.tsx - Language toggle component

### Existing APIs
- `GET /api/children`: Returns array of children for authenticated parent
- `POST /api/children`: Create new child profile
- `GET /api/children/{id}`: Get specific child
- `PUT /api/children/{id}`: Update child
- `DELETE /api/children/{id}`: Delete child

### Shared Types
```typescript
// frontend/src/types/child.ts
interface Child {
  _id: string;
  parent_id: string;
  name: string;
  date_of_birth: string; // ISO date string (YYYY-MM-DD)
  avatar_url?: string;
  pin_required: boolean;
  created_at: string;
  updated_at: string;
}

// Utility function to calculate age from date of birth
function calculateAge(dateOfBirth: string): number
```

### Test Scripts
- `backend/scripts/seed_test_data.py` creates 3 test children (Alice, Bob, Charlie)

## Related Features
- Authentication system: docs/features/authentication/
- Parent-child auth: docs/features/parent-child-auth/

## Key Technical Decisions
- Child selection navigates to `/child/:childId` route (child profile page)
- Add Child implemented as modal dialog with form validation
- Modal includes: name, date of birth (date picker), optional PIN protection with conditional PIN input
- **Age calculated dynamically** from `date_of_birth` using `calculateAge()` utility - ensures age stays current as time passes
- Using grid layout for responsive child cards (1 col mobile, 2 col tablet, 3 col desktop)
- Avatars use fallback IconUser if no avatar_url
- PIN protection shown as visual indicator only (lock icon)
- TanStack Query automatically refetches children list after creation (query invalidation on success)
