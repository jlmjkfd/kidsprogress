import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useRemoveParentPin } from '../useRemoveParentPin'
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

describe('useRemoveParentPin', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should remove PIN successfully', async () => {
    server.use(
      http.delete('http://localhost:8000/api/auth/parent-pin', () => {
        return HttpResponse.json({ message: 'PIN removed successfully' })
      })
    )

    const { result } = renderHook(() => useRemoveParentPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ message: 'PIN removed successfully' })
  })

  it('should call remove endpoint', async () => {
    let endpointCalled = false

    server.use(
      http.delete('http://localhost:8000/api/auth/parent-pin', () => {
        endpointCalled = true
        return HttpResponse.json({ message: 'PIN removed successfully' })
      })
    )

    const { result } = renderHook(() => useRemoveParentPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(endpointCalled).toBe(true)
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
      http.delete('http://localhost:8000/api/auth/parent-pin', () => {
        return HttpResponse.json({ message: 'PIN removed successfully' })
      })
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useRemoveParentPin(), { wrapper })

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['parent-pin-status'] })
  })

  it('should succeed even if no PIN was set', async () => {
    server.use(
      http.delete('http://localhost:8000/api/auth/parent-pin', () => {
        return HttpResponse.json({ message: 'No PIN to remove' })
      })
    )

    const { result } = renderHook(() => useRemoveParentPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('should handle authentication required error', async () => {
    server.use(
      http.delete('http://localhost:8000/api/auth/parent-pin', () => {
        return new HttpResponse(null, { status: 403 })
      })
    )

    const { result } = renderHook(() => useRemoveParentPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
