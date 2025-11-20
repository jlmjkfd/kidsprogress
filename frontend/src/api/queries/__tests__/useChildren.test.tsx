import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useChildren } from '../useChildren'
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

describe('useChildren', () => {
  it('should fetch children successfully', async () => {
    server.use(
      http.get('http://localhost:8000/api/children', () => {
        return HttpResponse.json([
          {
            _id: 'child-1',
            parent_id: 'parent-1',
            name: 'Alice',
            date_of_birth: '2018-05-15',
            avatar_url: 'https://example.com/alice.jpg',
            pin_required: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            _id: 'child-2',
            parent_id: 'parent-1',
            name: 'Bob',
            date_of_birth: '2020-03-20',
            avatar_url: null,
            pin_required: false,
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
          },
        ])
      })
    )

    const { result } = renderHook(() => useChildren(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0].name).toBe('Alice')
    expect(result.current.data?.[1].name).toBe('Bob')
  })

  it('should return empty array when no children', async () => {
    server.use(
      http.get('http://localhost:8000/api/children', () => {
        return HttpResponse.json([])
      })
    )

    const { result } = renderHook(() => useChildren(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })

  it('should handle fetch error gracefully', async () => {
    server.use(
      http.get('http://localhost:8000/api/children', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    const { result } = renderHook(() => useChildren(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should not fetch when enabled is false', async () => {
    const { result } = renderHook(() => useChildren(false), {
      wrapper: createWrapper(),
    })

    // Should stay in pending state
    expect(result.current.isPending).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('should use correct query key', async () => {
    server.use(
      http.get('http://localhost:8000/api/children', () => {
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

    renderHook(() => useChildren(), { wrapper })

    await waitFor(() => {
      const data = queryClient.getQueryData(['children'])
      expect(data).toBeDefined()
    })
  })

  it('should include all child fields', async () => {
    server.use(
      http.get('http://localhost:8000/api/children', () => {
        return HttpResponse.json([
          {
            _id: 'child-1',
            parent_id: 'parent-1',
            name: 'Alice',
            date_of_birth: '2018-05-15',
            avatar_url: 'https://example.com/alice.jpg',
            pin_required: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ])
      })
    )

    const { result } = renderHook(() => useChildren(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const child = result.current.data?.[0]
    expect(child).toMatchObject({
      _id: 'child-1',
      parent_id: 'parent-1',
      name: 'Alice',
      date_of_birth: '2018-05-15',
      avatar_url: 'https://example.com/alice.jpg',
      pin_required: true,
      created_at: expect.any(String),
      updated_at: expect.any(String),
    })
  })

  it('should cache results properly', async () => {
    server.use(
      http.get('http://localhost:8000/api/children', () => {
        return HttpResponse.json([
          {
            _id: 'child-1',
            parent_id: 'parent-1',
            name: 'Alice',
            date_of_birth: '2018-05-15',
            pin_required: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ])
      })
    )

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 60000 },
      },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result: result1 } = renderHook(() => useChildren(), { wrapper })
    await waitFor(() => expect(result1.current.isSuccess).toBe(true))

    const { result: result2 } = renderHook(() => useChildren(), { wrapper })

    // Second hook should immediately have data from cache
    expect(result2.current.data).toBeDefined()
    expect(result2.current.data?.[0].name).toBe('Alice')
  })

  it('should handle unauthorized error', async () => {
    server.use(
      http.get('http://localhost:8000/api/children', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Unauthorized' }),
          { status: 403 }
        )
      })
    )

    const { result } = renderHook(() => useChildren(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })
})
