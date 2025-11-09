import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useSetParentPin } from '../useSetParentPin'
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

describe('useSetParentPin', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should set PIN successfully', async () => {
    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/set', async ({ request }) => {
        const body = await request.json() as any
        if (body.pin && body.pin.length >= 4 && body.pin.length <= 6) {
          return HttpResponse.json({ message: 'PIN set successfully' })
        }
        return new HttpResponse(null, { status: 400 })
      })
    )

    const { result } = renderHook(() => useSetParentPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ pin: '123456' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ message: 'PIN set successfully' })
  })

  it('should send correct PIN in request', async () => {
    let receivedBody: any = null

    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/set', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ message: 'PIN set successfully' })
      })
    )

    const { result } = renderHook(() => useSetParentPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ pin: '1234' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(receivedBody).toEqual({ pin: '1234' })
  })

  it('should invalidate PIN status query on success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/set', () => {
        return HttpResponse.json({ message: 'PIN set successfully' })
      })
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useSetParentPin(), { wrapper })

    result.current.mutate({ pin: '123456' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['parent-pin-status'] })
  })

  it('should handle invalid PIN format error', async () => {
    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/set', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'PIN must be 4-6 digits' }),
          { status: 400 }
        )
      })
    )

    const { result } = renderHook(() => useSetParentPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ pin: '123' })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('should handle update existing PIN', async () => {
    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/set', () => {
        return HttpResponse.json({ message: 'PIN updated successfully' })
      })
    )

    const { result } = renderHook(() => useSetParentPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ pin: '654321' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.message).toContain('successfully')
  })
})
