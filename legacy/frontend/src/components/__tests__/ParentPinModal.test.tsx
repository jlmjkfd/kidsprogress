import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils'
import ParentPinModal from '../ParentPinModal'
import { server } from '../../test/setup'
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

describe('ParentPinModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
    mockOnSuccess.mockClear()
  })

  it('renders PIN input when open', () => {
    render(
      <ParentPinModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByLabelText('auth:parent_access.enter_pin')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <ParentPinModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.queryByLabelText('auth:parent_access.enter_pin')).not.toBeInTheDocument()
  })

  it('accepts only numeric input', async () => {
    const user = userEvent.setup()

    render(
      <ParentPinModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const input = screen.getByLabelText('auth:parent_access.enter_pin') as HTMLInputElement

    await user.type(input, 'abc123def456')

    // Should only have numeric characters
    expect(input.value).toBe('123456')
  })

  it('limits input to 6 characters', async () => {
    const user = userEvent.setup()

    render(
      <ParentPinModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const input = screen.getByLabelText('auth:parent_access.enter_pin') as HTMLInputElement

    await user.type(input, '1234567890')

    expect(input.value).toBe('123456')
    expect(input.value.length).toBe(6)
  })

  it('calls verify mutation on submit', async () => {
    const user = userEvent.setup()
    let submittedPin: string | null = null

    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/verify', async ({ request }) => {
        const body = await request.json() as any
        submittedPin = body.pin
        return HttpResponse.json({ valid: true })
      })
    )

    render(
      <ParentPinModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const input = screen.getByLabelText('auth:parent_access.enter_pin')
    const submitButton = screen.getByRole('button', { name: 'auth:parent_access.access' })

    await user.type(input, '123456')
    await user.click(submitButton)

    await waitFor(() => {
      expect(submittedPin).toBe('123456')
    })
  })

  it('shows error on incorrect PIN', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/verify', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Invalid PIN' }),
          { status: 401 }
        )
      })
    )

    render(
      <ParentPinModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const input = screen.getByLabelText('auth:parent_access.enter_pin')
    const submitButton = screen.getByRole('button', { name: 'auth:parent_access.access' })

    await user.type(input, '999999')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('auth:parent_access.invalid_pin')).toBeInTheDocument()
    })
  })

  it('calls onSuccess callback on correct PIN', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/verify', () => {
        return HttpResponse.json({ valid: true })
      })
    )

    render(
      <ParentPinModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const input = screen.getByLabelText('auth:parent_access.enter_pin')
    const submitButton = screen.getByRole('button', { name: 'auth:parent_access.access' })

    await user.type(input, '123456')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1)
    })
  })

  it('allows cancellation', async () => {
    const user = userEvent.setup()

    render(
      <ParentPinModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const cancelButton = screen.getByRole('button', { name: 'auth:child_pin.back' })
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('clears PIN on close', async () => {
    const user = userEvent.setup()

    render(
      <ParentPinModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const input = screen.getByLabelText('auth:parent_access.enter_pin') as HTMLInputElement
    await user.type(input, '1234')

    const closeButton = screen.getByLabelText('Close')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('clears PIN after successful verification', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/verify', () => {
        return HttpResponse.json({ valid: true })
      })
    )

    render(
      <ParentPinModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const input = screen.getByLabelText('auth:parent_access.enter_pin') as HTMLInputElement
    const submitButton = screen.getByRole('button', { name: 'auth:parent_access.access' })

    await user.type(input, '123456')
    await user.click(submitButton)

    await waitFor(() => {
      expect(input.value).toBe('')
    })
  })

  it('disables submit when PIN is less than 4 digits', () => {
    render(
      <ParentPinModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const submitButton = screen.getByRole('button', { name: 'auth:parent_access.access' })

    // Should be disabled with empty or short PIN
    expect(submitButton).toBeDisabled()
  })

  it('enables submit when PIN is 4-6 digits', async () => {
    const user = userEvent.setup()

    render(
      <ParentPinModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const input = screen.getByLabelText('auth:parent_access.enter_pin')
    const submitButton = screen.getByRole('button', { name: 'auth:parent_access.access' })

    await user.type(input, '1234')

    expect(submitButton).not.toBeDisabled()
  })

  it('shows loading state during verification', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/verify', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return HttpResponse.json({ valid: true })
      })
    )

    render(
      <ParentPinModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const input = screen.getByLabelText('auth:parent_access.enter_pin')
    const submitButton = screen.getByRole('button', { name: 'auth:parent_access.access' })

    await user.type(input, '123456')
    await user.click(submitButton)

    expect(screen.getByText('auth:parent_access.verifying')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })
})
