import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useParentPinStatus } from '../useParentPinStatus'
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

describe('useParentPinStatus', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return true when PIN is set', async () => {
    server.use(
      http.get('http://localhost:8000/api/auth/parent-pin/status', () => {
        return HttpResponse.json({ has_pin: true })
      })
    )

    const { result } = renderHook(() => useParentPinStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ has_pin: true })
  })

  it('should return false when PIN is not set', async () => {
    server.use(
      http.get('http://localhost:8000/api/auth/parent-pin/status', () => {
        return HttpResponse.json({ has_pin: false })
      })
    )

    const { result } = renderHook(() => useParentPinStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ has_pin: false })
  })

  it('should respect enabled parameter', async () => {
    let endpointCalled = false

    server.use(
      http.get('http://localhost:8000/api/auth/parent-pin/status', () => {
        endpointCalled = true
        return HttpResponse.json({ has_pin: true })
      })
    )

    const { result } = renderHook(() => useParentPinStatus(false), {
      wrapper: createWrapper(),
    })

    // Wait a bit to ensure query doesn't run
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(endpointCalled).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('should fetch when enabled is true', async () => {
    server.use(
      http.get('http://localhost:8000/api/auth/parent-pin/status', () => {
        return HttpResponse.json({ has_pin: true })
      })
    )

    const { result } = renderHook(() => useParentPinStatus(true), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.has_pin).toBe(true)
  })

  it('should handle authentication required error', async () => {
    server.use(
      http.get('http://localhost:8000/api/auth/parent-pin/status', () => {
        return new HttpResponse(null, { status: 403 })
      })
    )

    const { result } = renderHook(() => useParentPinStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('should use correct query key', async () => {
    server.use(
      http.get('http://localhost:8000/api/auth/parent-pin/status', () => {
        return HttpResponse.json({ has_pin: true })
      })
    )

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    renderHook(() => useParentPinStatus(), { wrapper })

    await waitFor(() => {
      const cache = queryClient.getQueryData(['parent-pin-status'])
      expect(cache).toBeDefined()
    })
  })
})
