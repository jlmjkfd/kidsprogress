# Child Portal UI Adjustment Plan

## Requirements Summary

### PC Version Changes
1. **Header**:
   - ✅ Back button (keep)
   - ✅ Kid's name only (remove "'s Portal")
   - ❌ Remove "Let's learn and play!"
   - ➕ Add stats (x tasks, x pts) to the right of kid's name
   - ➕ Move menu to left side (collapsible sidebar)

2. **Tabs**: Reduce from 3 to 2
   - Keep: List View, Calendar View
   - Remove: Overdue View (integrate into List View)

3. **List View Layout** (Split Screen):
   - **Left Column**: Today's Tasks
   - **Right Column**: Overdue Tasks

4. **Calendar View Layout** (Split Screen):
   - **Left Column**: Calendar
   - **Right Column**: Task List for selected date

5. **Remove**:
   - "Hide Informational Tasks" checkbox and related code

### Mobile Version
- **Header**: Back button + kid's name + stats + hamburger menu
- **Content**: Keep current mobile layout (single column, stacked)

## Implementation Plan

### Phase 1: Header Adjustments ✅
- [x] Remove "'s Portal" text
- [x] Remove subtitle
- [ ] Add inline stats to header (PC only)
- [ ] Create collapsible sidebar menu (PC)
- [ ] Keep hamburger menu for mobile

### Phase 2: Tab Simplification
- [ ] Change from 3 tabs to 2 tabs
- [ ] Remove "Overdue" tab
- [ ] Update ViewMode type

### Phase 3: List View Split Layout
- [ ] Create two-column layout for PC
- [ ] Left: Today's tasks
- [ ] Right: Overdue tasks
- [ ] Single column for mobile (stacked)

### Phase 4: Calendar View Split Layout
- [ ] Create two-column layout for PC
- [ ] Left: Calendar component
- [ ] Right: Task list for selected date
- [ ] Single column for mobile (stacked)

### Phase 5: Cleanup
- [ ] Remove informational tasks checkbox
- [ ] Remove related filter code
- [ ] Update responsive breakpoints

## Layout Mockups

### PC List View (Split Screen)
```
┌────────────────────────────────────────────────────┐
│ [←] Kid Name          ✓5 tasks•120pts    Lang [≡] │ Header
├────────────────────────────────────────────────────┤
│ [List View]  [Calendar View]                       │ Tabs
├─────────────────────────┬──────────────────────────┤
│ Today's Tasks          │ Overdue Tasks            │
│ ┌──────────────────┐  │ ┌──────────────────┐     │
│ │ Task 1  [Start]  │  │ │ Late Task [!]    │     │
│ └──────────────────┘  │ └──────────────────┘     │
│ ┌──────────────────┐  │ ┌──────────────────┐     │
│ │ Task 2  [Start]  │  │ │ Late Task [!]    │     │
│ └──────────────────┘  │ └──────────────────┘     │
└─────────────────────────┴──────────────────────────┘
```

### PC Calendar View (Split Screen)
```
┌────────────────────────────────────────────────────┐
│ [←] Kid Name          ✓5 tasks•120pts    Lang [≡] │
├────────────────────────────────────────────────────┤
│ [List View]  [Calendar View]                       │
├─────────────────────────┬──────────────────────────┤
│ Calendar                │ Tasks for Selected Date  │
│ ┌──────────────────┐   │ ┌──────────────────┐     │
│ │  S M T W T F S   │   │ │ Task 1  [Start]  │     │
│ │     1  2  3  4   │   │ └──────────────────┘     │
│ │  5 [6] 7  8  9   │   │ ┌──────────────────┐     │
│ │ 10 11 12 13 14   │   │ │ Task 2  [Start]  │     │
│ └──────────────────┘   │ └──────────────────┘     │
└─────────────────────────┴──────────────────────────┘
```

### Mobile (Stacked - Current Behavior)
```
┌─────────────────────┐
│ [←] Name  Stats [≡] │
├─────────────────────┤
│ [List] [Calendar]   │
├─────────────────────┤
│ Today's Tasks       │
│ ┌─────────────────┐ │
│ │ Task  [Start]   │ │
│ └─────────────────┘ │
│                     │
│ Overdue Tasks       │
│ ┌─────────────────┐ │
│ │ Late  [!]       │ │
│ └─────────────────┘ │
└─────────────────────┘
```

## Code Structure

### Files to Modify
1. `frontend/src/pages/child-portal/layout.tsx` - Header with stats
2. `frontend/src/pages/child-portal/tasks/index.tsx` - Main page logic
3. `frontend/src/i18n/locales/en/*.json` - Remove unused translations

### New Components Needed
- `SidebarMenu.tsx` - Collapsible sidebar for PC navigation
- Split layout components (or use CSS Grid)

### Responsive Strategy
```css
/* Mobile: Single column */
@media (max-width: 768px) {
  .split-layout { grid-template-columns: 1fr; }
}

/* Tablet & Desktop: Two columns */
@media (min-width: 769px) {
  .split-layout { grid-template-columns: 1fr 1fr; }
}
```

## Implementation Order
1. ✅ Header text adjustments (done)
2. Add stats to header
3. Change tabs from 3 to 2
4. Implement split layout for List View
5. Implement split layout for Calendar View
6. Remove informational tasks checkbox
7. Test responsive behavior
8. Create sidebar menu (optional enhancement)
