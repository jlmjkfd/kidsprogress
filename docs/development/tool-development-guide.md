# Tool Development Guide

## Overview

Tools are plugins that provide utilities during task execution (e.g., timer, notes, calculator). Similar to task templates, tools use a plugin architecture for extensibility.

## Tool Architecture

### Plugin System
- **Registry**: Central registry manages all available tools
- **Plugins**: Self-contained components with their own state
- **System Tools**: Available to all tasks (timer, notes, calculator)
- **Custom Tools**: Future - parent-configured per task

### File Structure
```
frontend/src/tools/
├── types.ts              # Tool plugin interfaces
├── registry.ts           # Tool registry management
├── index.ts              # Entry point (registers all tools)
├── timer/
│   ├── TimerTool.tsx    # Timer component
│   └── index.ts         # Timer plugin registration
├── note/
│   ├── NoteTool.tsx     # Note component
│   └── index.ts         # Note plugin registration
└── calculator/
    ├── CalculatorTool.tsx # Calculator component
    └── index.ts          # Calculator plugin registration
```

## Creating a New Tool

### Step 1: Define Tool State Interface

```typescript
// frontend/src/tools/mytool/types.ts
export interface MyToolState {
  // Tool-specific state
  value: string;
  lastModified: string;
}
```

### Step 2: Create Tool Component

```typescript
// frontend/src/tools/mytool/MyTool.tsx
import { IconBulb } from '@tabler/icons-react';
import type { ToolProps } from '../types';
import type { MyToolState } from './types';

export default function MyTool({ state, onChange, isActive }: ToolProps) {
  const toolState = state as MyToolState;

  const handleChange = (newValue: string) => {
    onChange({
      ...toolState,
      value: newValue,
      lastModified: new Date().toISOString(),
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <IconBulb size={20} className="text-yellow-600" />
        <h3 className="font-semibold text-gray-900">My Tool</h3>
      </div>

      {/* Tool UI */}
      <input
        type="text"
        value={toolState.value}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg"
      />
    </div>
  );
}
```

### Step 3: Register Tool Plugin

```typescript
// frontend/src/tools/mytool/index.ts
import { IconBulb } from '@tabler/icons-react';
import type { ToolPlugin } from '../types';
import MyTool from './MyTool';

export const myToolPlugin: ToolPlugin = {
  id: 'mytool',                    // Unique identifier
  name: 'My Tool',                 // Display name
  icon: IconBulb,                  // Tabler icon
  description: 'Tool description', // Short description
  component: MyTool,               // React component
  defaultState: {                  // Initial state
    value: '',
    lastModified: undefined,
  },
  category: 'other',               // Tool category
  isSystemTool: true,              // Available to all tasks
};
```

### Step 4: Register in Main Index

```typescript
// frontend/src/tools/index.ts
import { registerTool } from './registry';
import { myToolPlugin } from './mytool';

// Register all tools
registerTool(myToolPlugin);
```

## Tool Props Interface

```typescript
export interface ToolProps {
  taskId: string;        // Current task ID
  childId: string;       // Child ID
  state: any;           // Tool-specific state
  onChange: (state: any) => void;  // Update state
  isActive: boolean;    // Whether tool is visible
}
```

## Tool Plugin Interface

```typescript
export interface ToolPlugin {
  id: string;                      // Unique ID
  name: string;                    // Display name
  icon: React.ComponentType;       // Icon component
  description: string;             // Description
  component: React.ComponentType<ToolProps>;  // Tool component
  defaultState: any;               // Initial state
  category: 'timer' | 'note' | 'calculator' | 'media' | 'other';
  isSystemTool: boolean;           // System vs custom tool
  requiresPermission?: boolean;    // Future: parent approval
}
```

## State Management

### Auto-Save Strategy
Tools use hybrid auto-save (same as template tasks):
- **localStorage**: Every 10 seconds (browser crash recovery)
- **Database**: Every 60 seconds (multi-device support)

### State Persistence
Tool states are saved to `task.progress_state.tools`:
```typescript
{
  "tools": {
    "timer": {
      "toolId": "timer",
      "state": { "elapsedSeconds": 120, "isRunning": false },
      "lastUpdated": "2025-12-11T10:30:00Z"
    },
    "note": {
      "toolId": "note",
      "state": { "content": "My notes..." },
      "lastUpdated": "2025-12-11T10:31:00Z"
    }
  }
}
```

### State Restoration
On task resume, tool states are restored from:
1. `task.progress_state.tools` (from database)
2. `localStorage` if database unavailable
3. `defaultState` if no saved data

## Best Practices

### 1. Single Responsibility
Each tool should do ONE thing well.

**Good**: Timer tool tracks time
**Bad**: Timer tool that also takes notes and calculates

### 2. Isolated State
Tool state should be self-contained.

**Good**:
```typescript
state: { elapsedSeconds: 120, isRunning: false }
```

**Bad**:
```typescript
state: { elapsedSeconds: 120, taskTitle: "...", childName: "..." }
```
(Don't duplicate data from task/child)

### 3. Immutable Updates
Always create new state objects.

**Good**:
```typescript
onChange({
  ...toolState,
  value: newValue,
});
```

**Bad**:
```typescript
toolState.value = newValue;
onChange(toolState);
```

### 4. Performance
Avoid expensive operations in render.

**Good**:
```typescript
const formatted = useMemo(() => formatTime(seconds), [seconds]);
```

**Bad**:
```typescript
const formatted = expensiveFormatTime(seconds); // Runs every render
```

### 5. Responsive Design
Tools must work on mobile, tablet, and desktop.

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
  {/* Buttons adapt to screen size */}
</div>
```

### 6. Internationalization
Use i18n for all user-facing text.

**Good**:
```typescript
{t('common:start')}
```

**Bad**:
```typescript
Start
```

## Tool Categories

### timer
Time tracking tools (stopwatch, countdown, etc.)

### note
Note-taking tools (text notes, voice notes, etc.)

### calculator
Math and calculation tools

### media
Media tools (photo, audio, video recording)

### other
Other utility tools

## System vs Custom Tools

### System Tools (Current)
- Available to ALL tasks automatically
- Defined by `isSystemTool: true`
- Examples: Timer, Notes, Calculator

### Custom Tools (Future)
- Parent configures which tools per task
- Defined by `isSystemTool: false`
- Requires parent approval
- Stored in task configuration

## Testing Tools

### Manual Testing
1. Create a standard task
2. Start the task → goes to execution page
3. Open each tool from sidebar
4. Test tool functionality
5. Close browser (test crash recovery)
6. Reopen task → verify state restored
7. Complete task → verify saved to completion

### Unit Testing
```typescript
// frontend/src/tools/mytool/__tests__/MyTool.test.tsx
import { render, screen } from '@testing-library/react';
import MyTool from '../MyTool';

test('renders tool with initial state', () => {
  const mockOnChange = jest.fn();
  render(
    <MyTool
      taskId="123"
      childId="456"
      state={{ value: 'test' }}
      onChange={mockOnChange}
      isActive={true}
    />
  );
  expect(screen.getByDisplayValue('test')).toBeInTheDocument();
});
```

## Common Patterns

### Pattern 1: Toggle State
```typescript
const handleToggle = () => {
  onChange({
    ...toolState,
    isActive: !toolState.isActive,
  });
};
```

### Pattern 2: Timed Updates
```typescript
useEffect(() => {
  if (!toolState.isRunning) return;

  const interval = setInterval(() => {
    onChange({
      ...toolState,
      value: toolState.value + 1,
    });
  }, 1000);

  return () => clearInterval(interval);
}, [toolState.isRunning, toolState.value, onChange]);
```

### Pattern 3: Auto-save on Change
```typescript
const handleChange = useCallback((newValue: string) => {
  onChange({
    ...toolState,
    value: newValue,
    lastSaved: new Date().toISOString(),
  });
}, [toolState, onChange]);
```

## Troubleshooting

### Tool state not saving
- Check auto-save intervals in UnifiedExecutionPage
- Verify `/api/completions/:id/save-progress` endpoint
- Check browser console for errors

### Tool not appearing
- Verify tool is registered in `tools/index.ts`
- Check `isSystemTool: true` for system tools
- Clear browser cache and rebuild

### State not restoring
- Check `task.progress_state.tools` in database
- Verify localStorage key: `execution-${taskId}`
- Check defaultState is defined

### Performance issues
- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers
- Avoid re-renders with React.memo

## Future Enhancements

### 1. Custom Tools
Allow parents to enable/disable tools per task.

### 2. Tool Permissions
Some tools require parent approval (e.g., camera access).

### 3. Tool Marketplace
Share custom tools with community.

### 4. Tool Analytics
Track tool usage patterns to improve UX.

### 5. Tool Interactions
Allow tools to communicate (e.g., timer feeds into analytics).

## Related Documentation

- [Task Template Development Guide](../templates/template-development-guide.md)
- [Architecture Patterns](../../.claude/skills/architecture-patterns.md)
- [Execution Flow](./execution-flow.md)
- [Component Map](../component-map.md)

## Questions?

Check existing tools for examples:
- **Timer**: Simple interval-based state updates
- **Note**: Text input with auto-save
- **Calculator**: Complex UI with history

Follow SOLID principles and design patterns from architecture-patterns.md.
