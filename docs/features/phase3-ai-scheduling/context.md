# Phase 3: AI Scheduling & Dynamic Replanning

**Status**: ✅ Complete
**Date Completed**: 2025-11-16
**Related To**: Enhanced Task Management (Phase 1)

## Overview

AI-powered task recommendation and dynamic schedule replanning using Gemini LLM. Provides context-aware "What should I do now?" recommendations and automatically reorganizes schedules when tasks run longer than expected.

## Key Features

### 1. Day Tasks Summary
- Comprehensive aggregation of all tasks and time blocks for a given day
- Statistics: task counts by status/source, total estimated minutes
- Used as context for AI recommendations

### 2. AI Task Recommendations
- "What should I do now?" button triggers AI recommendation
- Context-aware analysis considering:
  - Current time (testable parameter)
  - Child's recent activity
  - Time since last break
  - Scheduled tasks and time blocks
  - Task priorities and obligations
- Returns:
  - Suggested task with reasoning
  - Priority score (0-100)
  - Break suggestion if needed (>45min work or after physical tasks)
  - Alternative task options
  - Conflict warnings

### 3. Conflict Detection
- Time block overlaps
- Prerequisite violations (tasks depending on incomplete tasks)
- Break needs (working too long without rest)
- Severity levels: warning, error

### 4. Dynamic Replanning
- Auto-triggered when tasks run >10 minutes over estimate
- Strategies:
  - Shift remaining tasks later in day
  - Move lower-priority tasks to tomorrow
  - Remove optional tasks if needed
- Returns list of changes with explanations

### 5. Child Portal Integration
- Kid-friendly UI with large buttons (64-72px min-height)
- Gradient backgrounds, rounded corners
- Task sections: Working On, Paused, To Do
- Points display (completed today + total)
- Break Timer component with SVG circular progress
- Filter tabs: Today / All Tasks

## Technical Implementation

### Backend

**Models** ([backend/models/ai_recommendation.py](../../../backend/models/ai_recommendation.py))
- `ChildState` - Current context for recommendations
- `TaskRecommendation` - AI recommendation response
- `ScheduleConflict` - Conflict detection results
- `ReplannedSchedule` - Replanning response
- `DayTasksSummary` - Day aggregation response

**Service** ([backend/services/ai_schedule_service.py](../../../backend/services/ai_schedule_service.py))
- `get_day_tasks()` - Aggregate all tasks for a day
- `get_recommendation()` - AI recommendation with testable `current_time` parameter
- `detect_conflicts()` - Find time conflicts, prerequisite issues, break needs
- `replan_schedule()` - Dynamic replanning with testable `current_time` parameter
- `_time_ranges_overlap()` - Helper for time conflict detection

**Routes** ([backend/routes/ai_schedule_routes.py](../../../backend/routes/ai_schedule_routes.py))
- `GET /api/ai/schedule/day-tasks` - Get day summary
- `POST /api/ai/schedule/recommend` - Get AI recommendation
- `GET /api/ai/schedule/conflicts` - Detect conflicts
- `POST /api/ai/schedule/replan` - Trigger replanning

### Frontend

**Queries** ([frontend/src/api/queries/useAISchedule.ts](../../../frontend/src/api/queries/useAISchedule.ts))
- `useDayTasks` - Fetch day summary
- `useAIRecommendation` - Fetch AI recommendation
- `useScheduleConflicts` - Fetch conflicts

**Mutations** ([frontend/src/api/mutations/useAIScheduleMutations.ts](../../../frontend/src/api/mutations/useAIScheduleMutations.ts))
- `useReplanSchedule` - Trigger replanning

**Components**
- [AIRecommendationButton.tsx](../../../frontend/src/components/AIRecommendationButton.tsx) - "What should I do now?" UI
- [BreakTimer.tsx](../../../frontend/src/components/BreakTimer.tsx) - SVG circular break timer
- [tasks.tsx (parent)](../../../frontend/src/pages/parent-portal/children/[id]/tasks.tsx) - Integrated AI features
- [tasks/index.tsx (child)](../../../frontend/src/pages/child-portal/tasks/index.tsx) - Kid-friendly task interface

**Types** ([frontend/src/types/ai_recommendation.ts](../../../frontend/src/types/ai_recommendation.ts))
- Frontend TypeScript definitions matching backend models

**i18n**
- English: [en/tasks.json](../../../frontend/src/i18n/locales/en/tasks.json)
- Chinese: [zh/tasks.json](../../../frontend/src/i18n/locales/zh/tasks.json)
- Added 17+ keys for AI features and child portal

## API Endpoints

All endpoints documented in [api-registry.md](../../api-registry.md#ai-powered-features-phase-3)

## Testing Considerations

### Testable Time Parameter
Both recommendation and replanning endpoints accept `current_time` in request body:
```json
{
  "current_time": "2025-11-16T14:30:00Z"
}
```
This allows simulating different times of day during testing without changing system time.

### Test Scenarios
1. **Morning recommendation** - Should prioritize must-do tasks
2. **After long work** - Should suggest break
3. **After physical task** - Should suggest mental task (variety)
4. **Task runs long** - Should trigger replanning, shift remaining tasks
5. **Time block conflict** - Should detect and warn
6. **Prerequisite missing** - Should not recommend dependent task

## Key Design Decisions

1. **`current_time` as parameter** - User requested this for testing flexibility
2. **Day tasks aggregation** - Needed comprehensive context for AI to make good decisions
3. **Break detection logic** - >45min work OR after physical tasks
4. **Replanning threshold** - >10min over estimate to avoid too-frequent replans
5. **Kid-friendly UI** - Large buttons (64-72px), gradients, visual icons
6. **SVG progress ring** - Better performance than CSS animations

## Related Documentation

- [API Registry](../../api-registry.md) - All endpoints
- [Component Map](../../component-map.md) - Reusable components and hooks
- [Task Types](../../../frontend/src/types/task.ts) - Core task types
- [AI Recommendation Types](../../../frontend/src/types/ai_recommendation.ts) - AI-specific types

## Next Steps

Phase 3 is complete. Potential future enhancements:
- Progress visualization for child portal
- More sophisticated AI prompts for recommendations
- Parent override for AI recommendations
- Historical learning from child's task completion patterns
- Integration with AI chat for explaining recommendations
