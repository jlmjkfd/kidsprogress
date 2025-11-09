import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDevices } from '../useDevices'
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

describe('useDevices', () => {
  beforeEach(() => {
    // Reset handlers before each test
  })

  it('should fetch devices successfully', async () => {
    server.use(
      http.get('http://localhost:8000/api/devices', () => {
        return HttpResponse.json([
          {
            _id: 'device-1',
            device_token: 'uuid-1',
            device_name: 'Family iPad',
            child_ids: ['child-1', 'child-2'],
            registered_at: '2024-01-01T00:00:00Z',
            last_used_at: '2024-01-02T00:00:00Z',
            is_active: true,
          },
          {
            _id: 'device-2',
            device_token: 'uuid-2',
            device_name: 'Living Room Tablet',
            child_ids: ['child-1'],
            registered_at: '2024-01-03T00:00:00Z',
            last_used_at: '2024-01-04T00:00:00Z',
            is_active: true,
          },
        ])
      })
    )

    const { result } = renderHook(() => useDevices(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0].device_name).toBe('Family iPad')
    expect(result.current.data?.[1].device_name).toBe('Living Room Tablet')
  })

  it('should return empty array when no devices', async () => {
    server.use(
      http.get('http://localhost:8000/api/devices', () => {
        return HttpResponse.json([])
      })
    )

    const { result } = renderHook(() => useDevices(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })

  it('should handle fetch error', async () => {
    server.use(
      http.get('http://localhost:8000/api/devices', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Unauthorized' }),
          { status: 401 }
        )
      })
    )

    const { result } = renderHook(() => useDevices(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should not fetch when enabled is false', async () => {
    let fetchCalled = false

    server.use(
      http.get('http://localhost:8000/api/devices', () => {
        fetchCalled = true
        return HttpResponse.json([])
      })
    )

    const { result } = renderHook(() => useDevices(false), {
      wrapper: createWrapper(),
    })

    // Wait a bit to ensure no fetch happens
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(result.current.isFetching).toBe(false)
    expect(fetchCalled).toBe(false)
  })

  it('should use correct query key', async () => {
    server.use(
      http.get('http://localhost:8000/api/devices', () => {
        return HttpResponse.json([])
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

    renderHook(() => useDevices(), { wrapper })

    await waitFor(() => {
      const cachedData = queryClient.getQueryData(['devices'])
      return cachedData !== undefined
    })

    const cachedData = queryClient.getQueryData(['devices'])
    expect(cachedData).toBeDefined()
  })

  it('should include all device fields', async () => {
    const mockDevice = {
      _id: 'device-123',
      device_token: 'uuid-test',
      device_name: 'Test Device',
      child_ids: ['child-1', 'child-2'],
      registered_at: '2024-01-01T00:00:00Z',
      last_used_at: '2024-01-02T00:00:00Z',
      is_active: true,
    }

    server.use(
      http.get('http://localhost:8000/api/devices', () => {
        return HttpResponse.json([mockDevice])
      })
    )

    const { result } = renderHook(() => useDevices(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const device = result.current.data?.[0]
    expect(device).toMatchObject(mockDevice)
  })
})
