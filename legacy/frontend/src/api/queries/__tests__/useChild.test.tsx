import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useChild } from '../useChild'
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

describe('useChild', () => {
  const mockChild = {
    _id: 'child-1',
    parent_id: 'parent-1',
    name: 'Alice',
    date_of_birth: '2018-05-15',
    avatar_url: 'https://example.com/alice.jpg',
    pin_required: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  it('should fetch child by ID successfully', async () => {
    server.use(
      http.get('http://localhost:8000/api/children/child-1', () => {
        return HttpResponse.json(mockChild)
      })
    )

    const { result } = renderHook(() => useChild('child-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toMatchObject(mockChild)
  })

  it('should handle child not found', async () => {
    server.use(
      http.get('http://localhost:8000/api/children/nonexistent', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Child not found' }),
          { status: 404 }
        )
      })
    )

    const { result } = renderHook(() => useChild('nonexistent'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should not fetch when childId is null', () => {
    const { result } = renderHook(() => useChild(''), {
      wrapper: createWrapper(),
    })

    // Should stay in pending state
    expect(result.current.isPending).toBe(true)
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('should not fetch when enabled is false', async () => {
    const { result } = renderHook(() => useChild('child-1', false), {
      wrapper: createWrapper(),
    })

    // Should stay in pending state
    expect(result.current.isPending).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('should use correct query key with childId', async () => {
    server.use(
      http.get('http://localhost:8000/api/children/child-1', () => {
        return HttpResponse.json(mockChild)
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

    renderHook(() => useChild('child-1'), { wrapper })

    await waitFor(() => {
      const data = queryClient.getQueryData(['child', 'child-1'])
      expect(data).toBeDefined()
    })
  })

  it('should fetch different children with different IDs', async () => {
    const mockChild2 = {
      ...mockChild,
      _id: 'child-2',
      name: 'Bob',
    }

    server.use(
      http.get('http://localhost:8000/api/children/child-1', () => {
        return HttpResponse.json(mockChild)
      }),
      http.get('http://localhost:8000/api/children/child-2', () => {
        return HttpResponse.json(mockChild2)
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

    const { result: result1 } = renderHook(() => useChild('child-1'), { wrapper })
    await waitFor(() => expect(result1.current.isSuccess).toBe(true))

    const { result: result2 } = renderHook(() => useChild('child-2'), { wrapper })
    await waitFor(() => expect(result2.current.isSuccess).toBe(true))

    expect(result1.current.data?.name).toBe('Alice')
    expect(result2.current.data?.name).toBe('Bob')
  })

  it('should handle unauthorized error', async () => {
    server.use(
      http.get('http://localhost:8000/api/children/child-1', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Unauthorized' }),
          { status: 403 }
        )
      })
    )

    const { result } = renderHook(() => useChild('child-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should handle server error', async () => {
    server.use(
      http.get('http://localhost:8000/api/children/child-1', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    const { result } = renderHook(() => useChild('child-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })
})
