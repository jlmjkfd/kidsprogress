import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../../test/utils'
import LoginPage from '../index'
import { server } from '../../../test/setup'
import { http, HttpResponse } from 'msw'

// Mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  }
})

// Mock device token utility
vi.mock('@/utils/deviceToken', () => ({
  hasDeviceToken: () => false,
}))

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

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    localStorage.clear()
  })

  it('renders email and password inputs', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText('auth:login.email_label')).toBeInTheDocument()
    expect(screen.getByLabelText('auth:login.password_label')).toBeInTheDocument()
  })

  it('renders trusted device checkbox checked by default', () => {
    render(<LoginPage />)

    const checkbox = screen.getByRole('checkbox', { name: 'auth:login.trusted_device' })
    expect(checkbox).toBeChecked()
  })

  it('submits form with correct data', async () => {
    const user = userEvent.setup()
    let submittedData: any = null

    server.use(
      http.post('http://localhost:8000/api/auth/login', async ({ request }) => {
        submittedData = await request.json()
        return HttpResponse.json({
          access_token: 'mock-token',
          refresh_token: 'mock-refresh-token',
          user: {
            _id: 'user-123',
            email: 'test@example.com',
            full_name: 'Test User',
            language: 'en',
          },
        })
      }),
      http.get('http://localhost:8000/api/auth/me', () => {
        return HttpResponse.json({
          _id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          language: 'en',
        })
      })
    )

    render(<LoginPage />)

    const emailInput = screen.getByLabelText('auth:login.email_label')
    const passwordInput = screen.getByLabelText('auth:login.password_label')
    const submitButton = screen.getByRole('button', { name: 'auth:login.submit' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(submittedData).toEqual({
        email: 'test@example.com',
        password: 'password123',
        is_trusted_device: true,
      })
    })
  })

  it('shows loading state during login', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/auth/login', async () => {
        // Delay response to see loading state
        await new Promise((resolve) => setTimeout(resolve, 100))
        return HttpResponse.json({
          access_token: 'mock-token',
          refresh_token: 'mock-refresh-token',
          user: {
            _id: 'user-123',
            email: 'test@example.com',
            full_name: 'Test User',
            language: 'en',
          },
        })
      })
    )

    render(<LoginPage />)

    const emailInput = screen.getByLabelText('auth:login.email_label')
    const passwordInput = screen.getByLabelText('auth:login.password_label')
    const submitButton = screen.getByRole('button', { name: 'auth:login.submit' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    // Check for loading text
    expect(screen.getByText('auth:login.submitting')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('shows error message on login failure', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/auth/login', () => {
        return new HttpResponse(null, { status: 401 })
      })
    )

    render(<LoginPage />)

    const emailInput = screen.getByLabelText('auth:login.email_label')
    const passwordInput = screen.getByLabelText('auth:login.password_label')
    const submitButton = screen.getByRole('button', { name: 'auth:login.submit' })

    await user.type(emailInput, 'wrong@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('errors:invalid_credentials')).toBeInTheDocument()
    })
  })

  it('navigates to portal-selection on successful login', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/auth/login', () => {
        return HttpResponse.json({
          access_token: 'mock-token',
          refresh_token: 'mock-refresh-token',
          user: {
            _id: 'user-123',
            email: 'test@example.com',
            full_name: 'Test User',
            language: 'en',
          },
        })
      }),
      http.get('http://localhost:8000/api/auth/me', () => {
        return HttpResponse.json({
          _id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          language: 'en',
        })
      })
    )

    render(<LoginPage />)

    const emailInput = screen.getByLabelText('auth:login.email_label')
    const passwordInput = screen.getByLabelText('auth:login.password_label')
    const checkbox = screen.getByRole('checkbox', { name: 'auth:login.trusted_device' })
    const submitButton = screen.getByRole('button', { name: 'auth:login.submit' })

    // Uncheck trusted device to avoid device registration modal
    await user.click(checkbox)

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/portal-selection')
    })
  })

  it('stores tokens in localStorage on success', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/auth/login', () => {
        return HttpResponse.json({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          user: {
            _id: 'user-123',
            email: 'test@example.com',
            full_name: 'Test User',
            language: 'en',
          },
        })
      }),
      http.get('http://localhost:8000/api/auth/me', () => {
        return HttpResponse.json({
          _id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          language: 'en',
        })
      })
    )

    render(<LoginPage />)

    const emailInput = screen.getByLabelText('auth:login.email_label')
    const passwordInput = screen.getByLabelText('auth:login.password_label')
    const submitButton = screen.getByRole('button', { name: 'auth:login.submit' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(localStorage.getItem('auth_token')).toBe('test-access-token')
      expect(localStorage.getItem('refresh_token')).toBe('test-refresh-token')
    })
  })

  it('allows toggling trusted device checkbox', async () => {
    const user = userEvent.setup()

    render(<LoginPage />)

    const checkbox = screen.getByRole('checkbox', { name: 'auth:login.trusted_device' })

    expect(checkbox).toBeChecked()

    await user.click(checkbox)
    expect(checkbox).not.toBeChecked()

    await user.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('renders link to registration page', () => {
    render(<LoginPage />)

    const registerLink = screen.getByRole('link', { name: 'auth:login.signup_link' })
    expect(registerLink).toHaveAttribute('href', '/register')
  })
})
