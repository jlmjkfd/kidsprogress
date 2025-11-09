import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DeviceManagementSection from '../DeviceManagementSection'
import * as useDevicesModule from '@api/queries/useDevices'
import * as useChildrenModule from '@api/queries/useChildren'
import * as deviceTokenModule from '@/utils/deviceToken'

// Mock modules
vi.mock('@api/queries/useDevices')
vi.mock('@api/queries/useChildren')
vi.mock('@/utils/deviceToken')
vi.mock('../DeviceEditModal', () => ({
  default: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="edit-modal" onClick={onClose}>Edit Modal</div> : null,
}))
vi.mock('../DeviceRemoveModal', () => ({
  default: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="remove-modal" onClick={onClose}>Remove Modal</div> : null,
}))

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

describe('DeviceManagementSection', () => {
  const mockDevices = [
    {
      _id: 'device-1',
      device_token: 'uuid-1',
      device_name: 'Family iPad',
      child_ids: ['child-1', 'child-2'],
      registered_at: '2024-01-01T00:00:00Z',
      last_used_at: '2024-01-02T00:00:00Z',
      is_active: true,
    },
    {
      _id: 'device-2',
      device_token: 'uuid-2',
      device_name: 'Living Room Tablet',
      child_ids: ['child-1'],
      registered_at: '2024-01-03T00:00:00Z',
      last_used_at: '2024-01-04T00:00:00Z',
      is_active: true,
    },
  ]

  const mockChildren = [
    { _id: 'child-1', name: 'Alice', date_of_birth: '2015-01-01' },
    { _id: 'child-2', name: 'Bob', date_of_birth: '2017-06-15' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useDevicesModule.useDevices).mockReturnValue({
      data: mockDevices,
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    vi.mocked(useChildrenModule.useChildren).mockReturnValue({
      data: mockChildren,
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    vi.mocked(deviceTokenModule.getDeviceToken).mockReturnValue('uuid-1')
  })

  it('should render loading state', () => {
    vi.mocked(useDevicesModule.useDevices).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any)

    render(<DeviceManagementSection />, { wrapper: createWrapper() })

    expect(screen.getByText(/common:loading/i)).toBeInTheDocument()
  })

  it('should render device list', () => {
    render(<DeviceManagementSection />, { wrapper: createWrapper() })

    expect(screen.getByText('Family iPad')).toBeInTheDocument()
    expect(screen.getByText('Living Room Tablet')).toBeInTheDocument()
  })

  it('should display no devices message when empty', () => {
    vi.mocked(useDevicesModule.useDevices).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    render(<DeviceManagementSection />, { wrapper: createWrapper() })

    expect(screen.getByText(/common:device_list.no_devices/i)).toBeInTheDocument()
  })

  it('should mark current device', () => {
    render(<DeviceManagementSection />, { wrapper: createWrapper() })

    expect(screen.getByText(/common:device_list.current_device/i)).toBeInTheDocument()
  })

  it('should display children names for device', () => {
    render(<DeviceManagementSection />, { wrapper: createWrapper() })

    expect(screen.getByText(/Alice, Bob/i)).toBeInTheDocument()
  })

  it('should format dates correctly', () => {
    render(<DeviceManagementSection />, { wrapper: createWrapper() })

    const registeredDate = new Date('2024-01-01T00:00:00Z').toLocaleDateString()
    expect(screen.getByText(registeredDate)).toBeInTheDocument()
  })

  it('should open edit modal when edit button clicked', () => {
    render(<DeviceManagementSection />, { wrapper: createWrapper() })

    const editButtons = screen.getAllByTitle(/common:device_list.edit/i)
    fireEvent.click(editButtons[0])

    expect(screen.getByTestId('edit-modal')).toBeInTheDocument()
  })

  it('should close edit modal', () => {
    render(<DeviceManagementSection />, { wrapper: createWrapper() })

    const editButtons = screen.getAllByTitle(/common:device_list.edit/i)
    fireEvent.click(editButtons[0])

    const modal = screen.getByTestId('edit-modal')
    fireEvent.click(modal)

    expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument()
  })

  it('should open remove modal when remove button clicked', () => {
    render(<DeviceManagementSection />, { wrapper: createWrapper() })

    const removeButtons = screen.getAllByTitle(/common:device_list.remove/i)
    fireEvent.click(removeButtons[0])

    expect(screen.getByTestId('remove-modal')).toBeInTheDocument()
  })

  it('should close remove modal', () => {
    render(<DeviceManagementSection />, { wrapper: createWrapper() })

    const removeButtons = screen.getAllByTitle(/common:device_list.remove/i)
    fireEvent.click(removeButtons[0])

    const modal = screen.getByTestId('remove-modal')
    fireEvent.click(modal)

    expect(screen.queryByTestId('remove-modal')).not.toBeInTheDocument()
  })

  it('should filter inactive devices', () => {
    const devicesWithInactive = [
      ...mockDevices,
      {
        _id: 'device-3',
        device_token: 'uuid-3',
        device_name: 'Inactive Device',
        child_ids: [],
        registered_at: '2024-01-05T00:00:00Z',
        last_used_at: '2024-01-06T00:00:00Z',
        is_active: false,
      },
    ]

    vi.mocked(useDevicesModule.useDevices).mockReturnValue({
      data: devicesWithInactive,
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    render(<DeviceManagementSection />, { wrapper: createWrapper() })

    expect(screen.queryByText('Inactive Device')).not.toBeInTheDocument()
    expect(screen.getByText('Family iPad')).toBeInTheDocument()
  })

  it('should handle no children names gracefully', () => {
    vi.mocked(useChildrenModule.useChildren).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    render(<DeviceManagementSection />, { wrapper: createWrapper() })

    expect(screen.getByText('Family iPad')).toBeInTheDocument()
  })

  it('should show message when device has no children', () => {
    const deviceWithNoChildren = [
      {
        _id: 'device-1',
        device_token: 'uuid-1',
        device_name: 'Empty Device',
        child_ids: [],
        registered_at: '2024-01-01T00:00:00Z',
        last_used_at: '2024-01-02T00:00:00Z',
        is_active: true,
      },
    ]

    vi.mocked(useDevicesModule.useDevices).mockReturnValue({
      data: deviceWithNoChildren,
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    render(<DeviceManagementSection />, { wrapper: createWrapper() })

    expect(screen.getByText(/common:device_list.no_children/i)).toBeInTheDocument()
  })
})
