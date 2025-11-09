import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useVerifyParentPin } from '../useVerifyParentPin'
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

describe('useVerifyParentPin', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should verify correct PIN', async () => {
    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/verify', async ({ request }) => {
        const body = await request.json() as any
        if (body.pin === '123456') {
          return HttpResponse.json({ valid: true })
        }
        return HttpResponse.json({ valid: false })
      })
    )

    const { result } = renderHook(() => useVerifyParentPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ pin: '123456' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ valid: true })
  })

  it('should return false for incorrect PIN', async () => {
    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/verify', async ({ request }) => {
        const body = await request.json() as any
        if (body.pin === '123456') {
          return HttpResponse.json({ valid: true })
        }
        return HttpResponse.json({ valid: false })
      })
    )

    const { result } = renderHook(() => useVerifyParentPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ pin: 'wrong' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ valid: false })
  })

  it('should send correct PIN in request', async () => {
    let receivedBody: any = null

    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/verify', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ valid: true })
      })
    )

    const { result } = renderHook(() => useVerifyParentPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ pin: '654321' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(receivedBody).toEqual({ pin: '654321' })
  })

  it('should handle error when no PIN is set', async () => {
    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/verify', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'No PIN set for this user' }),
          { status: 400 }
        )
      })
    )

    const { result } = renderHook(() => useVerifyParentPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ pin: '123456' })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('should handle authentication required error', async () => {
    server.use(
      http.post('http://localhost:8000/api/auth/parent-pin/verify', () => {
        return new HttpResponse(null, { status: 403 })
      })
    )

    const { result } = renderHook(() => useVerifyParentPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ pin: '123456' })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
