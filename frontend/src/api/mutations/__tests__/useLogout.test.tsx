import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLogout } from '../useLogout'
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

describe('useLogout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should logout successfully', async () => {
    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    })

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({
      message: 'Logged out successfully',
    })
  })

  it('should call logout endpoint', async () => {
    let endpointCalled = false

    server.use(
      http.post('http://localhost:8000/api/auth/logout', () => {
        endpointCalled = true
        return HttpResponse.json({ message: 'Logged out successfully' })
      })
    )

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    })

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(endpointCalled).toBe(true)
  })

  it('should handle logout errors gracefully', async () => {
    server.use(
      http.post('http://localhost:8000/api/auth/logout', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    })

    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('should work even when already logged out', async () => {
    server.use(
      http.post('http://localhost:8000/api/auth/logout', () => {
        return HttpResponse.json({ message: 'Already logged out' })
      })
    )

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    })

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
