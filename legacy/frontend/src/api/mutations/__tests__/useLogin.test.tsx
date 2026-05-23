import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLogin } from '../useLogin'
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

describe('useLogin', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should login successfully with valid credentials', async () => {
    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      email: 'test@example.com',
      password: 'password123',
      is_trusted_device: true,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({
      access_token: 'mock-access-token',
      user: {
        _id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        language: 'en',
      },
    })
  })

  it('should fail with invalid credentials', async () => {
    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      email: 'wrong@example.com',
      password: 'wrongpassword',
      is_trusted_device: false,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeTruthy()
  })

  it('should send is_trusted_device flag', async () => {
    let receivedBody: any = null

    server.use(
      http.post('http://localhost:8000/api/auth/login', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({
          access_token: 'mock-token',
          user: {
            _id: 'user-123',
            email: 'test@example.com',
            full_name: 'Test User',
            language: 'en',
          },
        })
      })
    )

    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      email: 'test@example.com',
      password: 'password123',
      is_trusted_device: true,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(receivedBody.is_trusted_device).toBe(true)
  })

  it('should handle network errors', async () => {
    server.use(
      http.post('http://localhost:8000/api/auth/login', () => {
        return HttpResponse.error()
      })
    )

    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      email: 'test@example.com',
      password: 'password123',
      is_trusted_device: true,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
