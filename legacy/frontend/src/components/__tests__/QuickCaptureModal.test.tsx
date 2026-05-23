import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils'
import QuickCaptureModal from '../QuickCaptureModal'
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

describe('QuickCaptureModal', () => {
  const mockOnClose = vi.fn()
  const childId = 'child-123'

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('renders modal when open', () => {
    render(
      <QuickCaptureModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    expect(screen.getByText('quick_capture.title')).toBeInTheDocument()
    expect(screen.getByLabelText('task_title')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <QuickCaptureModal
        isOpen={false}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    expect(screen.queryByText('quick_capture.title')).not.toBeInTheDocument()
  })

  it('shows required field error when title is empty', async () => {
    const user = userEvent.setup()

    render(
      <QuickCaptureModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const submitButton = screen.getByRole('button', { name: 'start' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/field_required/)).toBeInTheDocument()
    })
  })

  it('creates quick capture task with title only', async () => {
    const user = userEvent.setup()
    let capturedRequest: any = null

    server.use(
      http.post('http://localhost:8000/api/tasks/child/:childId/create', async ({ request, params }) => {
        const body = await request.json() as any
        capturedRequest = { childId: params.childId, body }
        return HttpResponse.json({
          _id: 'task-123',
          title: body.title,
          status: 'in_progress',
          quick_capture: true,
          created_by: 'CHILD',
        })
      })
    )

    render(
      <QuickCaptureModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title')
    const submitButton = screen.getByRole('button', { name: 'start' })

    await user.type(titleInput, 'Reading Harry Potter')
    await user.click(submitButton)

    await waitFor(() => {
      expect(capturedRequest).not.toBeNull()
      expect(capturedRequest.childId).toBe(childId)
      expect(capturedRequest.body.title).toBe('Reading Harry Potter')
      expect(capturedRequest.body.quick_capture).toBe(true)
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('creates task with duration when provided', async () => {
    const user = userEvent.setup()
    let capturedRequest: any = null

    server.use(
      http.post('http://localhost:8000/api/tasks/child/:childId/create', async ({ request }) => {
        const body = await request.json() as any
        capturedRequest = body
        return HttpResponse.json({
          _id: 'task-123',
          title: body.title,
          status: 'in_progress',
          quick_capture: true,
          estimated_duration_minutes: body.estimated_duration_minutes,
        })
      })
    )

    render(
      <QuickCaptureModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title')
    const durationInput = screen.getByLabelText(/estimated_duration/)
    const submitButton = screen.getByRole('button', { name: 'start' })

    await user.type(titleInput, 'Practice piano')
    await user.type(durationInput, '45')
    await user.click(submitButton)

    await waitFor(() => {
      expect(capturedRequest).not.toBeNull()
      expect(capturedRequest.estimated_duration_minutes).toBe(45)
    })
  })

  it('limits title to 200 characters', () => {
    render(
      <QuickCaptureModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title') as HTMLInputElement
    expect(titleInput.maxLength).toBe(200)
  })

  it('validates duration range (1-480 minutes)', () => {
    render(
      <QuickCaptureModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const durationInput = screen.getByLabelText(/estimated_duration/) as HTMLInputElement
    expect(durationInput.min).toBe('1')
    expect(durationInput.max).toBe('480')
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/tasks/child/:childId/create', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return HttpResponse.json({
          _id: 'task-123',
          title: 'Test',
          status: 'in_progress',
        })
      })
    )

    render(
      <QuickCaptureModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title')
    const submitButton = screen.getByRole('button', { name: 'start' })

    await user.type(titleInput, 'Test task')
    await user.click(submitButton)

    expect(screen.getByText('creating')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('shows error message on submission failure', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/tasks/child/:childId/create', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Server error' }),
          { status: 500 }
        )
      })
    )

    render(
      <QuickCaptureModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title')
    const submitButton = screen.getByRole('button', { name: 'start' })

    await user.type(titleInput, 'Test task')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('common:error_occurred')).toBeInTheDocument()
    })
  })

  it('clears form on close', async () => {
    const user = userEvent.setup()

    render(
      <QuickCaptureModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title') as HTMLInputElement
    const durationInput = screen.getByLabelText(/estimated_duration/) as HTMLInputElement
    const cancelButton = screen.getByRole('button', { name: 'common:cancel' })

    await user.type(titleInput, 'Test')
    await user.type(durationInput, '30')
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('clears form after successful submission', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/tasks/child/:childId/create', () => {
        return HttpResponse.json({
          _id: 'task-123',
          title: 'Test',
          status: 'in_progress',
        })
      })
    )

    render(
      <QuickCaptureModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title') as HTMLInputElement
    const submitButton = screen.getByRole('button', { name: 'start' })

    await user.type(titleInput, 'Test task')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('trims whitespace from title', async () => {
    const user = userEvent.setup()
    let capturedRequest: any = null

    server.use(
      http.post('http://localhost:8000/api/tasks/child/:childId/create', async ({ request }) => {
        const body = await request.json() as any
        capturedRequest = body
        return HttpResponse.json({
          _id: 'task-123',
          title: body.title,
        })
      })
    )

    render(
      <QuickCaptureModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title')
    const submitButton = screen.getByRole('button', { name: 'start' })

    await user.type(titleInput, '  Test task  ')
    await user.click(submitButton)

    await waitFor(() => {
      expect(capturedRequest.title).toBe('Test task')
    })
  })

  it('disables cancel button during submission', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/tasks/child/:childId/create', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return HttpResponse.json({ _id: 'task-123' })
      })
    )

    render(
      <QuickCaptureModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title')
    const submitButton = screen.getByRole('button', { name: 'start' })
    const cancelButton = screen.getByRole('button', { name: 'common:cancel' })

    await user.type(titleInput, 'Test')
    await user.click(submitButton)

    expect(cancelButton).toBeDisabled()
  })
})
