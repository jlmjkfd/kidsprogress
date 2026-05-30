# Device Management Implementation Plan

## Overview
Device management allows parents to register family devices so children can access the child portal without requiring parent login. Registered devices are identified by a UUID stored in localStorage.

## Current State
- Device token utility exists ([deviceToken.ts](frontend/src/utils/deviceToken.ts))
- Device registration modal UI exists ([DeviceRegistrationModal.tsx](frontend/src/components/DeviceRegistrationModal.tsx))
- Backend has device registration endpoints (TODO: verify)
- Login flow prompts for device registration if trusted device checkbox is checked

## Missing Pieces

### Backend (Python/FastAPI)
1. **Database Models** (backend/models/device.py)
   - DeviceRegistration model:
     - `_id`: PyObjectId
     - `user_id`: PyObjectId (parent who owns the device)
     - `device_token`: str (UUID from frontend)
     - `device_name`: str (user-friendly name)
     - `child_ids`: List[PyObjectId] (children who can access on this device)
     - `created_at`: datetime
     - `last_used_at`: datetime
     - `is_active`: bool

2. **API Endpoints** (backend/routes/device.py)
   - `POST /api/devices/register` - Register a new device
     - Input: device_token, device_name, child_ids
     - Output: DeviceRegistration
   - `GET /api/devices` - List all registered devices for current user
     - Output: List[DeviceRegistration]
   - `GET /api/devices/{device_token}` - Get device by token
     - Output: DeviceRegistration
   - `PUT /api/devices/{device_token}` - Update device (rename, change child access)
     - Input: device_name?, child_ids?
     - Output: DeviceRegistration
   - `DELETE /api/devices/{device_token}` - Unregister device
     - Output: success message

3. **Service Layer** (backend/services/device_service.py)
   - `register_device(user_id, device_token, device_name, child_ids)` - Create device registration
   - `get_user_devices(user_id)` - Get all devices for a user
   - `get_device_by_token(device_token)` - Verify device registration
   - `update_device(device_token, updates)` - Update device info
   - `deactivate_device(device_token)` - Soft delete device
   - `update_last_used(device_token)` - Track device usage

### Frontend (React/TypeScript)

1. **API Mutations** (frontend/src/api/mutations/)
   - `useRegisterDevice.ts` - Register new device
   - `useUpdateDevice.ts` - Update device info
   - `useRemoveDevice.ts` - Unregister device

2. **API Queries** (frontend/src/api/queries/)
   - `useDevices.ts` - Fetch user's registered devices
   - `useDeviceByToken.ts` - Check if current device is registered

3. **Type Definitions** (frontend/src/types/device.ts)
   ```typescript
   export interface Device {
     _id: string;
     user_id: string;
     device_token: string;
     device_name: string;
     child_ids: string[];
     created_at: string;
     last_used_at: string;
     is_active: boolean;
   }

   export interface DeviceRegistration {
     device_token: string;
     device_name: string;
     child_ids: string[];
   }

   export interface DeviceUpdate {
     device_name?: string;
     child_ids?: string[];
   }
   ```

4. **Settings Page Updates** (frontend/src/pages/parent-portal/settings/)
   - Create `DeviceManagementSection.tsx` component
   - List all registered devices with:
     - Device name
     - Registration date
     - Last used date
     - Children with access
     - Edit and Remove buttons
   - Create `DeviceEditModal.tsx` - Edit device name and child access
   - Update DeviceRegistrationModal to call API

5. **i18n Translations** (frontend/src/i18n/locales/)
   - Add device management strings to `common.json`:
     ```json
     "device_list": {
       "title": "Registered Devices",
       "no_devices": "No devices registered",
       "device_name": "Device Name",
       "registered": "Registered",
       "last_used": "Last Used",
       "children_access": "Children with Access",
       "edit": "Edit",
       "remove": "Remove",
       "current_device": "This Device"
     }
     ```

### Route Guards & Auth Flow

1. **Child Portal Access Check**
   - Update child portal route guard to check:
     - If JWT exists and valid → Allow (logged in parent)
     - If device_token exists and registered → Allow (child on trusted device)
     - Else → Redirect to login

2. **Device Registration Flow**
   - After parent login with "trusted device" checked:
     - Check if device already registered
     - If not → Show DeviceRegistrationModal
     - Modal calls `useRegisterDevice` mutation
     - On success → Navigate to portal-selection

## Implementation Order

### Phase 1: Backend Foundation
1. Create device model in `backend/models/device.py`
2. Create device service in `backend/services/device_service.py`
3. Create device routes in `backend/routes/device.py`
4. Register routes in main app
5. Create database indexes for device_token (unique)

### Phase 2: Frontend API Integration
1. Create device type definitions
2. Create API mutation hooks (register, update, remove)
3. Create API query hooks (list devices, check device)
4. Update DeviceRegistrationModal to call register API
5. Add i18n translations

### Phase 3: Settings Page UI
1. Create DeviceManagementSection component
2. Create DeviceEditModal component
3. Integrate into settings page
4. Test device list, edit, and remove flows

### Phase 4: Route Guards
1. Update child portal route guard to check device registration
2. Update child selection page to show different UI for device vs JWT access
3. Test access flows for both scenarios

## Security Considerations

1. **Device Token Validation**
   - Device tokens should be UUIDs (crypto.randomUUID())
   - Stored in localStorage (can be cleared)
   - Backend should validate token format

2. **Child Access Control**
   - Only children explicitly added to device can access
   - Device registration requires parent authentication
   - Parent can revoke device access at any time

3. **Device Limits** (Optional)
   - Consider limiting number of devices per user (e.g., 5-10 devices)
   - Implement soft delete (is_active flag) to track device history

4. **Session Security**
   - Device access doesn't provide parent portal access (JWT required)
   - Device token only grants child portal access
   - Parent PIN still required to access parent portal from child pages

## Testing Checklist

### Backend Tests
- [ ] Device registration with valid data
- [ ] Device registration with duplicate token
- [ ] List devices for user
- [ ] Update device name and child access
- [ ] Remove device
- [ ] Verify device exists by token
- [ ] Update last_used timestamp

### Frontend Tests
- [ ] Device registration modal flow
- [ ] Device list displays correctly
- [ ] Edit device updates data
- [ ] Remove device shows confirmation
- [ ] Route guard allows device access
- [ ] Route guard blocks unregistered device

### Integration Tests
- [ ] Full registration flow from login
- [ ] Child access on registered device
- [ ] Parent can manage devices in settings
- [ ] Device removal blocks child access
- [ ] Multiple devices can be registered
