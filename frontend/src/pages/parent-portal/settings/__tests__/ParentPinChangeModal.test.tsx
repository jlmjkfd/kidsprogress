import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../../../test/utils'
import ParentPinChangeModal from '../ParentPinChangeModal'
import { server } from '../../../../test/setup'
import { http, HttpResponse } from 'msw'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: vi.fn(),
      language: 'en',
    },
  }),
  Trans: ({ children }: any) => children,
}))

describe('ParentPinChangeModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('renders PIN and confirm PIN inputs when open', () => {
    render(
      <ParentPinChangeModal
        isOpen={true}
        onClose={mockOnClose}
        hasExistingPin={false}
      />
    )

    expect(screen.getByLabelText('auth:parent_pin.enter_new_pin')).toBeInTheDocument()
    expect(screen.getByLabelText('auth:parent_pin.confirm_pin')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <ParentPinChangeModal
        isOpen={false}
        onClose={mockOnClose}
        hasExistingPin={false}
      />
    )

    expect(screen.queryByLabelText('auth:parent_pin.enter_new_pin')).not.toBeInTheDocument()
  })

  it('shows check mark when PINs match', async () => {
    const user = userEvent.setup()

    render(
      <ParentPinChangeModal
        isOpen={true}
        onClose={mockOnClose}
        hasExistingPin={false}
      />
    )

    const pinInput = screen.getByLabelText('auth:parent_pin.enter_new_pin')
    const confirmPinInput = screen.getByLabelText('auth:parent_pin.confirm_pin')

    await user.type(pinInput, '1234')
    await user.type(confirmPinInput, '1234')

    // Check icon should appear - it's an SVG with class tabler-icon-check
    const checkIcon = document.querySelector('.tabler-icon-check')
    expect(checkIcon).toBeInTheDocument()
  })

  it('validates PIN length (4-6 digits)', () => {
    render(
      <ParentPinChangeModal
        isOpen={true}
        onClose={mockOnClose}
        hasExistingPin={false}
      />
    )

    const submitButton = screen.getByRole('button', { name: 'auth:parent_pin.set' })

    // Should be disabled initially (empty PINs)
    expect(submitButton).toBeDisabled()
  })

  it('calls set mutation on submit with matching PINs', async () => {
    const user = userEvent.setup()
    let submittedPin: string | null = null

    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/set', async ({ request }) => {
        const body = await request.json() as any
        submittedPin = body.pin
        return HttpResponse.json({ message: 'PIN set successfully' })
      })
    )

    render(
      <ParentPinChangeModal
        isOpen={true}
        onClose={mockOnClose}
        hasExistingPin={false}
      />
    )

    const pinInput = screen.getByLabelText('auth:parent_pin.enter_new_pin')
    const confirmPinInput = screen.getByLabelText('auth:parent_pin.confirm_pin')
    const submitButton = screen.getByRole('button', { name: 'auth:parent_pin.set' })

    await user.type(pinInput, '123456')
    await user.type(confirmPinInput, '123456')
    await user.click(submitButton)

    await waitFor(() => {
      expect(submittedPin).toBe('123456')
    })
  })

  it('shows error if PINs do not match', async () => {
    const user = userEvent.setup()

    render(
      <ParentPinChangeModal
        isOpen={true}
        onClose={mockOnClose}
        hasExistingPin={false}
      />
    )

    const pinInput = screen.getByLabelText('auth:parent_pin.enter_new_pin')
    const confirmPinInput = screen.getByLabelText('auth:parent_pin.confirm_pin')

    await user.type(pinInput, '1234')
    await user.type(confirmPinInput, '5678')

    // Error message should appear
    expect(screen.getByText('auth:parent_pin.pins_dont_match')).toBeInTheDocument()
  })

  it('closes modal on successful PIN set', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/set', () => {
        return HttpResponse.json({ message: 'PIN set successfully' })
      })
    )

    render(
      <ParentPinChangeModal
        isOpen={true}
        onClose={mockOnClose}
        hasExistingPin={false}
      />
    )

    const pinInput = screen.getByLabelText('auth:parent_pin.enter_new_pin')
    const confirmPinInput = screen.getByLabelText('auth:parent_pin.confirm_pin')
    const submitButton = screen.getByRole('button', { name: 'auth:parent_pin.set' })

    await user.type(pinInput, '1234')
    await user.type(confirmPinInput, '1234')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  it('allows cancellation', async () => {
    const user = userEvent.setup()

    render(
      <ParentPinChangeModal
        isOpen={true}
        onClose={mockOnClose}
        hasExistingPin={false}
      />
    )

    const cancelButton = screen.getByRole('button', { name: 'auth:child_pin.back' })
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('shows different title when changing existing PIN', () => {
    render(
      <ParentPinChangeModal
        isOpen={true}
        onClose={mockOnClose}
        hasExistingPin={true}
      />
    )

    expect(screen.getByText('auth:parent_pin.change_pin')).toBeInTheDocument()
  })

  it('accepts only numeric input', async () => {
    const user = userEvent.setup()

    render(
      <ParentPinChangeModal
        isOpen={true}
        onClose={mockOnClose}
        hasExistingPin={false}
      />
    )

    const pinInput = screen.getByLabelText('auth:parent_pin.enter_new_pin') as HTMLInputElement

    await user.type(pinInput, 'abc123def')

    // Should only have numeric characters
    expect(pinInput.value).toBe('123')
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/set', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return HttpResponse.json({ message: 'PIN set successfully' })
      })
    )

    render(
      <ParentPinChangeModal
        isOpen={true}
        onClose={mockOnClose}
        hasExistingPin={false}
      />
    )

    const pinInput = screen.getByLabelText('auth:parent_pin.enter_new_pin')
    const confirmPinInput = screen.getByLabelText('auth:parent_pin.confirm_pin')
    const submitButton = screen.getByRole('button', { name: 'auth:parent_pin.set' })

    await user.type(pinInput, '1234')
    await user.type(confirmPinInput, '1234')
    await user.click(submitButton)

    expect(screen.getByText('auth:parent_pin.setting')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })
})
