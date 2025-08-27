import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/utils'
import { Sidebar, MenuItem } from '../Sidebar'

const mockMenuItems: MenuItem[] = [
  {
    label: '🎨 Language Arts',
    children: [
      { label: '🇺🇸 English', path: '/english' },
      { label: '✏️ Writing', path: '/writing' }
    ]
  },
  {
    label: '🔢 Math',
    children: [
      { label: 'Algebra', path: '/math/algebra' },
      { label: 'Geometry', path: '/math/geometry' }
    ]
  },
  {
    label: '📚 Simple Item',
    path: '/simple'
  }
]

describe('Sidebar Component', () => {
  it('renders menu items correctly', () => {
    render(<Sidebar items={mockMenuItems} />)
    
    expect(screen.getByText('🎨 Language Arts')).toBeInTheDocument()
    expect(screen.getByText('🔢 Math')).toBeInTheDocument()
    expect(screen.getByText('📚 Simple Item')).toBeInTheDocument()
  })

  it('expands and collapses menu items with children', async () => {
    const user = userEvent.setup()
    render(<Sidebar items={mockMenuItems} />)
    
    // Children should not be visible initially
    expect(screen.queryByText('🇺🇸 English')).not.toBeInTheDocument()
    
    // Click to expand
    await user.click(screen.getByText('🎨 Language Arts'))
    
    // Children should now be visible
    expect(screen.getByText('🇺🇸 English')).toBeInTheDocument()
    expect(screen.getByText('✏️ Writing')).toBeInTheDocument()
    
    // Click to collapse
    await user.click(screen.getByText('🎨 Language Arts'))
    
    // Children should be hidden again
    expect(screen.queryByText('🇺🇸 English')).not.toBeInTheDocument()
  })

  it('navigates to correct path for simple items', async () => {
    const user = userEvent.setup()
    render(<Sidebar items={mockMenuItems} />)
    
    await user.click(screen.getByText('📚 Simple Item'))
    
    // Check if navigation occurred (URL should contain /simple)
    expect(window.location.pathname).toBe('/simple')
  })

  it('applies correct styling for different depth levels', () => {
    render(<Sidebar items={mockMenuItems} />)
    
    const topLevelItem = screen.getByText('🎨 Language Arts').closest('div')
    expect(topLevelItem).toHaveClass('bg-gradient-to-r', 'from-purple-100', 'to-pink-100')
  })

  it('displays expand/collapse indicator for items with children', () => {
    render(<Sidebar items={mockMenuItems} />)
    
    // Items with children should have the sparkle indicator
    const languageArtsItem = screen.getByText('🎨 Language Arts').closest('div')
    expect(languageArtsItem?.querySelector('.text-purple-500')).toBeInTheDocument()
    
    // Simple items should not have the indicator
    const simpleItem = screen.getByText('📚 Simple Item').closest('div')
    expect(simpleItem?.querySelector('.text-purple-500')).not.toBeInTheDocument()
  })

  it('adds appropriate icons for items without emojis', () => {
    const itemsWithoutEmojis: MenuItem[] = [
      { label: 'Language Arts', path: '/language' },
      { label: 'Math', path: '/math' },
      { label: 'Writing', path: '/writing' }
    ]
    
    render(<Sidebar items={itemsWithoutEmojis} />)
    
    // Should add appropriate icons based on label content
    expect(screen.getByText('🎨')).toBeInTheDocument() // Language Arts
    expect(screen.getByText('🔢')).toBeInTheDocument() // Math
    expect(screen.getByText('✏️')).toBeInTheDocument() // Writing
  })

  it('handles nested menu items correctly', async () => {
    const user = userEvent.setup()
    render(<Sidebar items={mockMenuItems} />)
    
    // Expand Language Arts
    await user.click(screen.getByText('🎨 Language Arts'))
    
    // Navigate to English
    await user.click(screen.getByText('🇺🇸 English'))
    
    expect(window.location.pathname).toBe('/english')
  })
})