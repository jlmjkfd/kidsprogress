import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCreateChild } from '../useCreateChild'
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

describe('useCreateChild', () => {
  const mockChildData = {
    name: 'Alice',
    date_of_birth: '2018-05-15',
    pin_required: false,
  }

  const mockCreatedChild = {
    _id: 'child-new',
    parent_id: 'parent-1',
    name: 'Alice',
    date_of_birth: '2018-05-15',
    avatar_url: null,
    pin_required: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  it('should create child successfully', async () => {
    server.use(
      http.post('http://localhost:8000/api/children', async ({ request }) => {
        const body = await request.json() as any
        return HttpResponse.json({
          ...mockCreatedChild,
          name: body.name,
          date_of_birth: body.date_of_birth,
          pin_required: body.pin_required,
        })
      })
    )

    const { result } = renderHook(() => useCreateChild(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(mockChildData)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toMatchObject({
      name: 'Alice',
      date_of_birth: '2018-05-15',
      pin_required: false,
    })
  })

  it('should send correct request payload', async () => {
    let requestBody: any = null

    server.use(
      http.post('http://localhost:8000/api/children', async ({ request }) => {
        requestBody = await request.json()
        return HttpResponse.json(mockCreatedChild)
      })
    )

    const { result } = renderHook(() => useCreateChild(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(mockChildData)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(requestBody).toMatchObject(mockChildData)
  })

  it('should return created child data with ID', async () => {
    server.use(
      http.post('http://localhost:8000/api/children', () => {
        return HttpResponse.json(mockCreatedChild)
      })
    )

    const { result } = renderHook(() => useCreateChild(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(mockChildData)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?._id).toBe('child-new')
    expect(result.current.data?.name).toBe('Alice')
  })

  it('should invalidate children query on success', async () => {
    server.use(
      http.post('http://localhost:8000/api/children', () => {
        return HttpResponse.json(mockCreatedChild)
      }),
      http.get('http://localhost:8000/api/children', () => {
        return HttpResponse.json([mockCreatedChild])
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

    // Pre-populate cache
    queryClient.setQueryData(['children'], [])

    const { result } = renderHook(() => useCreateChild(), { wrapper })

    result.current.mutate(mockChildData)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Check that children query was invalidated
    await waitFor(() => {
      const childrenData = queryClient.getQueryState(['children'])
      expect(childrenData?.isInvalidated).toBe(true)
    })
  })

  it('should handle creation error', async () => {
    server.use(
      http.post('http://localhost:8000/api/children', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Validation error' }),
          { status: 400 }
        )
      })
    )

    const { result } = renderHook(() => useCreateChild(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(mockChildData)

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should handle validation error', async () => {
    server.use(
      http.post('http://localhost:8000/api/children', () => {
        return new HttpResponse(
          JSON.stringify({ detail: 'Invalid date_of_birth format' }),
          { status: 422 }
        )
      })
    )

    const { result } = renderHook(() => useCreateChild(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      name: 'Alice',
      date_of_birth: 'invalid-date',
      pin_required: false,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should handle network error', async () => {
    server.use(
      http.post('http://localhost:8000/api/children', () => {
        return HttpResponse.error()
      })
    )

    const { result } = renderHook(() => useCreateChild(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(mockChildData)

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })

  it('should create child with PIN', async () => {
    const childDataWithPin = {
      name: 'Bob',
      date_of_birth: '2020-03-20',
      pin: '1234',
      pin_required: true,
    }

    server.use(
      http.post('http://localhost:8000/api/children', async ({ request }) => {
        const body = await request.json() as any
        return HttpResponse.json({
          ...mockCreatedChild,
          _id: 'child-pin',
          name: body.name,
          date_of_birth: body.date_of_birth,
          pin_required: body.pin_required,
        })
      })
    )

    const { result } = renderHook(() => useCreateChild(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(childDataWithPin)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pin_required).toBe(true)
  })
})
