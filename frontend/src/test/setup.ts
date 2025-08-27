import '@testing-library/jest-dom'
import { beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Mock API responses for testing
export const handlers = [
  http.get('/api/analytics/summary', () => {
    return HttpResponse.json({
      totalWritings: 5,
      averageScore: 8.2,
      totalTime: 120
    })
  }),
  
  http.get('/api/writing', () => {
    return HttpResponse.json([
      {
        _id: '1',
        title: 'Test Story',
        text: 'This is a test story.',
        date: new Date().toISOString(),
        overall_score: 8
      }
    ])
  }),
  
  http.get('/api/writing/:id', ({ params }) => {
    return HttpResponse.json({
      _id: params.id,
      title: 'Test Story Detail',
      text: 'This is a detailed test story.',
      date: new Date().toISOString(),
      overall_score: 8,
      genre: 'Adventure',
      feedback_student: 'Great story! Keep up the good work.',
      rubric_scores: [
        {
          dimension: 'Creativity',
          criteria: [
            {
              criterion: 'Originality',
              score: 8,
              reason: 'Creative and unique ideas'
            }
          ]
        }
      ]
    })
  }),
  
  http.post('/api/chat/message', () => {
    return HttpResponse.json({
      success: true,
      messageId: 'test-message-id'
    })
  })
]

const server = setupServer(...handlers)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})