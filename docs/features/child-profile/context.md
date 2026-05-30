# Context: Child Profile & PIN Verification

## Current State

### Existing Code
- Dashboard: Parent can select children from grid
- Child API: Backend has GET endpoint for individual child profiles
- PIN verification: Backend endpoint for verifying child PINs

### File Locations
```
frontend/src/
  pages/child-profile/index.tsx                           # Child profile page
  pages/child-profile/components/PinVerificationModal.tsx # PIN modal component
  api/queries/useChild.ts                                 # Single child query hook
  api/mutations/useVerifyChildPin.ts                      # PIN verification mutation hook
  types/child.ts                                          # Child type definitions
  i18n/locales/en/common.json                             # Profile translations
  i18n/locales/zh/common.json                             # Profile translations (Chinese)
  i18n/locales/en/errors.json                             # Error translations
  i18n/locales/zh/errors.json                             # Error translations (Chinese)
  App.tsx                                                 # Route: /child/:childId

backend/
  routes/children.py                 # Child routes including GET /{child_id} and POST /{child_id}/verify-pin
  services/child_service.py          # Child service with verify_child_pin method
  models/child.py                    # Child model
```

## Available Resources

### Reusable Components
- `PinVerificationModal`: Modal dialog for PIN entry and verification

### Existing APIs
- `GET /api/children/{id}`: Get specific child profile (ownership verified)
- `POST /api/children/{child_id}/verify-pin`: Verify child's PIN
  - Request: `{ pin: string }`
  - Response: `{ valid: boolean }`

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

## Related Features
- Dashboard & Child Selection: [docs/features/dashboard/](../dashboard/)
- Authentication: [docs/features/authentication/](../authentication/)

## Key Technical Decisions
- Child profile shows basic information: name, age (calculated from date_of_birth), avatar, join date, last updated
- **Age calculated dynamically** from `date_of_birth` using `calculateAge()` utility
- PIN verification implemented as blocking modal for protected children
  - Modal appears automatically when accessing PIN-protected child profile
  - User must verify PIN or cancel to return to dashboard
  - PIN verification uses session state (not persisted)
- Profile page uses route parameter `/child/:childId`
- Ownership verified on backend before returning child data
- Icons used instead of emojis (following project guidelines)
- Profile page includes placeholder for future activity tracking feature
- Navigation includes back button to dashboard in header
