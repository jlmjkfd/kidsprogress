import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../../test/utils'
import ChatWindow from '../ChatWindow'

// Mock fetch for chat API
global.fetch = vi.fn()

const mockChatHistory = [
  {
    _id: '1',
    role: 'user',
    content: 'Hello!',
    timestamp: new Date().toISOString()
  },
  {
    _id: '2',
    role: 'assistant',
    content: 'Hi there! How can I help you today?',
    timestamp: new Date().toISOString()
  }
]

const mockInitialState = {
  chat: {
    messages: mockChatHistory,
    loading: false,
    error: null
  }
}

describe('ChatWindow Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders chat window with messages', () => {
    render(<ChatWindow />, { preloadedState: mockInitialState })
    
    expect(screen.getByText('Hello!')).toBeInTheDocument()
    expect(screen.getByText('Hi there! How can I help you today?')).toBeInTheDocument()
  })

  it('renders empty state when no messages', () => {
    const emptyState = {
      chat: {
        messages: [],
        loading: false,
        error: null
      }
    }
    
    render(<ChatWindow />, { preloadedState: emptyState })
    
    expect(screen.getByText('Start a conversation!')).toBeInTheDocument()
    expect(screen.getByText('Ask me anything about your learning journey')).toBeInTheDocument()
  })

  it('sends message when form is submitted', async () => {
    const user = userEvent.setup()
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, messageId: 'new-message' })
    } as Response)

    render(<ChatWindow />, { preloadedState: mockInitialState })
    
    const input = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByText('Send')
    
    await user.type(input, 'Test message')
    await user.click(sendButton)
    
    expect(fetch).toHaveBeenCalledWith('/api/chat/message', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'text',
        userContent: 'Test message'
      })
    }))
  })

  it('clears input after sending message', async () => {
    const user = userEvent.setup()
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    } as Response)

    render(<ChatWindow />, { preloadedState: mockInitialState })
    
    const input = screen.getByPlaceholderText('Type your message...') as HTMLInputElement
    const sendButton = screen.getByText('Send')
    
    await user.type(input, 'Test message')
    expect(input.value).toBe('Test message')
    
    await user.click(sendButton)
    
    await waitFor(() => {
      expect(input.value).toBe('')
    })
  })

  it('disables send button when input is empty', () => {
    render(<ChatWindow />, { preloadedState: mockInitialState })
    
    const sendButton = screen.getByText('Send')
    expect(sendButton).toBeDisabled()
  })

  it('enables send button when input has text', async () => {
    const user = userEvent.setup()
    render(<ChatWindow />, { preloadedState: mockInitialState })
    
    const input = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByText('Send')
    
    expect(sendButton).toBeDisabled()
    
    await user.type(input, 'Test')
    expect(sendButton).not.toBeDisabled()
  })

  it('shows loading state while sending message', async () => {
    const user = userEvent.setup()
    
    // Mock a delayed response
    vi.mocked(fetch).mockImplementationOnce(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response), 100)
      )
    )

    render(<ChatWindow />, { preloadedState: mockInitialState })
    
    const input = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByText('Send')
    
    await user.type(input, 'Test message')
    await user.click(sendButton)
    
    // Should show loading state
    expect(screen.getByText('Sending...')).toBeInTheDocument()
  })

  it('handles send message error gracefully', async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    render(<ChatWindow />, { preloadedState: mockInitialState })
    
    const input = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByText('Send')
    
    await user.type(input, 'Test message')
    await user.click(sendButton)
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error sending message:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  it('scrolls to bottom when new messages are added', () => {
    const scrollIntoViewMock = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoViewMock

    render(<ChatWindow />, { preloadedState: mockInitialState })
    
    // Should scroll to bottom on initial render
    expect(scrollIntoViewMock).toHaveBeenCalled()
  })
})