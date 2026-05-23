import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRegisterDevice } from '../useRegisterDevice'
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

describe('useRegisterDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should register device successfully', async () => {
    server.use(
      http.post('http://localhost:8000/api/devices/register', async ({ request }) => {
        const body = await request.json() as any
        return HttpResponse.json({
          id: 'device-123',
          device_token: body.device_token,
          device_name: body.device_name,
          parent_id: 'parent-123',
          child_ids: body.child_ids,
          registered_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          is_active: true,
        })
      })
    )

    const { result } = renderHook(() => useRegisterDevice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      device_token: 'test-device-uuid',
      device_name: 'Test Device',
      child_ids: ['child-1', 'child-2'],
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(
      expect.objectContaining({
        device_token: 'test-device-uuid',
        device_name: 'Test Device',
        child_ids: ['child-1', 'child-2'],
      })
    )
  })

  it('should send correct request payload', async () => {
    let capturedPayload: any = null

    server.use(
      http.post('http://localhost:8000/api/devices/register', async ({ request }) => {
        capturedPayload = await request.json()
        return HttpResponse.json({
          id: 'device-123',
          device_token: capturedPayload.device_token,
          device_name: capturedPayload.device_name,
          parent_id: 'parent-123',
          child_ids: capturedPayload.child_ids,
          registered_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          is_active: true,
        })
      })
    )

    const { result } = renderHook(() => useRegisterDevice(), {
      wrapper: createWrapper(),
    })

    const testData = {
      device_token: 'uuid-123',
      device_name: 'Family iPad',
      child_ids: ['child-1'],
    }

    result.current.mutate(testData)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(capturedPayload).toEqual(testData)
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
      http.post('http://localhost:8000/api/devices/register', () => {
        return HttpResponse.json({
          id: 'device-123',
          device_token: 'test-token',
          device_name: 'Test',
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

    const { result } = renderHook(() => useRegisterDevice(), { wrapper })

    result.current.mutate({
      device_token: 'test-token',
      device_name: 'Test',
      child_ids: [],
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['devices'] })
  })

  it('should handle registration error', async () => {
    server.use(
      http.post('http://localhost:8000/api/devices/register', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Invalid child_id' }),
          { status: 400 }
        )
      })
    )

    const { result } = renderHook(() => useRegisterDevice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      device_token: 'test-token',
      device_name: 'Test',
      child_ids: ['invalid-id'],
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should register device with empty children list', async () => {
    server.use(
      http.post('http://localhost:8000/api/devices/register', async ({ request }) => {
        const body = await request.json() as any
        return HttpResponse.json({
          id: 'device-123',
          device_token: body.device_token,
          device_name: body.device_name,
          parent_id: 'parent-123',
          child_ids: [],
          registered_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          is_active: true,
        })
      })
    )

    const { result } = renderHook(() => useRegisterDevice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      device_token: 'test-token',
      device_name: 'Test Device',
      child_ids: [],
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.child_ids).toEqual([])
  })
})
