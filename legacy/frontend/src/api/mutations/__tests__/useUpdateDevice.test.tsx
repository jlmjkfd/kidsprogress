import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUpdateDevice } from '../useUpdateDevice'
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

describe('useUpdateDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update device name successfully', async () => {
    server.use(
      http.put('http://localhost:8000/api/devices/test-device-uuid', async ({ request }) => {
        const body = await request.json() as any
        return HttpResponse.json({
          id: 'device-123',
          device_token: 'test-device-uuid',
          device_name: body.device_name,
          parent_id: 'parent-123',
          child_ids: ['child-1'],
          registered_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          is_active: true,
        })
      })
    )

    const { result } = renderHook(() => useUpdateDevice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      device_token: 'test-device-uuid',
      updates: {
        device_name: 'Updated Device Name',
      },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.device_name).toBe('Updated Device Name')
  })

  it('should update device children successfully', async () => {
    server.use(
      http.put('http://localhost:8000/api/devices/test-device-uuid', async ({ request }) => {
        const body = await request.json() as any
        return HttpResponse.json({
          id: 'device-123',
          device_token: 'test-device-uuid',
          device_name: 'Test Device',
          parent_id: 'parent-123',
          child_ids: body.child_ids,
          registered_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          is_active: true,
        })
      })
    )

    const { result } = renderHook(() => useUpdateDevice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      device_token: 'test-device-uuid',
      updates: {
        child_ids: ['child-1', 'child-2', 'child-3'],
      },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.child_ids).toEqual(['child-1', 'child-2', 'child-3'])
  })

  it('should update both name and children', async () => {
    server.use(
      http.put('http://localhost:8000/api/devices/test-device-uuid', async ({ request }) => {
        const body = await request.json() as any
        return HttpResponse.json({
          id: 'device-123',
          device_token: 'test-device-uuid',
          device_name: body.device_name,
          parent_id: 'parent-123',
          child_ids: body.child_ids,
          registered_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          is_active: true,
        })
      })
    )

    const { result } = renderHook(() => useUpdateDevice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      device_token: 'test-device-uuid',
      updates: {
        device_name: 'New Name',
        child_ids: ['child-2'],
      },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.device_name).toBe('New Name')
    expect(result.current.data?.child_ids).toEqual(['child-2'])
  })

  it('should send correct request payload', async () => {
    let capturedToken: string | null = null
    let capturedPayload: any = null

    server.use(
      http.put('http://localhost:8000/api/devices/:token', async ({ request, params }) => {
        capturedToken = params.token as string
        capturedPayload = await request.json()
        return HttpResponse.json({
          id: 'device-123',
          device_token: capturedToken,
          device_name: capturedPayload.device_name,
          parent_id: 'parent-123',
          child_ids: capturedPayload.child_ids,
          registered_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          is_active: true,
        })
      })
    )

    const { result } = renderHook(() => useUpdateDevice(), {
      wrapper: createWrapper(),
    })

    const testData = {
      device_token: 'uuid-456',
      updates: {
        device_name: 'Updated iPad',
        child_ids: ['child-1', 'child-2'],
      },
    }

    result.current.mutate(testData)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(capturedToken).toBe('uuid-456')
    expect(capturedPayload).toEqual(testData.updates)
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
      http.put('http://localhost:8000/api/devices/test-token', () => {
        return HttpResponse.json({
          id: 'device-123',
          device_token: 'test-token',
          device_name: 'Updated',
          parent_id: 'parent-123',
          child_ids: [],
          registered_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          is_active: true,
        })
      })
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useUpdateDevice(), { wrapper })

    result.current.mutate({
      device_token: 'test-token',
      updates: { device_name: 'Updated' },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['devices'] })
  })

  it('should handle update error', async () => {
    server.use(
      http.put('http://localhost:8000/api/devices/test-token', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Invalid child_id' }),
          { status: 400 }
        )
      })
    )

    const { result } = renderHook(() => useUpdateDevice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      device_token: 'test-token',
      updates: { child_ids: ['invalid-id'] },
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should handle not found error', async () => {
    server.use(
      http.put('http://localhost:8000/api/devices/nonexistent', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Device not found or unauthorized' }),
          { status: 404 }
        )
      })
    )

    const { result } = renderHook(() => useUpdateDevice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      device_token: 'nonexistent',
      updates: { device_name: 'New Name' },
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })
})
