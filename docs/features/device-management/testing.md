# Device Management Testing

## Overview
Complete test coverage for device management feature including backend services, API routes, frontend API hooks, and UI components.

## Test Summary

### Backend Tests (53 tests - 100% passing ✅)

#### Device Service Tests (30 tests)
**File**: [backend/services/__tests__/test_device_service.py](../../../backend/services/__tests__/test_device_service.py)

**Coverage**:
- Device registration (5 tests)
  - Register device with children successfully
  - Register device with duplicate token (should fail)
  - Register device with invalid child_id (should fail)
  - Register device with empty child list
  - Register device updates last_used_at timestamp

- Device retrieval (5 tests)
  - Get device by token
  - Get device by non-existent token (should return None)
  - Get children for device
  - Get children for device with no children
  - Get parent's devices

- Device updates (6 tests)
  - Update device name
  - Update device children list
  - Update both name and children
  - Update non-existent device (should fail)
  - Update device by wrong parent (should fail)
  - Update device with invalid child_id (should fail)

- Device removal (4 tests)
  - Remove device (soft delete)
  - Verify device is inactive after removal
  - Remove non-existent device (should fail)
  - Remove device by wrong parent (should fail)

- Edge cases (10 tests)
  - Multiple devices for same parent
  - Get devices for parent with no devices
  - Get children for unregistered device
  - Update last_used timestamp
  - Verify device registration fields
  - Verify parent_id association
  - Handle empty child_ids list
  - Verify timestamps are ISO format
  - Test device activation status
  - Test child_id validation

#### Device Routes Tests (23 tests)
**File**: [backend/routes/__tests__/test_devices.py](../../../backend/routes/__tests__/test_devices.py)

**Test Pattern**: Uses async `AsyncClient` with authenticated fixtures

**Coverage**:
- Registration endpoint (5 tests)
  - Register device successfully (201)
  - Register with duplicate token (should handle gracefully)
  - Register with invalid child_id (400)
  - Register with empty children list (201)
  - Unauthorized registration (403)

- Get device info endpoint (3 tests)
  - Get device by token (200)
  - Get non-existent device (404)
  - Public endpoint (no auth required)

- Get device children endpoint (3 tests)
  - Get children for device (200)
  - Get children for unregistered device (404)
  - Public endpoint (no auth required)

- Get my devices endpoint (4 tests)
  - Get all devices for authenticated parent (200)
  - Get devices returns correct format
  - Get devices when none registered (empty array)
  - Unauthorized request (403)

- Update device endpoint (4 tests)
  - Update device name (200)
  - Update device children (200)
  - Update non-existent device (404)
  - Update with invalid child_id (400)

- Remove device endpoint (4 tests)
  - Remove device successfully (204)
  - Verify soft delete (is_active=false)
  - Remove non-existent device (404)
  - Unauthorized removal (403)

### Frontend Tests (58 tests - 100% passing ✅)

#### API Mutation Hooks (18 tests)

**useRegisterDevice** (5 tests)
**File**: [frontend/src/api/mutations/__tests__/useRegisterDevice.test.tsx](../../../frontend/src/api/mutations/__tests__/useRegisterDevice.test.tsx)
- Register device successfully
- Send correct request payload
- Invalidate devices query on success
- Handle registration error
- Register device with empty children list

**useUpdateDevice** (7 tests)
**File**: [frontend/src/api/mutations/__tests__/useUpdateDevice.test.tsx](../../../frontend/src/api/mutations/__tests__/useUpdateDevice.test.tsx)
- Update device name successfully
- Update device children successfully
- Update both name and children
- Send correct request payload
- Invalidate devices query on success
- Handle update error
- Handle not found error

**useRemoveDevice** (6 tests)
**File**: [frontend/src/api/mutations/__tests__/useRemoveDevice.test.tsx](../../../frontend/src/api/mutations/__tests__/useRemoveDevice.test.tsx)
- Remove device successfully
- Send correct device token
- Invalidate devices query on success
- Handle removal error
- Handle not found error
- Handle unauthorized error

#### API Query Hooks (13 tests)

**useDevices** (6 tests)
**File**: [frontend/src/api/queries/__tests__/useDevices.test.tsx](../../../frontend/src/api/queries/__tests__/useDevices.test.tsx)
- Fetch devices successfully
- Return empty array when no devices
- Handle fetch error
- Not fetch when enabled is false
- Use correct query key
- Include all device fields

**useDeviceByToken** (7 tests)
**File**: [frontend/src/api/queries/__tests__/useDeviceByToken.test.tsx](../../../frontend/src/api/queries/__tests__/useDeviceByToken.test.tsx)
- Fetch device by token successfully
- Handle device not found
- Not fetch when token is null
- Not fetch when enabled is false
- Use correct query key with token
- Fetch different devices with different tokens
- Handle server error

#### Component Tests (27 tests)

**DeviceRegistrationModal** (14 tests)
**File**: [frontend/src/components/__tests__/DeviceRegistrationModal.test.tsx](../../../frontend/src/components/__tests__/DeviceRegistrationModal.test.tsx)
- Not render when isOpen is false
- Render registration form when isOpen is true
- Auto-select all children by default
- Toggle child selection
- Call onClose when skip button clicked
- Call onClose when X button clicked
- Register device with custom name on trusted device
- Use default device name if not provided
- Disable register button when no children selected
- Show confirmation dialog on untrusted device
- Allow canceling confirmation on untrusted device
- Proceed with registration after confirmation on untrusted device
- Show loading state during registration
- Call onClose on successful registration

**DeviceManagementSection** (13 tests)
**File**: [frontend/src/pages/parent-portal/settings/__tests__/DeviceManagementSection.test.tsx](../../../frontend/src/pages/parent-portal/settings/__tests__/DeviceManagementSection.test.tsx)
- Render loading state
- Render device list
- Display no devices message when empty
- Mark current device
- Display children names for device
- Format dates correctly
- Open edit modal when edit button clicked
- Close edit modal
- Open remove modal when remove button clicked
- Close remove modal
- Filter inactive devices
- Handle no children names gracefully
- Show message when device has no children

## Key Testing Patterns

### Backend Testing
```python
# Async test with authenticated client
@pytest.mark.asyncio
class TestDeviceRegistration:
    async def test_register_device_success(self, authenticated_client, test_children):
        response = await authenticated_client.post(
            "/api/devices/register",
            json={
                "device_token": "new-device-uuid",
                "device_name": "Family iPad",
                "child_ids": [str(child["_id"]) for child in test_children],
            },
        )
        assert response.status_code == 201
```

### Frontend Hook Testing
```typescript
// React Query hook test with MSW
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

it('should register device successfully', async () => {
  server.use(
    http.post('http://localhost:8000/api/devices/register', async ({ request }) => {
      const body = await request.json()
      return HttpResponse.json({ ...mockDevice })
    })
  )

  const { result } = renderHook(() => useRegisterDevice(), {
    wrapper: createWrapper(),
  })

  result.current.mutate({ device_token: '...', device_name: '...', child_ids: [...] })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
})
```

### Frontend Component Testing
```typescript
// Component test with mocked hooks
vi.mock('@api/queries/useChildren')
vi.mock('@api/mutations/useRegisterDevice')

beforeEach(() => {
  vi.mocked(useChildren).mockReturnValue({
    data: mockChildren,
    isLoading: false,
  } as any)

  vi.mocked(useRegisterDevice).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  } as any)
})

it('should register device with custom name', async () => {
  render(<DeviceRegistrationModal isOpen={true} onClose={mockOnClose} isTrustedDevice={true} />)

  fireEvent.change(screen.getByLabelText(/device_name_label/i), {
    target: { value: 'Family iPad' }
  })
  fireEvent.click(screen.getByText(/register_button/i))

  expect(mockMutate).toHaveBeenCalledWith(
    expect.objectContaining({ device_name: 'Family iPad' }),
    expect.any(Object)
  )
})
```

## Test Execution

### Backend Tests
```bash
# Run all device tests
./backend/.venv/Scripts/python.exe -m pytest backend/services/__tests__/test_device_service.py backend/routes/__tests__/test_devices.py -v

# Run service tests only
./backend/.venv/Scripts/python.exe -m pytest backend/services/__tests__/test_device_service.py -v

# Run route tests only
./backend/.venv/Scripts/python.exe -m pytest backend/routes/__tests__/test_devices.py -v
```

### Frontend Tests
```bash
# Run all device tests
npm test -- src/api/mutations/__tests__/useRegisterDevice.test.tsx \
  src/api/mutations/__tests__/useUpdateDevice.test.tsx \
  src/api/mutations/__tests__/useRemoveDevice.test.tsx \
  src/api/queries/__tests__/useDevices.test.tsx \
  src/api/queries/__tests__/useDeviceByToken.test.tsx \
  src/components/__tests__/DeviceRegistrationModal.test.tsx \
  src/pages/parent-portal/settings/__tests__/DeviceManagementSection.test.tsx

# Run API tests only
npm test -- src/api/mutations/__tests__/use*.test.tsx src/api/queries/__tests__/use*.test.tsx

# Run component tests only
npm test -- src/components/__tests__/DeviceRegistrationModal.test.tsx \
  src/pages/parent-portal/settings/__tests__/DeviceManagementSection.test.tsx
```

## Issues Encountered and Resolved

### Backend Issues

**Issue 1: Sync TestClient with Async Operations**
- **Error**: Event loop conflicts, 10/24 tests failing
- **Fix**: Completely rewrote tests to use `AsyncClient` from `httpx` with async test methods
- **Pattern**: Use `authenticated_client` and `client` fixtures from `conftest.py`

**Issue 2: Wrong create_user() Signature**
- **Error**: `TypeError: got an unexpected keyword argument 'email'`
- **Fix**: Use `UserCreate` model instead of keyword arguments

**Issue 3: Wrong create_access_token() Signature**
- **Error**: `TypeError: got an unexpected keyword argument 'subject'`
- **Fix**: Pass dict with 'sub' key: `{"sub": user.email}`

**Issue 4: Soft Delete Pattern**
- **Error**: Expected 404 after delete, got 200
- **Fix**: Device removal is soft delete (sets `is_active=false`), verified by checking database directly

### Frontend Issues

**Issue 1: Multiple Wrappers Causing Query Isolation**
- **Error**: Parallel hook renders with separate wrappers didn't share cache
- **Fix**: Use single shared QueryClient wrapper for tests requiring shared state

**Issue 2: Multiple Text Matches**
- **Error**: `TestingLibraryElementError: Found multiple elements with text /Alice/i`
- **Fix**: Use more specific text match (e.g., "Alice, Bob" instead of just "Alice")

## Coverage Analysis

### Backend Coverage
- ✅ All service methods tested
- ✅ All API endpoints tested
- ✅ Authentication requirements tested
- ✅ Error cases tested
- ✅ Edge cases tested
- ✅ Soft delete pattern tested

### Frontend Coverage
- ✅ All mutation hooks tested
- ✅ All query hooks tested
- ✅ Main device components tested
- ✅ Query invalidation tested
- ✅ Error handling tested
- ✅ Loading states tested
- ✅ User interactions tested

## Test Results

### Final Test Count
- **Backend**: 53/53 tests passing (100%)
  - Device Service: 30/30
  - Device Routes: 23/23
- **Frontend**: 58/58 tests passing (100%)
  - API Mutations: 18/18
  - API Queries: 13/13
  - Components: 27/27
- **Total**: 111/111 tests passing (100%)

## Related Documentation
- [Device Management Plan](./plan.md)
- [API Registry](../../api-registry.md)
