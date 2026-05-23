import '@testing-library/jest-dom'
import { beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Mock API responses for testing
export const handlers = [
  // Auth endpoints
  http.post('http://localhost:8000/api/auth/login', async ({ request }) => {
    const body = await request.json() as any
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        access_token: 'mock-access-token',
        user: {
          _id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          language: 'en'
        }
      })
    }
    return new HttpResponse(null, { status: 401 })
  }),

  http.post('http://localhost:8000/api/auth/register', async ({ request }) => {
    const body = await request.json() as any
    if (body.email && body.password) {
      return HttpResponse.json({
        access_token: 'mock-access-token',
        user: {
          _id: 'user-new',
          email: body.email,
          full_name: body.full_name,
          language: body.language || 'en'
        }
      })
    }
    return new HttpResponse(null, { status: 400 })
  }),

  http.post('http://localhost:8000/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out successfully' })
  }),

  http.get('http://localhost:8000/api/auth/me', () => {
    return HttpResponse.json({
      _id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      language: 'en'
    })
  }),

  // Parent PIN endpoints
  http.post('http://localhost:8000/api/auth/parent-pin/set', async ({ request }) => {
    const body = await request.json() as any
    if (body.pin && body.pin.length >= 4 && body.pin.length <= 6) {
      return HttpResponse.json({ message: 'PIN set successfully' })
    }
    return new HttpResponse(
      JSON.stringify({ detail: 'PIN must be 4-6 digits' }),
      { status: 400 }
    )
  }),

  http.post('http://localhost:8000/api/auth/parent-pin/verify', async ({ request }) => {
    const body = await request.json() as any
    // Mock: PIN '123456' is correct
    return HttpResponse.json({ valid: body.pin === '123456' })
  }),

  http.post('http://localhost:8000/api/auth/parent-pin/remove', () => {
    return HttpResponse.json({ message: 'PIN removed successfully' })
  }),

  http.get('http://localhost:8000/api/auth/parent-pin/status', () => {
    return HttpResponse.json({ has_pin: true })
  }),

  // Children endpoints
  http.get('http://localhost:8000/api/children', () => {
    return HttpResponse.json([])
  }),
]

const server = setupServer(...handlers)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
})

afterAll(() => {
  server.close()
})

export { server }
