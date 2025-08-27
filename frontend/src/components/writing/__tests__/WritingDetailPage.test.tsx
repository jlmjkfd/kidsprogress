import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { render } from '../../../test/utils'
import WritingDetailPage from '../WritingDetailPage'
import { Writing } from '../../../models/Writing'

// Mock useParams
const mockUseParams = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => mockUseParams()
  }
})

const mockWritingDetail: Writing = {
  _id: '1',
  title: 'My Amazing Story',
  text: 'Once upon a time, there was a brave little mouse...',
  date: new Date('2024-01-15'),
  overall_score: 8,
  genre: 'Adventure',
  feedback_student: 'Great story! Your character development is excellent.',
  improved_text: 'Once upon a time, there was an incredibly brave little mouse...',
  rubric_scores: [
    {
      dimension: 'Creativity',
      criteria: [
        {
          criterion: 'Originality',
          score: 8,
          reason: 'Very creative and unique story ideas'
        },
        {
          criterion: 'Character Development',
          score: 9,
          reason: 'Well-developed characters with clear motivations'
        }
      ]
    },
    {
      dimension: 'Grammar',
      criteria: [
        {
          criterion: 'Spelling',
          score: 7,
          reason: 'Most words spelled correctly'
        }
      ]
    }
  ]
}

const mockInitialState = {
  writing: {
    writings: { '1': mockWritingDetail },
    loading: false,
    error: null
  }
}

describe('WritingDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays loading state correctly', () => {
    mockUseParams.mockReturnValue({ id: '1' })
    
    const loadingState = {
      writing: {
        writings: {},
        loading: true,
        error: null
      }
    }
    
    render(<WritingDetailPage />, { preloadedState: loadingState })
    
    expect(screen.getByText('Loading your story...')).toBeInTheDocument()
    expect(screen.getByText('📖')).toBeInTheDocument()
  })

  it('displays story not found when writing does not exist', () => {
    mockUseParams.mockReturnValue({ id: 'nonexistent' })
    
    const emptyState = {
      writing: {
        writings: {},
        loading: false,
        error: null
      }
    }
    
    render(<WritingDetailPage />, { preloadedState: emptyState })
    
    expect(screen.getByText('Story not found')).toBeInTheDocument()
    expect(screen.getByText('📭')).toBeInTheDocument()
  })

  it('displays invalid ID error when no ID provided', () => {
    mockUseParams.mockReturnValue({})
    
    render(<WritingDetailPage />, { preloadedState: mockInitialState })
    
    expect(screen.getByText('Invalid writing ID')).toBeInTheDocument()
    expect(screen.getByText('❓')).toBeInTheDocument()
  })

  it('renders writing detail correctly', () => {
    mockUseParams.mockReturnValue({ id: '1' })
    
    render(<WritingDetailPage />, { preloadedState: mockInitialState })
    
    expect(screen.getByText('My Amazing Story')).toBeInTheDocument()
    expect(screen.getByText('Once upon a time, there was a brave little mouse...')).toBeInTheDocument()
    expect(screen.getByText('8/10')).toBeInTheDocument()
    expect(screen.getByText('Overall Score')).toBeInTheDocument()
  })

  it('displays rubric scores correctly', () => {
    mockUseParams.mockReturnValue({ id: '1' })
    
    render(<WritingDetailPage />, { preloadedState: mockInitialState })
    
    expect(screen.getByText('Creativity')).toBeInTheDocument()
    expect(screen.getByText('Grammar')).toBeInTheDocument()
    expect(screen.getByText('Originality')).toBeInTheDocument()
    expect(screen.getByText('Character Development')).toBeInTheDocument()
    expect(screen.getByText('Very creative and unique story ideas')).toBeInTheDocument()
  })

  it('displays feedback when available', () => {
    mockUseParams.mockReturnValue({ id: '1' })
    
    render(<WritingDetailPage />, { preloadedState: mockInitialState })
    
    expect(screen.getByText('Your Teacher\'s Feedback')).toBeInTheDocument()
    expect(screen.getByText('Great story! Your character development is excellent.')).toBeInTheDocument()
  })

  it('displays improved text when available', () => {
    mockUseParams.mockReturnValue({ id: '1' })
    
    render(<WritingDetailPage />, { preloadedState: mockInitialState })
    
    expect(screen.getByText('Improved Version')).toBeInTheDocument()
    expect(screen.getByText('Once upon a time, there was an incredibly brave little mouse...')).toBeInTheDocument()
  })

  it('applies correct score colors based on score value', () => {
    mockUseParams.mockReturnValue({ id: '1' })
    
    render(<WritingDetailPage />, { preloadedState: mockInitialState })
    
    const scoreElement = screen.getByText('8').closest('div')
    expect(scoreElement).toHaveClass('from-yellow-400', 'to-orange-400')
  })

  it('displays correct score emojis', () => {
    mockUseParams.mockReturnValue({ id: '1' })
    
    render(<WritingDetailPage />, { preloadedState: mockInitialState })
    
    expect(screen.getByText('⭐')).toBeInTheDocument() // Score 8 should show star
  })

  it('formats date correctly', () => {
    mockUseParams.mockReturnValue({ id: '1' })
    
    render(<WritingDetailPage />, { preloadedState: mockInitialState })
    
    expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument()
  })

  it('shows character count', () => {
    mockUseParams.mockReturnValue({ id: '1' })
    
    render(<WritingDetailPage />, { preloadedState: mockInitialState })
    
    const characterCount = mockWritingDetail.text.length
    expect(screen.getByText(`${characterCount} characters`)).toBeInTheDocument()
  })
})