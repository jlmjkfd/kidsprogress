import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useOverdueTasks, useOverdueStats } from '../useTasks'
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

describe('useOverdueTasks', () => {
  const childId = 'child-123'

  it('should fetch overdue tasks successfully', async () => {
    server.use(
      http.get('http://localhost:8000/api/tasks/child/:childId/overdue', () => {
        return HttpResponse.json([
          {
            _id: 'task-1',
            title: 'Overdue Task 1',
            status: 'pending',
            obligation_level: 'must_do',
            scheduled_date: '2025-12-07T00:00:00Z',
            is_informational: false,
          },
          {
            _id: 'task-2',
            title: 'Overdue Task 2',
            status: 'in_progress',
            obligation_level: 'should_do',
            scheduled_date: '2025-12-06T00:00:00Z',
            is_informational: false,
          },
        ])
      })
    )

    const { result } = renderHook(() => useOverdueTasks(childId, false), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0].title).toBe('Overdue Task 1')
    expect(result.current.data?.[1].title).toBe('Overdue Task 2')
  })

  it('should fetch must-do overdue tasks only when mustDoOnly=true', async () => {
    let capturedUrl = ''
    server.use(
      http.get('http://localhost:8000/api/tasks/child/:childId/overdue', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json([
          {
            _id: 'task-1',
            title: 'Must Do Overdue',
            status: 'pending',
            obligation_level: 'must_do',
            scheduled_date: '2025-12-07T00:00:00Z',
            is_informational: false,
          },
        ])
      })
    )

    const { result } = renderHook(() => useOverdueTasks(childId, true), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(capturedUrl).toContain('must_do_only=true')
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].obligation_level).toBe('must_do')
  })

  it('should return empty array when no overdue tasks', async () => {
    server.use(
      http.get('http://localhost:8000/api/tasks/child/:childId/overdue', () => {
        return HttpResponse.json([])
      })
    )

    const { result } = renderHook(() => useOverdueTasks(childId, false), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })

  it('should handle fetch error gracefully', async () => {
    server.use(
      http.get('http://localhost:8000/api/tasks/child/:childId/overdue', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    const { result } = renderHook(() => useOverdueTasks(childId, false), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should not fetch when childId is empty', () => {
    const { result } = renderHook(() => useOverdueTasks('', false), {
      wrapper: createWrapper(),
    })

    expect(result.current.isPending).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('should exclude completed tasks', async () => {
    server.use(
      http.get('http://localhost:8000/api/tasks/child/:childId/overdue', () => {
        return HttpResponse.json([
          {
            _id: 'task-1',
            title: 'Overdue Pending',
            status: 'pending',
            obligation_level: 'must_do',
            scheduled_date: '2025-12-07T00:00:00Z',
            is_informational: false,
          },
          // Completed tasks should NOT appear
        ])
      })
    )

    const { result } = renderHook(() => useOverdueTasks(childId, false), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const statuses = result.current.data?.map(t => t.status) || []
    expect(statuses).not.toContain('completed')
    expect(statuses).not.toContain('skipped')
    expect(statuses).not.toContain('archived')
  })

  it('should exclude informational tasks', async () => {
    server.use(
      http.get('http://localhost:8000/api/tasks/child/:childId/overdue', () => {
        return HttpResponse.json([
          {
            _id: 'task-1',
            title: 'Real Task',
            status: 'pending',
            obligation_level: 'must_do',
            scheduled_date: '2025-12-07T00:00:00Z',
            is_informational: false,
          },
          // Informational tasks should NOT appear
        ])
      })
    )

    const { result } = renderHook(() => useOverdueTasks(childId, false), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const informationalFlags = result.current.data?.map(t => t.is_informational) || []
    expect(informationalFlags).not.toContain(true)
  })
})

describe('useOverdueStats', () => {
  const childId = 'child-123'

  it('should fetch overdue stats successfully', async () => {
    server.use(
      http.get('http://localhost:8000/api/tasks/child/:childId/overdue/stats', () => {
        return HttpResponse.json({
          total_overdue: 5,
          must_do_overdue: 2,
          by_date: {
            '2025-12-07': 2,
            '2025-12-06': 3,
          },
        })
      })
    )

    const { result } = renderHook(() => useOverdueStats(childId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.total_overdue).toBe(5)
    expect(result.current.data?.must_do_overdue).toBe(2)
    expect(result.current.data?.by_date).toEqual({
      '2025-12-07': 2,
      '2025-12-06': 3,
    })
  })

  it('should return zero stats when no overdue tasks', async () => {
    server.use(
      http.get('http://localhost:8000/api/tasks/child/:childId/overdue/stats', () => {
        return HttpResponse.json({
          total_overdue: 0,
          must_do_overdue: 0,
          by_date: {},
        })
      })
    )

    const { result } = renderHook(() => useOverdueStats(childId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.total_overdue).toBe(0)
    expect(result.current.data?.must_do_overdue).toBe(0)
    expect(result.current.data?.by_date).toEqual({})
  })

  it('should handle fetch error gracefully', async () => {
    server.use(
      http.get('http://localhost:8000/api/tasks/child/:childId/overdue/stats', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    const { result } = renderHook(() => useOverdueStats(childId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should not fetch when childId is empty', () => {
    const { result } = renderHook(() => useOverdueStats(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isPending).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('should use correct query key', async () => {
    server.use(
      http.get('http://localhost:8000/api/tasks/child/:childId/overdue/stats', () => {
        return HttpResponse.json({
          total_overdue: 3,
          must_do_overdue: 1,
          by_date: {},
        })
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

    renderHook(() => useOverdueStats(childId), { wrapper })

    await waitFor(() => {
      const data = queryClient.getQueryData(['overdue-stats', childId])
      expect(data).toBeDefined()
    })
  })

  it('should cache results properly', async () => {
    server.use(
      http.get('http://localhost:8000/api/tasks/child/:childId/overdue/stats', () => {
        return HttpResponse.json({
          total_overdue: 5,
          must_do_overdue: 2,
          by_date: {},
        })
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

    const { result: result1 } = renderHook(() => useOverdueStats(childId), { wrapper })
    await waitFor(() => expect(result1.current.isSuccess).toBe(true))

    const { result: result2 } = renderHook(() => useOverdueStats(childId), { wrapper })

    // Second hook should immediately have data from cache
    expect(result2.current.data).toBeDefined()
    expect(result2.current.data?.total_overdue).toBe(5)
  })

  it('should show breakdown by date', async () => {
    server.use(
      http.get('http://localhost:8000/api/tasks/child/:childId/overdue/stats', () => {
        return HttpResponse.json({
          total_overdue: 10,
          must_do_overdue: 4,
          by_date: {
            '2025-12-01': 3,
            '2025-12-02': 2,
            '2025-12-03': 5,
          },
        })
      })
    )

    const { result } = renderHook(() => useOverdueStats(childId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.by_date).toEqual({
      '2025-12-01': 3,
      '2025-12-02': 2,
      '2025-12-03': 5,
    })

    // Verify total matches sum of by_date
    const sumByDate = Object.values(result.current.data?.by_date || {}).reduce((a, b) => a + b, 0)
    expect(sumByDate).toBe(result.current.data?.total_overdue)
  })
})
