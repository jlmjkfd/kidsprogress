import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDeviceByToken } from '../useDeviceByToken'
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

describe('useDeviceByToken', () => {
  beforeEach(() => {
    // Reset handlers before each test
  })

  it('should fetch device by token successfully', async () => {
    const mockDevice = {
      id: 'device-123',
      device_token: 'test-uuid',
      device_name: 'Family iPad',
      parent_id: 'parent-123',
      child_ids: ['child-1', 'child-2'],
      registered_at: '2024-01-01T00:00:00Z',
      last_used_at: '2024-01-02T00:00:00Z',
      is_active: true,
    }

    server.use(
      http.get('http://localhost:8000/api/devices/test-uuid', () => {
        return HttpResponse.json(mockDevice)
      })
    )

    const { result } = renderHook(() => useDeviceByToken('test-uuid'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toMatchObject(mockDevice)
  })

  it('should handle device not found', async () => {
    server.use(
      http.get('http://localhost:8000/api/devices/nonexistent', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Device not registered' }),
          { status: 404 }
        )
      })
    )

    const { result } = renderHook(() => useDeviceByToken('nonexistent'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should not fetch when token is null', async () => {
    let fetchCalled = false

    server.use(
      http.get('http://localhost:8000/api/devices/:token', () => {
        fetchCalled = true
        return HttpResponse.json({})
      })
    )

    const { result } = renderHook(() => useDeviceByToken(null), {
      wrapper: createWrapper(),
    })

    // Wait a bit to ensure no fetch happens
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(result.current.isFetching).toBe(false)
    expect(fetchCalled).toBe(false)
  })

  it('should not fetch when enabled is false', async () => {
    let fetchCalled = false

    server.use(
      http.get('http://localhost:8000/api/devices/test-uuid', () => {
        fetchCalled = true
        return HttpResponse.json({})
      })
    )

    const { result } = renderHook(() => useDeviceByToken('test-uuid', false), {
      wrapper: createWrapper(),
    })

    // Wait a bit to ensure no fetch happens
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(result.current.isFetching).toBe(false)
    expect(fetchCalled).toBe(false)
  })

  it('should use correct query key with token', async () => {
    server.use(
      http.get('http://localhost:8000/api/devices/uuid-123', () => {
        return HttpResponse.json({
          id: 'device-1',
          device_token: 'uuid-123',
          device_name: 'Test',
          child_ids: [],
          registered_at: '2024-01-01T00:00:00Z',
          last_used_at: '2024-01-02T00:00:00Z',
          is_active: true,
        })
      })
    )

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    renderHook(() => useDeviceByToken('uuid-123'), { wrapper })

    await waitFor(() => {
      const cachedData = queryClient.getQueryData(['device', 'uuid-123'])
      return cachedData !== undefined
    })

    const cachedData = queryClient.getQueryData(['device', 'uuid-123'])
    expect(cachedData).toBeDefined()
  })

  it('should fetch different devices with different tokens', async () => {
    server.use(
      http.get('http://localhost:8000/api/devices/:token', ({ params }) => {
        const token = params.token as string
        return HttpResponse.json({
          id: `device-${token}`,
          device_token: token,
          device_name: `Device ${token}`,
          child_ids: [],
          registered_at: '2024-01-01T00:00:00Z',
          last_used_at: '2024-01-02T00:00:00Z',
          is_active: true,
        })
      })
    )

    // Create a single shared wrapper to avoid query isolation
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result: result1 } = renderHook(() => useDeviceByToken('token-1'), { wrapper })
    const { result: result2 } = renderHook(() => useDeviceByToken('token-2'), { wrapper })

    await waitFor(() => result1.current.isSuccess)
    await waitFor(() => result2.current.isSuccess)

    expect(result1.current.data?.device_token).toBe('token-1')
    expect(result2.current.data?.device_token).toBe('token-2')
  })

  it('should handle server error', async () => {
    server.use(
      http.get('http://localhost:8000/api/devices/test-uuid', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Internal server error' }),
          { status: 500 }
        )
      })
    )

    const { result } = renderHook(() => useDeviceByToken('test-uuid'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })
})
