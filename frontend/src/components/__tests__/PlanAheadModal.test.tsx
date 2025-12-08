import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils'
import PlanAheadModal from '../PlanAheadModal'
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

describe('PlanAheadModal', () => {
  const mockOnClose = vi.fn()
  const childId = 'child-123'

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('renders modal when open', () => {
    render(
      <PlanAheadModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    expect(screen.getByText('plan_ahead.title')).toBeInTheDocument()
    expect(screen.getByLabelText('task_title')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <PlanAheadModal
        isOpen={false}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    expect(screen.queryByText('plan_ahead.title')).not.toBeInTheDocument()
  })

  it('shows required field error when title is empty', async () => {
    const user = userEvent.setup()

    render(
      <PlanAheadModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const submitButton = screen.getByRole('button', { name: 'create_task' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/field_required/)).toBeInTheDocument()
    })
  })

  it('creates plan ahead task with title only', async () => {
    const user = userEvent.setup()
    let capturedRequest: any = null

    server.use(
      http.post('http://localhost:8000/api/tasks/child/:childId/create', async ({ request, params }) => {
        const body = await request.json() as any
        capturedRequest = { childId: params.childId, body }
        return HttpResponse.json({
          _id: 'task-123',
          title: body.title,
          status: 'pending',
          quick_capture: false,
          created_by: 'CHILD',
        })
      })
    )

    render(
      <PlanAheadModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title')
    const submitButton = screen.getByRole('button', { name: 'create_task' })

    await user.type(titleInput, 'Practice guitar')
    await user.click(submitButton)

    await waitFor(() => {
      expect(capturedRequest).not.toBeNull()
      expect(capturedRequest.childId).toBe(childId)
      expect(capturedRequest.body.title).toBe('Practice guitar')
      expect(capturedRequest.body.quick_capture).toBe(false)
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('creates task with all fields', async () => {
    const user = userEvent.setup()
    let capturedRequest: any = null

    server.use(
      http.post('http://localhost:8000/api/tasks/child/:childId/create', async ({ request }) => {
        const body = await request.json() as any
        capturedRequest = body
        return HttpResponse.json({
          _id: 'task-123',
          title: body.title,
          status: 'pending',
        })
      })
    )

    render(
      <PlanAheadModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title')
    const descriptionInput = screen.getByLabelText('description_optional')
    const dateInput = screen.getByLabelText('plan_ahead.scheduled_date')
    const timeInput = screen.getByLabelText('plan_ahead.scheduled_time')
    const durationInput = screen.getByLabelText(/estimated_duration/)
    const submitButton = screen.getByRole('button', { name: 'create_task' })

    await user.type(titleInput, 'Math homework')
    await user.type(descriptionInput, 'Chapter 5 exercises')
    await user.type(dateInput, '2025-12-15')
    await user.type(timeInput, '15:30')
    await user.type(durationInput, '60')
    await user.click(submitButton)

    await waitFor(() => {
      expect(capturedRequest).not.toBeNull()
      expect(capturedRequest.title).toBe('Math homework')
      expect(capturedRequest.description).toBe('Chapter 5 exercises')
      expect(capturedRequest.scheduled_date).toBe('2025-12-15T15:30:00')
      expect(capturedRequest.scheduled_time).toBe('15:30')
      expect(capturedRequest.estimated_duration_minutes).toBe(60)
    })
  })

  it('creates task with date only (no time)', async () => {
    const user = userEvent.setup()
    let capturedRequest: any = null

    server.use(
      http.post('http://localhost:8000/api/tasks/child/:childId/create', async ({ request }) => {
        const body = await request.json() as any
        capturedRequest = body
        return HttpResponse.json({ _id: 'task-123' })
      })
    )

    render(
      <PlanAheadModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title')
    const dateInput = screen.getByLabelText('plan_ahead.scheduled_date')
    const submitButton = screen.getByRole('button', { name: 'create_task' })

    await user.type(titleInput, 'Test task')
    await user.type(dateInput, '2025-12-20')
    await user.click(submitButton)

    await waitFor(() => {
      expect(capturedRequest.scheduled_date).toBe('2025-12-20T00:00:00')
      expect(capturedRequest.scheduled_time).toBeUndefined()
    })
  })

  it('omits description if empty', async () => {
    const user = userEvent.setup()
    let capturedRequest: any = null

    server.use(
      http.post('http://localhost:8000/api/tasks/child/:childId/create', async ({ request }) => {
        const body = await request.json() as any
        capturedRequest = body
        return HttpResponse.json({ _id: 'task-123' })
      })
    )

    render(
      <PlanAheadModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title')
    const submitButton = screen.getByRole('button', { name: 'create_task' })

    await user.type(titleInput, 'Test task')
    await user.click(submitButton)

    await waitFor(() => {
      expect(capturedRequest.description).toBeUndefined()
    })
  })

  it('limits title to 200 characters', () => {
    render(
      <PlanAheadModal
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
      <PlanAheadModal
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
        return HttpResponse.json({ _id: 'task-123' })
      })
    )

    render(
      <PlanAheadModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title')
    const submitButton = screen.getByRole('button', { name: 'create_task' })

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
      <PlanAheadModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title')
    const submitButton = screen.getByRole('button', { name: 'create_task' })

    await user.type(titleInput, 'Test task')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('common:error_occurred')).toBeInTheDocument()
    })
  })

  it('clears form on close', async () => {
    const user = userEvent.setup()

    render(
      <PlanAheadModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title') as HTMLInputElement
    const cancelButton = screen.getByRole('button', { name: 'common:cancel' })

    await user.type(titleInput, 'Test')
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('clears form after successful submission', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/tasks/child/:childId/create', () => {
        return HttpResponse.json({ _id: 'task-123' })
      })
    )

    render(
      <PlanAheadModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title')
    const submitButton = screen.getByRole('button', { name: 'create_task' })

    await user.type(titleInput, 'Test task')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('trims whitespace from title and description', async () => {
    const user = userEvent.setup()
    let capturedRequest: any = null

    server.use(
      http.post('http://localhost:8000/api/tasks/child/:childId/create', async ({ request }) => {
        const body = await request.json() as any
        capturedRequest = body
        return HttpResponse.json({ _id: 'task-123' })
      })
    )

    render(
      <PlanAheadModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title')
    const descriptionInput = screen.getByLabelText('description_optional')
    const submitButton = screen.getByRole('button', { name: 'create_task' })

    await user.type(titleInput, '  Test task  ')
    await user.type(descriptionInput, '  Test description  ')
    await user.click(submitButton)

    await waitFor(() => {
      expect(capturedRequest.title).toBe('Test task')
      expect(capturedRequest.description).toBe('Test description')
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
      <PlanAheadModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title')
    const submitButton = screen.getByRole('button', { name: 'create_task' })
    const cancelButton = screen.getByRole('button', { name: 'common:cancel' })

    await user.type(titleInput, 'Test')
    await user.click(submitButton)

    expect(cancelButton).toBeDisabled()
  })

  it('handles date and time inputs independently', async () => {
    const user = userEvent.setup()
    let capturedRequest: any = null

    server.use(
      http.post('http://localhost:8000/api/tasks/child/:childId/create', async ({ request }) => {
        const body = await request.json() as any
        capturedRequest = body
        return HttpResponse.json({ _id: 'task-123' })
      })
    )

    render(
      <PlanAheadModal
        isOpen={true}
        onClose={mockOnClose}
        childId={childId}
      />
    )

    const titleInput = screen.getByLabelText('task_title')
    const timeInput = screen.getByLabelText('plan_ahead.scheduled_time')
    const submitButton = screen.getByRole('button', { name: 'create_task' })

    // Only provide time without date
    await user.type(titleInput, 'Test task')
    await user.type(timeInput, '10:00')
    await user.click(submitButton)

    await waitFor(() => {
      // Time without date should not create a scheduled_date
      expect(capturedRequest.scheduled_date).toBeUndefined()
      expect(capturedRequest.scheduled_time).toBe('10:00')
    })
  })
})
