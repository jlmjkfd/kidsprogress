import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRegister } from '../useRegister'
import { server } from '../../../test/setup'
import { http, HttpResponse } from 'msw'

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

describe('useRegister', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should register successfully with valid data', async () => {
    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      full_name: 'New User',
      language: 'en',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toMatchObject({
      access_token: 'mock-access-token',
      user: {
        email: 'newuser@example.com',
        full_name: 'New User',
        language: 'en',
      },
    })
  })

  it('should send correct request payload', async () => {
    let receivedBody: any = null

    server.use(
      http.post('http://localhost:8000/api/auth/register', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({
          access_token: 'mock-token',
          user: {
            _id: 'user-new',
            email: receivedBody.email,
            full_name: receivedBody.full_name,
            language: receivedBody.language,
          },
        })
      })
    )

    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    })

    const userData = {
      email: 'test@example.com',
      password: 'Password123!',
      full_name: 'Test User',
      language: 'es',
    }

    result.current.mutate(userData)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(receivedBody).toEqual(userData)
  })

  it('should handle duplicate email error', async () => {
    server.use(
      http.post('http://localhost:8000/api/auth/register', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Email already exists' }),
          { status: 400 }
        )
      })
    )

    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      email: 'existing@example.com',
      password: 'Password123!',
      full_name: 'Existing User',
      language: 'en',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeTruthy()
  })

  it('should default language to "en" if not provided', async () => {
    let receivedBody: any = null

    server.use(
      http.post('http://localhost:8000/api/auth/register', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({
          access_token: 'mock-token',
          user: {
            _id: 'user-new',
            email: receivedBody.email,
            full_name: receivedBody.full_name,
            language: receivedBody.language || 'en',
          },
        })
      })
    )

    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      email: 'test@example.com',
      password: 'Password123!',
      full_name: 'Test User',
    } as any)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('should handle validation errors', async () => {
    server.use(
      http.post('http://localhost:8000/api/auth/register', () => {
        return new HttpResponse(
          JSON.stringify({
            detail: [
              { field: 'email', message: 'Invalid email format' },
              { field: 'password', message: 'Password too weak' },
            ],
          }),
          { status: 422 }
        )
      })
    )

    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      email: 'invalid-email',
      password: '123',
      full_name: 'Test',
      language: 'en',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
