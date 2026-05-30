---
name: responsive-design
description: Mobile-first responsive design with Tailwind: required breakpoints (sm/md/lg/xl), grid patterns, ≥44px touch targets, every page works on phone/tablet/desktop. Use for any UI/layout change in frontend/src/pages or frontend/src/components.
---

# Responsive Design Guidelines

## Mobile-First Approach

ALL frontend pages MUST be responsive and work seamlessly across:
- **Mobile phones** (320px - 640px)
- **Tablets** (641px - 1024px)
- **Desktop** (1025px+)

## Tailwind CSS Breakpoints

Use Tailwind's responsive prefixes consistently:

```
Default (mobile): No prefix
sm: 640px and up (small tablets)
md: 768px and up (tablets)
lg: 1024px and up (desktop)
xl: 1280px and up (large desktop)
2xl: 1536px and up (extra large)
```

## Layout Patterns

### Grid Layouts

Always start with 1 column for mobile:

```tsx
// 鉁?CORRECT: Mobile-first grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Items */}
</div>

// 鉂?WRONG: Desktop-first (breaks on mobile)
<div className="grid grid-cols-3 gap-4">
  {/* Items */}
</div>
```

### Flex Layouts

Stack vertically on mobile, horizontal on larger screens:

```tsx
// 鉁?CORRECT
<div className="flex flex-col md:flex-row gap-4">
  {/* Items */}
</div>

// 鉂?WRONG: Always horizontal (overflows on mobile)
<div className="flex flex-row gap-4">
  {/* Items */}
</div>
```

### Container Widths

Use max-width containers with responsive padding:

```tsx
// 鉁?CORRECT
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>

// Mobile: 16px padding (px-4)
// Small: 24px padding (sm:px-6)
// Large: 32px padding (lg:px-8)
```

## Typography

### Text Sizes

Scale text appropriately for screen size:

```tsx
// Headings
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  Title
</h1>

// Body text
<p className="text-sm md:text-base lg:text-lg">
  Description
</p>

// Small text
<span className="text-xs sm:text-sm">
  Caption
</span>
```

### Line Height & Letter Spacing

Adjust for readability on different screens:

```tsx
<p className="text-base leading-relaxed md:leading-loose">
  Longer text content...
</p>
```

## Spacing

### Padding

Scale padding with screen size:

```tsx
// Sections
<section className="p-4 md:p-6 lg:p-8">
  {/* Content */}
</section>

// Cards
<div className="p-4 sm:p-6">
  {/* Card content */}
</div>
```

### Margins

Use responsive margins for separation:

```tsx
<div className="mb-4 md:mb-6 lg:mb-8">
  {/* Content */}
</div>
```

### Gaps

Responsive gaps in flex/grid:

```tsx
<div className="flex gap-2 md:gap-4 lg:gap-6">
  {/* Items */}
</div>
```

## Navigation

### Mobile Navigation

For complex navigation, use hamburger menus on mobile:

```tsx
// Parent Portal Layout - Sidebar hidden on mobile
<div className="hidden md:block w-64">
  {/* Sidebar navigation */}
</div>

// Mobile menu toggle
<button className="md:hidden" onClick={toggleMenu}>
  <IconMenu />
</button>
```

### Tab Navigation

Horizontal scrolling for mobile tabs:

```tsx
<nav className="flex gap-2 overflow-x-auto py-2">
  {/* Tabs with whitespace-nowrap */}
</nav>
```

## Interactive Elements

### Touch Targets

Minimum 44x44px for mobile touch:

```tsx
// 鉁?CORRECT: Large enough tap target
<button className="px-6 py-3 min-h-[44px] min-w-[44px]">
  Click Me
</button>

// 鉂?WRONG: Too small for mobile
<button className="px-2 py-1">
  Click Me
</button>
```

### Buttons

Scale button size and text:

```tsx
<button className="px-4 py-2 md:px-6 md:py-3 text-sm md:text-base">
  Action
</button>
```

### Forms

Full-width inputs on mobile:

```tsx
<input
  className="w-full md:w-auto px-4 py-2"
  type="text"
/>
```

## Images & Media

### Responsive Images

```tsx
// Scale images appropriately
<img
  className="w-full md:w-1/2 lg:w-1/3 h-auto"
  src={imageUrl}
  alt="Description"
/>
```

### Avatar Sizes

```tsx
<div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full">
  {/* Avatar */}
</div>
```

## Common Responsive Patterns

### Two-Column Layout

```tsx
// Mobile: Stack vertically
// Desktop: Side by side
<div className="flex flex-col lg:flex-row gap-6">
  <div className="lg:w-1/3">
    {/* Sidebar */}
  </div>
  <div className="lg:w-2/3">
    {/* Main content */}
  </div>
</div>
```

### Card Grids

```tsx
// 1 column mobile, 2 tablet, 3 desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <div key={item.id} className="bg-white rounded-lg p-4">
      {/* Card content */}
    </div>
  ))}
</div>
```

### Modal/Dialog

Full screen on mobile, centered on desktop:

```tsx
<div className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:w-full">
  {/* Modal content */}
</div>
```

## Header Patterns

### Portal Headers

```tsx
// Mobile: Compact header
// Desktop: Larger with more padding
<header className="bg-white shadow-sm">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
    <div className="flex items-center justify-between">
      <h1 className="text-xl md:text-2xl font-bold">
        KidsProgress
      </h1>
      {/* Actions */}
    </div>
  </div>
</header>
```

## Testing Checklist

Before marking a page as complete, verify:

- [ ] Page renders correctly at 320px width (smallest mobile)
- [ ] Page renders correctly at 640px width (tablet portrait)
- [ ] Page renders correctly at 768px width (tablet landscape)
- [ ] Page renders correctly at 1024px width (desktop)
- [ ] Page renders correctly at 1920px width (large desktop)
- [ ] No horizontal scrolling on mobile (unless intentional for tabs)
- [ ] All text is readable without zooming
- [ ] All buttons/links are easily tappable on mobile (44x44px minimum)
- [ ] Navigation works well on all screen sizes
- [ ] Images scale properly without distortion
- [ ] Forms are usable on mobile devices

## Example: Responsive Page

```tsx
export default function ResponsivePage() {
  return (
    // Mobile-first container
    <div className="min-h-screen bg-gray-50">
      {/* Responsive header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
            Page Title
          </h1>
        </div>
      </header>

      {/* Responsive content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 lg:py-12">
        {/* Responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {items.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-lg p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Responsive card content */}
              <h3 className="text-lg md:text-xl font-semibold mb-2">
                {item.title}
              </h3>
              <p className="text-sm md:text-base text-gray-600">
                {item.description}
              </p>
              <button className="mt-4 w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Action
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
```

## Common Mistakes to Avoid

### 鉂?Fixed Widths

```tsx
// DON'T use fixed widths that break on mobile
<div className="w-[800px]"> {/* Breaks on mobile */}
```

### 鉂?Non-Responsive Text

```tsx
// DON'T use single text size
<h1 className="text-4xl"> {/* Too large on mobile */}

// DO scale text
<h1 className="text-2xl md:text-3xl lg:text-4xl">
```

### 鉂?Horizontal Overflow

```tsx
// DON'T let content overflow horizontally
<div className="flex gap-4 w-full"> {/* May overflow */}

// DO allow wrapping or scrolling
<div className="flex flex-wrap gap-4 w-full">
```

### 鉂?Tiny Touch Targets

```tsx
// DON'T make buttons too small for mobile
<button className="px-1 py-1 text-xs"> {/* Too small */}

// DO make buttons touchable
<button className="px-4 py-3 min-h-[44px]">
```

## Summary

- **Always start with mobile layout**
- **Use Tailwind responsive prefixes** (`sm:`, `md:`, `lg:`)
- **Test at multiple breakpoints** before completing
- **Ensure touch targets are 44x44px minimum**
- **Avoid fixed widths**, use responsive sizing
- **Scale text, spacing, and images** appropriately
- **Consider navigation patterns** for different screen sizes
