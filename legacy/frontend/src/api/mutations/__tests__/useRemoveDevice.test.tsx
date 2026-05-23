import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRemoveDevice } from '../useRemoveDevice'
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

describe('useRemoveDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should remove device successfully', async () => {
    server.use(
      http.delete('http://localhost:8000/api/devices/test-device-uuid', () => {
        return new HttpResponse(null, { status: 204 })
      })
    )

    const { result } = renderHook(() => useRemoveDevice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('test-device-uuid')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('should send correct device token', async () => {
    let capturedToken: string | null = null

    server.use(
      http.delete('http://localhost:8000/api/devices/:token', ({ params }) => {
        capturedToken = params.token as string
        return new HttpResponse(null, { status: 204 })
      })
    )

    const { result } = renderHook(() => useRemoveDevice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('uuid-789')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(capturedToken).toBe('uuid-789')
  })

  it('should invalidate devices query on success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    server.use(
      http.delete('http://localhost:8000/api/devices/test-token', () => {
        return new HttpResponse(null, { status: 204 })
      })
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useRemoveDevice(), { wrapper })

    result.current.mutate('test-token')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['devices'] })
  })

  it('should handle removal error', async () => {
    server.use(
      http.delete('http://localhost:8000/api/devices/test-token', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Failed to remove device' }),
          { status: 500 }
        )
      })
    )

    const { result } = renderHook(() => useRemoveDevice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('test-token')

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should handle not found error', async () => {
    server.use(
      http.delete('http://localhost:8000/api/devices/nonexistent', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Device not found or unauthorized' }),
          { status: 404 }
        )
      })
    )

    const { result } = renderHook(() => useRemoveDevice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('nonexistent')

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should handle unauthorized error', async () => {
    server.use(
      http.delete('http://localhost:8000/api/devices/test-token', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Unauthorized' }),
          { status: 403 }
        )
      })
    )

    const { result } = renderHook(() => useRemoveDevice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('test-token')

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })
})
