import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DeviceRegistrationModal from '../DeviceRegistrationModal'
import * as useChildrenModule from '@api/queries/useChildren'
import * as useRegisterDeviceModule from '@api/mutations/useRegisterDevice'
import * as deviceTokenModule from '@/utils/deviceToken'

// Mock modules
vi.mock('@api/queries/useChildren')
vi.mock('@api/mutations/useRegisterDevice')
vi.mock('@/utils/deviceToken')

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

describe('DeviceRegistrationModal', () => {
  const mockOnClose = vi.fn()
  const mockMutate = vi.fn()

  const mockChildren = [
    { _id: 'child-1', name: 'Alice', date_of_birth: '2015-01-01' },
    { _id: 'child-2', name: 'Bob', date_of_birth: '2017-06-15' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useChildren
    vi.mocked(useChildrenModule.useChildren).mockReturnValue({
      data: mockChildren,
      isLoading: false,
      isError: false,
      error: null,
    } as any)

    // Mock useRegisterDevice
    vi.mocked(useRegisterDeviceModule.useRegisterDevice).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: false,
      isError: false,
    } as any)

    // Mock device token
    vi.mocked(deviceTokenModule.getOrCreateDeviceToken).mockReturnValue('test-device-uuid')
  })

  it('should not render when isOpen is false', () => {
    render(
      <DeviceRegistrationModal isOpen={false} onClose={mockOnClose} isTrustedDevice={true} />,
      { wrapper: createWrapper() }
    )

    expect(screen.queryByText(/device/i)).not.toBeInTheDocument()
  })

  it('should render registration form when isOpen is true', () => {
    render(
      <DeviceRegistrationModal isOpen={true} onClose={mockOnClose} isTrustedDevice={true} />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText(/auth:device.register_prompt_title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/auth:device.device_name_label/i)).toBeInTheDocument()
  })

  it('should auto-select all children by default', async () => {
    render(
      <DeviceRegistrationModal isOpen={true} onClose={mockOnClose} isTrustedDevice={true} />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      const aliceCheckbox = screen.getByRole('checkbox', { name: /Alice/i })
      const bobCheckbox = screen.getByRole('checkbox', { name: /Bob/i })
      expect(aliceCheckbox).toBeChecked()
      expect(bobCheckbox).toBeChecked()
    })
  })

  it('should toggle child selection', async () => {
    render(
      <DeviceRegistrationModal isOpen={true} onClose={mockOnClose} isTrustedDevice={true} />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /Alice/i })).toBeChecked()
    })

    const aliceCheckbox = screen.getByRole('checkbox', { name: /Alice/i })
    fireEvent.click(aliceCheckbox)

    expect(aliceCheckbox).not.toBeChecked()
  })

  it('should call onClose when skip button clicked', () => {
    render(
      <DeviceRegistrationModal isOpen={true} onClose={mockOnClose} isTrustedDevice={true} />,
      { wrapper: createWrapper() }
    )

    const skipButton = screen.getByText(/auth:device.skip_button/i)
    fireEvent.click(skipButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when X button clicked', () => {
    render(
      <DeviceRegistrationModal isOpen={true} onClose={mockOnClose} isTrustedDevice={true} />,
      { wrapper: createWrapper() }
    )

    const closeButton = screen.getByLabelText(/close/i)
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should register device with custom name on trusted device', async () => {
    render(
      <DeviceRegistrationModal isOpen={true} onClose={mockOnClose} isTrustedDevice={true} />,
      { wrapper: createWrapper() }
    )

    // Wait for children to load
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /Alice/i })).toBeChecked()
    })

    // Enter device name
    const nameInput = screen.getByLabelText(/auth:device.device_name_label/i)
    fireEvent.change(nameInput, { target: { value: 'Family iPad' } })

    // Click register
    const registerButton = screen.getByText(/auth:device.register_button/i)
    fireEvent.click(registerButton)

    expect(mockMutate).toHaveBeenCalledWith(
      {
        device_token: 'test-device-uuid',
        device_name: 'Family iPad',
        child_ids: ['child-1', 'child-2'],
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      })
    )
  })

  it('should use default device name if not provided', async () => {
    render(
      <DeviceRegistrationModal isOpen={true} onClose={mockOnClose} isTrustedDevice={true} />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /Alice/i })).toBeChecked()
    })

    const registerButton = screen.getByText(/auth:device.register_button/i)
    fireEvent.click(registerButton)

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        device_name: 'My Device',
      }),
      expect.any(Object)
    )
  })

  it('should disable register button when no children selected', async () => {
    render(
      <DeviceRegistrationModal isOpen={true} onClose={mockOnClose} isTrustedDevice={true} />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /Alice/i })).toBeChecked()
    })

    // Unselect all children
    fireEvent.click(screen.getByRole('checkbox', { name: /Alice/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Bob/i }))

    const registerButton = screen.getByText(/auth:device.register_button/i)
    expect(registerButton).toBeDisabled()
  })

  it('should show confirmation dialog on untrusted device', () => {
    render(
      <DeviceRegistrationModal isOpen={true} onClose={mockOnClose} isTrustedDevice={false} />,
      { wrapper: createWrapper() }
    )

    // Enter device name
    const nameInput = screen.getByLabelText(/auth:device.device_name_label/i)
    fireEvent.change(nameInput, { target: { value: 'Unknown Device' } })

    // Click register
    const registerButton = screen.getByText(/auth:device.register_button/i)
    fireEvent.click(registerButton)

    // Should show confirmation dialog
    expect(screen.getByText(/auth:device.registration_confirmation_title/i)).toBeInTheDocument()
    expect(screen.getByText(/auth:device.registration_confirmation_message/i)).toBeInTheDocument()
  })

  it('should allow canceling confirmation on untrusted device', () => {
    render(
      <DeviceRegistrationModal isOpen={true} onClose={mockOnClose} isTrustedDevice={false} />,
      { wrapper: createWrapper() }
    )

    // Trigger confirmation dialog
    const registerButton = screen.getByText(/auth:device.register_button/i)
    fireEvent.click(registerButton)

    // Click "No" button
    const noButton = screen.getByText(/auth:device.confirm_no/i)
    fireEvent.click(noButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should proceed with registration after confirmation on untrusted device', async () => {
    render(
      <DeviceRegistrationModal isOpen={true} onClose={mockOnClose} isTrustedDevice={false} />,
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /Alice/i })).toBeChecked()
    })

    // Trigger confirmation dialog
    const registerButton = screen.getByText(/auth:device.register_button/i)
    fireEvent.click(registerButton)

    // Click "Yes" button
    const yesButton = screen.getByText(/auth:device.confirm_yes/i)
    fireEvent.click(yesButton)

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        device_token: 'test-device-uuid',
      }),
      expect.any(Object)
    )
  })

  it('should show loading state during registration', () => {
    vi.mocked(useRegisterDeviceModule.useRegisterDevice).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      isSuccess: false,
      isError: false,
    } as any)

    render(
      <DeviceRegistrationModal isOpen={true} onClose={mockOnClose} isTrustedDevice={true} />,
      { wrapper: createWrapper() }
    )

    const registerButton = screen.getByText(/auth:device.registering/i)
    expect(registerButton).toBeDisabled()
  })

  it('should call onClose on successful registration', () => {
    render(
      <DeviceRegistrationModal isOpen={true} onClose={mockOnClose} isTrustedDevice={true} />,
      { wrapper: createWrapper() }
    )

    const registerButton = screen.getByText(/auth:device.register_button/i)
    fireEvent.click(registerButton)

    // Get the onSuccess callback
    const onSuccessCallback = mockMutate.mock.calls[0][1].onSuccess
    onSuccessCallback()

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
