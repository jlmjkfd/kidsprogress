import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../../../test/utils'
import ParentPinRemoveModal from '../ParentPinRemoveModal'
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

describe('ParentPinRemoveModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('renders warning message when open', () => {
    render(
      <ParentPinRemoveModal
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('auth:parent_pin.remove_pin')).toBeInTheDocument()
    expect(screen.getByText('auth:parent_pin.remove_confirmation')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <ParentPinRemoveModal
        isOpen={false}
        onClose={mockOnClose}
      />
    )

    expect(screen.queryByText('auth:parent_pin.remove_pin')).not.toBeInTheDocument()
  })

  it('calls remove mutation on confirm', async () => {
    const user = userEvent.setup()
    let removeCalled = false

    server.use(
      http.delete('http://localhost:8000/api/auth/parent-pin', () => {
        removeCalled = true
        return HttpResponse.json({ message: 'PIN removed successfully' })
      })
    )

    render(
      <ParentPinRemoveModal
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    const removeButton = screen.getByRole('button', { name: 'auth:parent_pin.remove' })
    await user.click(removeButton)

    await waitFor(() => {
      expect(removeCalled).toBe(true)
    })
  })

  it('closes modal on successful removal', async () => {
    const user = userEvent.setup()

    server.use(
      http.delete('http://localhost:8000/api/auth/parent-pin', () => {
        return HttpResponse.json({ message: 'PIN removed successfully' })
      })
    )

    render(
      <ParentPinRemoveModal
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    const removeButton = screen.getByRole('button', { name: 'auth:parent_pin.remove' })
    await user.click(removeButton)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  it('allows cancellation', async () => {
    const user = userEvent.setup()

    render(
      <ParentPinRemoveModal
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    const cancelButton = screen.getByRole('button', { name: 'auth:device.confirm_no' })
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('shows loading state during removal', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/remove', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return HttpResponse.json({ message: 'PIN removed successfully' })
      })
    )

    render(
      <ParentPinRemoveModal
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    const removeButton = screen.getByRole('button', { name: 'auth:parent_pin.remove' })
    await user.click(removeButton)

    expect(screen.getByText('auth:parent_pin.removing')).toBeInTheDocument()
    expect(removeButton).toBeDisabled()
  })

  it('can be closed via close button', async () => {
    const user = userEvent.setup()

    render(
      <ParentPinRemoveModal
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    const closeButton = screen.getByLabelText('Close')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
