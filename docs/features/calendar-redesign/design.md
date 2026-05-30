# Calendar Redesign - Design Document

**Date**: 2025-11-19
**Status**: Design Phase
**Priority**: High

## Current Problems

1. **Nested Button Issue**: Day cells and tasks inside are both clickable, causing HTML warning
2. **Limited View**: Only month view, can't see task details easily
3. **No Time-based Layout**: Can't see when tasks happen during the day
4. **No Task Type Differentiation**: Informational tasks shown same as actionable tasks

## Design Goals

1. **Multiple View Levels**: Year → Month → Week → Day
2. **Time-aware Display**: Show tasks at their scheduled times
3. **Task Type Visual Hierarchy**:
   - Actionable tasks: Full color
   - Informational tasks: Grey/muted
   - Breaks: Optional visibility toggle
4. **Flexible Layout**: Calendar + List combo view
5. **Mobile-first**: Works well on phones

## Proposed Architecture

### View Hierarchy

```
Year View (Optional - Future)
  └─> Month View (Grid of days)
       ├─> Click day → Day Detail Modal
       │    └─> Shows list of all tasks for that day
       └─> Switch to Week View (7 columns, time rows)
            └─> Switch to Day View (Single column, 24-hour timeline)
```

### Layout Options

**Option A: Integrated Calendar + List**
```
┌─────────────────────────────┐
│ [Month] [Week] [Day]  [≡]   │ ← View toggles
├─────────────────────────────┤
│   Calendar View Area        │
│   (Collapsible/Expandable)  │
│   - Compact: 1 line summary │
│   - Expanded: Full calendar │
├─────────────────────────────┤
│   Task List Below           │
│   - Filtered by selected    │
│     date/range              │
└─────────────────────────────┘
```

**Option B: Separate Tabs**
```
┌─────────────────────────────┐
│ [Calendar] [List]           │ ← Tab switcher
├─────────────────────────────┤
│                             │
│   Full Screen Calendar      │
│   OR                        │
│   Full Screen List          │
│                             │
└─────────────────────────────┘
```

**Recommendation**: **Option A** - Better for seeing context while managing tasks

## View Details

### 1. Month View (Default)

**Desktop/Tablet:**
```
   Mon  Tue  Wed  Thu  Fri  Sat  Sun
 ┌────┬────┬────┬────┬────┬────┬────┐
 │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │
 │ 🟦 │🟦🟦│    │🟦  │🟨  │    │    │
 │    │🟨  │    │    │    │    │    │
 ├────┼────┼────┼────┼────┼────┼────┤
 │ 8  │ 9  │...                     │
```

**Mobile:**
```
 ┌──────┬──────┐
 │  1   │  2   │
 │ 🟦   │🟦🟦  │
 │      │🟨    │
 ├──────┼──────┤
 │  3   │  4   │
```

**Features:**
- Click day → Open Day Detail Modal
- Color dots/bars for tasks (not full task cards)
- Day type background color (school day, holiday, weekend)
- Compact view for mobile

### 2. Week View

**Layout:**
```
Time   Mon    Tue    Wed    Thu    Fri    Sat    Sun
────┬──────┬──────┬──────┬──────┬──────┬──────┬──────
6am │      │      │      │      │      │      │
────┼──────┼──────┼──────┼──────┼──────┼──────┼──────
7am │ 🟥 School Time ──────────────────>│      │
────┼──────┼──────┼──────┼──────┼──────┼──────┼──────
8am │      │      │      │      │      │      │
────┼──────┼──────┼──────┼──────┼──────┼──────┼──────
9am │🟦Math│      │🟦Math│      │      │      │
```

**Features:**
- 24-hour timeline (scroll to current time)
- Tasks positioned at their scheduled time
- Grey blocks for informational tasks
- Crosses multiple time slots if needed

### 3. Day View

**Layout:**
```
┌─────────────────────────────┐
│   Monday, Nov 18, 2024      │ ← Date header
├──────┬──────────────────────┤
│ 6am  │                      │
│      │                      │
├──────┤  🟥 School Time      │ ← Informational (grey)
│ 7am  │  (blocks_other_tasks)│
│      │                      │
├──────┼──────────────────────┤
│ 8am  │                      │
│      │                      │
├──────┤  🟦 Math Homework    │ ← Actionable task
│ 9am  │  [Start Button]      │
│      │                      │
├──────┼──────────────────────┤
│ 10am │  ⏸️ Break            │ ← Optional (toggle)
├──────┼──────────────────────┤
│ 11am │                      │
```

**Features:**
- Full task cards with actions
- Unscheduled tasks section at bottom
- Color-coded by type
- Swipe left/right to change day (mobile)

## Task Display Logic

### Task Types

```typescript
// Display rules
const taskDisplayRules = {
  // Actionable tasks - full color, clickable
  actionable: {
    condition: (task) => !isInformationalTask(task),
    style: 'full-color',
    showActions: true,
    showInBreakToggle: false
  },

  // Informational tasks - grey, no actions
  informational: {
    condition: (task) => task.blocks_other_tasks && task.scheduling_type === 'fixed_time',
    style: 'grey-muted',
    showActions: false,
    showInBreakToggle: false,
    examples: ['School Time', 'Sleep Time']
  },

  // Break tasks - optional visibility
  break: {
    condition: (task) => task.title.includes('Break') || task.task_type === 'break',
    style: 'light-color',
    showActions: false,
    showInBreakToggle: true, // Can hide with toggle
    examples: ['Morning Break', 'Snack Time']
  }
}
```

### Time Handling

```typescript
interface TaskTimeInfo {
  // Planned time (from task creation)
  plannedStart?: string;  // HH:MM
  plannedEnd?: string;    // HH:MM

  // Actual time (from execution)
  actualStart?: string;   // ISO datetime
  actualEnd?: string;     // ISO datetime

  // Display priority
  displayTime: string;    // Use actual if available, else planned

  // No specific time
  allDay: boolean;        // Show in "unscheduled" section
}
```

**Display Rules:**
1. If `actualStart` exists → Use actual time (green dot indicator)
2. Else if `fixed_time_slot` exists → Use fixed time
3. Else if `preferred_time_slot` exists → Use preferred time (dotted border)
4. Else → Show in "Unscheduled Tasks" section

## Component Structure

```
TaskCalendarPage/
├── ViewSelector                  # Month/Week/Day toggle
├── CalendarControls              # Date navigation, today button
├── CalendarExpandToggle          # Collapse/Expand button
│
├── MonthView (default)
│   ├── MonthGrid
│   │   └── DayCell (div, not button)
│   │       └── TaskDots (colored indicators)
│   └── DayDetailModal (on day click)
│       └── DayTaskList
│
├── WeekView
│   ├── WeekHeader (7 days)
│   ├── TimeGrid (24 rows)
│   └── TaskBlocks (positioned by time)
│
├── DayView
│   ├── DayHeader
│   ├── HourGrid (24 rows)
│   ├── ScheduledTaskBlocks
│   └── UnscheduledTaskSection
│
└── TaskListSection
    ├── FilterControls
    └── TaskCards
```

## Mobile Considerations

### Month View - Mobile
- 2-3 columns per row (not 7)
- Larger tap targets (min 44px)
- Swipe to change month

### Week View - Mobile
- Horizontal scroll for 7 days
- Pinch to zoom time scale
- Snap to current time

### Day View - Mobile
- Vertical scroll through 24 hours
- Pull to refresh
- Swipe left/right to change day

## Color Scheme

```typescript
const taskColors = {
  actionable: {
    must_do: '#EF4444',      // Red - urgent
    should_do: '#3B82F6',    // Blue - normal
    can_do: '#10B981',       // Green - optional
  },

  informational: '#9CA3AF',  // Grey - non-actionable

  break: '#F59E0B',          // Amber - breaks (optional)

  completed: '#6B7280',      // Grey - done

  dayType: {
    school_day: '#DBEAFE',   // Light blue bg
    holiday: '#FEE2E2',      // Light red bg
    weekend: '#D1FAE5',      // Light green bg
  }
}
```

## Implementation Plan

### Phase 1: Fix Current Month View ✅
- [x] Make DayCell clickable div (not button)
- [x] Add DayDetailModal
- [x] Show task list in modal

### Phase 2: Enhanced Month View
- [ ] Add task dots/indicators on days
- [ ] Show day type background colors
- [ ] Improve modal styling
- [ ] Add task filtering in modal

### Phase 3: Day View
- [ ] Create 24-hour timeline component
- [ ] Position tasks at scheduled times
- [ ] Distinguish informational vs actionable
- [ ] Add unscheduled tasks section
- [ ] Add break toggle

### Phase 4: Week View
- [ ] Create week grid layout
- [ ] Multi-column timeline
- [ ] Responsive mobile layout

### Phase 5: View Integration
- [ ] Add view switcher
- [ ] Calendar collapse/expand toggle
- [ ] Integrate with task list below
- [ ] State persistence (remember view preference)

### Phase 6: Polish
- [ ] Animations and transitions
- [ ] Accessibility (keyboard navigation)
- [ ] Touch gestures (swipe, pinch)
- [ ] Performance optimization

## Open Questions

1. **Year view needed?** Probably not for MVP - add later if needed
2. **Calendar position?** Top of page vs side panel?
3. **Default view?** Month or Day? (Suggest: Month on desktop, Day on mobile)
4. **Break tasks toggle?** Global setting or per-view?
5. **Past tasks?** Show greyed out or hide completely?

## Next Steps

1. Get user confirmation on design direction
2. Start with Phase 2 (Enhanced Month View)
3. Implement DayDetailModal improvements
4. Add Day View (most useful for kids)
5. Add Week View
6. Integrate everything

---

**Decision needed**: Approve this design and proceed with implementation?
