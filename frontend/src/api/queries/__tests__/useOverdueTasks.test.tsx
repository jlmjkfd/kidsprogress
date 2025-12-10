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
        return HttpResponse.json({
          must_do: [
            {
              task_id: 'task-1',
              title: 'Overdue Task 1',
              is_recurring: false,
              scheduled_date: '2025-12-07',
              completion_type: 'simple',
              has_metrics: false,
              has_quality_aspects: false,
              has_tools: false,
              has_subtasks: false,
              days_overdue: 3,
              task_source: 'one_time',
              description: null,
              task_type_code: null,
            },
          ],
          should_do: [
            {
              task_id: 'task-2',
              title: 'Overdue Task 2',
              is_recurring: false,
              scheduled_date: '2025-12-06',
              completion_type: 'simple',
              has_metrics: false,
              has_quality_aspects: false,
              has_tools: false,
              has_subtasks: false,
              days_overdue: 4,
              task_source: 'one_time',
              description: null,
              task_type_code: null,
            },
          ],
          optional: [],
        })
      })
    )

    const { result } = renderHook(() => useOverdueTasks(childId, false), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.must_do).toHaveLength(1)
    expect(result.current.data?.should_do).toHaveLength(1)
    expect(result.current.data?.optional).toHaveLength(0)
    expect(result.current.data?.must_do[0].title).toBe('Overdue Task 1')
    expect(result.current.data?.should_do[0].title).toBe('Overdue Task 2')
  })

  it('should fetch must-do overdue tasks only when mustDoOnly=true', async () => {
    let capturedUrl = ''
    server.use(
      http.get('http://localhost:8000/api/tasks/child/:childId/overdue', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({
          must_do: [
            {
              task_id: 'task-1',
              title: 'Must Do Overdue',
              is_recurring: false,
              scheduled_date: '2025-12-07',
              completion_type: 'simple',
              has_metrics: false,
              has_quality_aspects: false,
              has_tools: false,
              has_subtasks: false,
              days_overdue: 3,
              task_source: 'one_time',
              description: null,
              task_type_code: null,
            },
          ],
          should_do: [],
          optional: [],
        })
      })
    )

    const { result } = renderHook(() => useOverdueTasks(childId, true), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(capturedUrl).toContain('must_do_only=true')
    expect(result.current.data?.must_do).toHaveLength(1)
    expect(result.current.data?.should_do).toHaveLength(0)
    expect(result.current.data?.optional).toHaveLength(0)
  })

  it('should return empty groups when no overdue tasks', async () => {
    server.use(
      http.get('http://localhost:8000/api/tasks/child/:childId/overdue', () => {
        return HttpResponse.json({
          must_do: [],
          should_do: [],
          optional: [],
        })
      })
    )

    const { result } = renderHook(() => useOverdueTasks(childId, false), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.must_do).toEqual([])
    expect(result.current.data?.should_do).toEqual([])
    expect(result.current.data?.optional).toEqual([])
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

  it('should only include pending/in-progress tasks (backend filters completed/skipped/archived)', async () => {
    server.use(
      http.get('http://localhost:8000/api/tasks/child/:childId/overdue', () => {
        return HttpResponse.json({
          must_do: [
            {
              task_id: 'task-1',
              title: 'Overdue Pending',
              is_recurring: false,
              scheduled_date: '2025-12-07',
              completion_type: 'simple',
              has_metrics: false,
              has_quality_aspects: false,
              has_tools: false,
              has_subtasks: false,
              days_overdue: 3,
              task_source: 'one_time',
              description: null,
              task_type_code: null,
            },
          ],
          should_do: [],
          optional: [],
        })
      })
    )

    const { result } = renderHook(() => useOverdueTasks(childId, false), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Backend already filters out completed/skipped/archived tasks
    expect(result.current.data?.must_do).toHaveLength(1)
    expect(result.current.data?.must_do[0].title).toBe('Overdue Pending')
  })

  it('should only include actionable tasks (backend filters informational)', async () => {
    server.use(
      http.get('http://localhost:8000/api/tasks/child/:childId/overdue', () => {
        return HttpResponse.json({
          must_do: [
            {
              task_id: 'task-1',
              title: 'Real Task',
              is_recurring: false,
              scheduled_date: '2025-12-07',
              completion_type: 'simple',
              has_metrics: false,
              has_quality_aspects: false,
              has_tools: false,
              has_subtasks: false,
              days_overdue: 3,
              task_source: 'one_time',
              description: null,
              task_type_code: null,
            },
          ],
          should_do: [],
          optional: [],
        })
      })
    )

    const { result } = renderHook(() => useOverdueTasks(childId, false), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Backend already filters out informational tasks
    expect(result.current.data?.must_do).toHaveLength(1)
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
      const data = queryClient.getQueryData(['tasks', 'child', childId, 'overdue', 'stats'])
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
