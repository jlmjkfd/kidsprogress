import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../../test/utils'
import RegisterPage from '../index'
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

describe('RegisterPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    localStorage.clear()
  })

  it('renders all required fields', () => {
    render(<RegisterPage />)

    expect(screen.getByLabelText('auth:register.full_name_label')).toBeInTheDocument()
    expect(screen.getByLabelText('auth:register.email_label')).toBeInTheDocument()
    expect(screen.getByLabelText('auth:register.password_label')).toBeInTheDocument()
  })

  it('validates email format', () => {
    render(<RegisterPage />)

    const emailInput = screen.getByLabelText('auth:register.email_label') as HTMLInputElement
    expect(emailInput.type).toBe('email')
    expect(emailInput.required).toBe(true)
  })

  it('validates password strength', () => {
    render(<RegisterPage />)

    const passwordInput = screen.getByLabelText('auth:register.password_label') as HTMLInputElement
    expect(passwordInput.type).toBe('password')
    expect(passwordInput.minLength).toBe(6)
    expect(passwordInput.required).toBe(true)
  })

  it('shows loading state during registration', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/auth/register', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return HttpResponse.json({
          access_token: 'mock-token',
          user: {
            _id: 'user-new',
            email: 'newuser@example.com',
            full_name: 'New User',
            language: 'en',
          },
        })
      })
    )

    render(<RegisterPage />)

    const fullNameInput = screen.getByLabelText('auth:register.full_name_label')
    const emailInput = screen.getByLabelText('auth:register.email_label')
    const passwordInput = screen.getByLabelText('auth:register.password_label')
    const submitButton = screen.getByRole('button', { name: 'auth:register.submit' })

    await user.type(fullNameInput, 'New User')
    await user.type(emailInput, 'newuser@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    expect(screen.getByText('auth:register.submitting')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('shows error message on registration failure', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/auth/register', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Email already exists' }),
          { status: 400 }
        )
      })
    )

    render(<RegisterPage />)

    const fullNameInput = screen.getByLabelText('auth:register.full_name_label')
    const emailInput = screen.getByLabelText('auth:register.email_label')
    const passwordInput = screen.getByLabelText('auth:register.password_label')
    const submitButton = screen.getByRole('button', { name: 'auth:register.submit' })

    await user.type(fullNameInput, 'Existing User')
    await user.type(emailInput, 'existing@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('errors:email_already_registered')).toBeInTheDocument()
    })
  })

  it('navigates to dashboard on successful registration', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/auth/register', () => {
        return HttpResponse.json({
          access_token: 'mock-token',
          user: {
            _id: 'user-new',
            email: 'newuser@example.com',
            full_name: 'New User',
            language: 'en',
          },
        })
      }),
      http.post('http://localhost:8000/api/auth/login', () => {
        return HttpResponse.json({
          access_token: 'mock-token',
          refresh_token: 'mock-refresh-token',
          user: {
            _id: 'user-new',
            email: 'newuser@example.com',
            full_name: 'New User',
            language: 'en',
          },
        })
      }),
      http.get('http://localhost:8000/api/auth/me', () => {
        return HttpResponse.json({
          _id: 'user-new',
          email: 'newuser@example.com',
          full_name: 'New User',
          language: 'en',
        })
      })
    )

    render(<RegisterPage />)

    const fullNameInput = screen.getByLabelText('auth:register.full_name_label')
    const emailInput = screen.getByLabelText('auth:register.email_label')
    const passwordInput = screen.getByLabelText('auth:register.password_label')
    const submitButton = screen.getByRole('button', { name: 'auth:register.submit' })

    await user.type(fullNameInput, 'New User')
    await user.type(emailInput, 'newuser@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('auto-logins after successful registration', async () => {
    const user = userEvent.setup()
    let loginCalled = false

    server.use(
      http.post('http://localhost:8000/api/auth/register', () => {
        return HttpResponse.json({
          access_token: 'mock-token',
          user: {
            _id: 'user-new',
            email: 'newuser@example.com',
            full_name: 'New User',
            language: 'en',
          },
        })
      }),
      http.post('http://localhost:8000/api/auth/login', () => {
        loginCalled = true
        return HttpResponse.json({
          access_token: 'mock-token',
          refresh_token: 'mock-refresh-token',
          user: {
            _id: 'user-new',
            email: 'newuser@example.com',
            full_name: 'New User',
            language: 'en',
          },
        })
      }),
      http.get('http://localhost:8000/api/auth/me', () => {
        return HttpResponse.json({
          _id: 'user-new',
          email: 'newuser@example.com',
          full_name: 'New User',
          language: 'en',
        })
      })
    )

    render(<RegisterPage />)

    const fullNameInput = screen.getByLabelText('auth:register.full_name_label')
    const emailInput = screen.getByLabelText('auth:register.email_label')
    const passwordInput = screen.getByLabelText('auth:register.password_label')
    const submitButton = screen.getByRole('button', { name: 'auth:register.submit' })

    await user.type(fullNameInput, 'New User')
    await user.type(emailInput, 'newuser@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(loginCalled).toBe(true)
    })
  })

  it('stores token in localStorage after registration', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('http://localhost:8000/api/auth/register', () => {
        return HttpResponse.json({
          access_token: 'registration-token',
          user: {
            _id: 'user-new',
            email: 'newuser@example.com',
            full_name: 'New User',
            language: 'en',
          },
        })
      }),
      http.post('http://localhost:8000/api/auth/login', () => {
        return HttpResponse.json({
          access_token: 'login-token',
          refresh_token: 'refresh-token',
          user: {
            _id: 'user-new',
            email: 'newuser@example.com',
            full_name: 'New User',
            language: 'en',
          },
        })
      }),
      http.get('http://localhost:8000/api/auth/me', () => {
        return HttpResponse.json({
          _id: 'user-new',
          email: 'newuser@example.com',
          full_name: 'New User',
          language: 'en',
        })
      })
    )

    render(<RegisterPage />)

    const fullNameInput = screen.getByLabelText('auth:register.full_name_label')
    const emailInput = screen.getByLabelText('auth:register.email_label')
    const passwordInput = screen.getByLabelText('auth:register.password_label')
    const submitButton = screen.getByRole('button', { name: 'auth:register.submit' })

    await user.type(fullNameInput, 'New User')
    await user.type(emailInput, 'newuser@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(localStorage.getItem('auth_token')).toBe('login-token')
    })
  })

  it('renders link to login page', () => {
    render(<RegisterPage />)

    const loginLink = screen.getByRole('link', { name: 'auth:register.signin_link' })
    expect(loginLink).toHaveAttribute('href', '/login')
  })
})
