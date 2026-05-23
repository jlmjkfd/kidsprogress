import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useVerifyChildPin } from '../useVerifyChildPin'
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

describe('useVerifyChildPin', () => {
  it('should verify PIN successfully', async () => {
    server.use(
      http.post('http://localhost:8000/api/children/child-1/verify-pin', async ({ request }) => {
        const body = await request.json() as any
        return HttpResponse.json({ valid: body.pin === '1234' })
      })
    )

    const { result } = renderHook(() => useVerifyChildPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ childId: 'child-1', pin: '1234' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBe(true)
  })

  it('should send correct child ID and PIN', async () => {
    let requestUrl = ''
    let requestBody: any = null

    server.use(
      http.post('http://localhost:8000/api/children/:childId/verify-pin', async ({ request, params }) => {
        requestUrl = `/api/children/${params.childId}/verify-pin`
        requestBody = await request.json()
        return HttpResponse.json({ valid: true })
      })
    )

    const { result } = renderHook(() => useVerifyChildPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ childId: 'child-123', pin: '5678' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(requestUrl).toBe('/api/children/child-123/verify-pin')
    expect(requestBody).toMatchObject({ pin: '5678' })
  })

  it('should handle incorrect PIN', async () => {
    server.use(
      http.post('http://localhost:8000/api/children/child-1/verify-pin', () => {
        return HttpResponse.json({ valid: false })
      })
    )

    const { result } = renderHook(() => useVerifyChildPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ childId: 'child-1', pin: 'wrong' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBe(false)
  })

  it('should return true for correct PIN', async () => {
    server.use(
      http.post('http://localhost:8000/api/children/child-1/verify-pin', () => {
        return HttpResponse.json({ valid: true })
      })
    )

    const { result } = renderHook(() => useVerifyChildPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ childId: 'child-1', pin: '1234' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBe(true)
  })

  it('should return false for incorrect PIN', async () => {
    server.use(
      http.post('http://localhost:8000/api/children/child-1/verify-pin', () => {
        return HttpResponse.json({ valid: false })
      })
    )

    const { result } = renderHook(() => useVerifyChildPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ childId: 'child-1', pin: '9999' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBe(false)
  })

  it('should handle non-existent child error', async () => {
    server.use(
      http.post('http://localhost:8000/api/children/nonexistent/verify-pin', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Child not found' }),
          { status: 404 }
        )
      })
    )

    const { result } = renderHook(() => useVerifyChildPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ childId: 'nonexistent', pin: '1234' })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should handle server error', async () => {
    server.use(
      http.post('http://localhost:8000/api/children/child-1/verify-pin', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    const { result } = renderHook(() => useVerifyChildPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ childId: 'child-1', pin: '1234' })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should handle child with no PIN set', async () => {
    server.use(
      http.post('http://localhost:8000/api/children/child-1/verify-pin', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Child has no PIN set' }),
          { status: 400 }
        )
      })
    )

    const { result } = renderHook(() => useVerifyChildPin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ childId: 'child-1', pin: '1234' })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })
})
