# Template Plugin Development Guide

## Overview

This guide walks you through creating a new task template plugin from scratch. Templates are self-contained plugins that provide all UI components, configuration, and translations needed for a specific task type.

## Architecture

The KidsProgress template system follows a **plugin architecture** where each template is a self-contained module:

```
frontend/src/templates/
├── _shared/
│   └── types/
│       └── plugin-interface.ts    # Common interfaces
├── registry.ts                     # Plugin registry
├── addition-subtraction/           # Example template
│   ├── components/
│   │   ├── SettingsEditor.tsx     # Configuration UI (task modal)
│   │   ├── TaskExecutor.tsx       # Execution UI (child portal)
│   │   ├── AnalysisView.tsx       # Analysis UI (parent portal)
│   │   └── AttemptView.tsx        # Attempt detail UI
│   ├── locales/
│   │   ├── en/
│   │   │   └── translation.json   # English translations
│   │   └── zh/
│   │       └── translation.json   # Chinese translations
│   ├── index.ts                    # Plugin export
│   └── manifest.json               # Plugin metadata
└── writing/                        # Another template
    └── ...
```

## Plugin Interface

Every template must implement the `TemplatePlugin` interface:

```typescript
interface TemplatePlugin {
  // Metadata
  id: string;
  name: string;
  version: string;
  handlerType: string;
  description: string;
  author?: string;
  tags?: string[];

  // Required components (4 components)
  components: {
    SettingsEditor: React.ComponentType<SettingsEditorProps>;  // Task creation/edit
    TaskExecutor: React.ComponentType<TaskExecutorProps>;      // Task execution
    AnalysisView: React.ComponentType<AnalysisViewProps>;      // Progress analysis
    AttemptView: React.ComponentType<AttemptViewProps>;        // Attempt details
  };

  // Configuration
  configSchema: JSONSchema;
  defaultConfig: Record<string, any>;

  // i18n (namespace: template-{id})
  i18n?: TemplateI18nResources;

  // Optional hooks
  hooks?: PluginHooks;
}
```

### TaskExecutorProps Interface

The `TaskExecutorProps` interface provides all necessary props for task execution:

```typescript
interface TaskExecutorProps<TExecution = unknown, TCompletion = unknown> {
  // Task identification
  taskId: string;

  // Execution data (from prepare endpoint)
  executionData: TExecution;

  // Completion handler - call when task is finished
  onComplete: (data: TCompletion) => Promise<void>;

  // Cancel handler - navigate back without completing
  onCancel: () => void;

  // Auto-complete flag - set to true after onComplete succeeds
  setIsComplete: (completed: boolean) => void;

  // Save/resume support (NEW - all templates should implement)
  onSaveProgress?: (data: Partial<TCompletion>) => Promise<void>;
  savedProgress?: Partial<TCompletion>;
}
```

**Key Props:**

- `onSaveProgress` - Call this to save current state without completing
- `savedProgress` - Contains previously saved data when resuming
- Always check `if (onSaveProgress)` before showing save button
- Always initialize state from `savedProgress` if provided

## Step-by-Step Guide

### Step 1: Create Template Folder Structure

```bash
mkdir -p frontend/src/templates/my-template/components
mkdir -p frontend/src/templates/my-template/locales/en
mkdir -p frontend/src/templates/my-template/locales/zh
```

### Step 2: Create Plugin Manifest

Create `manifest.json`:

```json
{
  "id": "my-template",
  "name": "My Template",
  "version": "1.0.0",
  "handlerType": "my-handler",
  "description": "Description of what this template does",
  "author": "Your Name",
  "tags": ["category", "type"]
}
```

### Step 3: Implement Required Components

#### 3.1 SettingsEditor Component

Shown in task creation/edit modal for configuration.

```typescript
// components/SettingsEditor.tsx
import type { SettingsEditorProps } from '@/templates/_shared/types/plugin-interface';

export default function SettingsEditor({ config, onChange, template }: SettingsEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Setting Name
        </label>
        <input
          type="text"
          value={config.settingName || ''}
          onChange={(e) => onChange({ ...config, settingName: e.target.value })}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      {/* Add more settings fields */}
    </div>
  );
}
```

#### 3.2 TaskExecutor Component

Shown when child executes the task. **All templates should support save/resume functionality.**

```typescript
// components/TaskExecutor.tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IconSend, IconLoader, IconDeviceFloppy } from '@tabler/icons-react';
import type { TaskExecutorProps } from '@/templates/_shared/types/plugin-interface';

export default function TaskExecutor({
  taskId,
  executionData,
  onComplete,
  onCancel,
  setIsComplete,
  onSaveProgress,      // Optional: for save/resume support
  savedProgress,       // Optional: previously saved data
}: TaskExecutorProps) {
  const { t } = useTranslation(['tasks', 'common']);

  // Initialize state from savedProgress if resuming
  const [data, setData] = useState(savedProgress || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [startedAt] = useState(savedProgress?.started_at || new Date().toISOString());

  // Auto-save every 60 seconds (recommended)
  useEffect(() => {
    if (!onSaveProgress) return;

    const interval = setInterval(async () => {
      // Only auto-save if there's meaningful content
      if (Object.keys(data).length > 0) {
        try {
          await onSaveProgress({
            ...data,
            started_at: startedAt,
          });
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [data, startedAt, onSaveProgress]);

  const handleSaveAndExit = async () => {
    if (!onSaveProgress) return;

    setIsSaving(true);
    try {
      await onSaveProgress({
        ...data,
        started_at: startedAt,
      });
      onCancel(); // Navigate back after saving
    } catch {
      setIsSaving(false);
      // Handle error
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete({
        ...data,
        started_at: startedAt,
      });
      setIsComplete(true); // Auto-mark task as complete
    } catch {
      setIsSubmitting(false);
      // Handle error
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Your task execution UI */}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isSubmitting || isSaving}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          {t('common:cancel')}
        </button>

        {/* Save button - only show if save is supported */}
        {onSaveProgress && (
          <button
            onClick={handleSaveAndExit}
            disabled={isSubmitting || isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <IconLoader size={20} className="animate-spin" />
                <span>{t('tasks:execution.saving')}</span>
              </>
            ) : (
              <>
                <IconDeviceFloppy size={20} />
                <span>{t('tasks:save_and_exit')}</span>
              </>
            )}
          </button>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <IconLoader size={20} className="animate-spin" />
              <span>{t('tasks:execution.submitting')}</span>
            </>
          ) : (
            <>
              <IconSend size={20} />
              <span>{t('tasks:execution.submit')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
```

**Key Points for Save/Resume:**

1. **Initialize from savedProgress**: Use `savedProgress` to restore state when resuming
2. **Auto-save**: Implement 60-second auto-save interval to prevent data loss
3. **Save button**: Show "Save and Exit" button when `onSaveProgress` is available
4. **Preserve started_at**: Use the original `started_at` timestamp from savedProgress
5. **Handle loading states**: Disable buttons during save/submit operations

**How Save/Resume Works:**

```
1. Child starts task → savedProgress is undefined → initialize with empty/default state
2. Child enters data → auto-saves every 60 seconds to database
3. Child clicks "Save and Exit" → saves immediately and navigates back
4. Task list shows "Resume" button → because task.status is "in_progress"
5. Child clicks "Resume" → savedProgress contains previous data
6. TaskExecutor initializes → loads savedProgress into state
7. Child continues → can save again or submit to complete
```

**Backend Integration:**

The framework automatically handles save/resume on the backend:
- Frontend sends progress data to `/api/completions/{taskId}/save-progress`
- Backend stores as `task.progress_state.template_data`
- Prepare endpoint returns saved data if it exists
- No backend handler changes needed

#### 3.3 AnalysisView Component

Shown in parent portal for progress analysis.

```typescript
// components/AnalysisView.tsx
import type { AnalysisViewProps } from '@/templates/_shared/types/plugin-interface';

export default function AnalysisView({ templateId, childId, completions }: AnalysisViewProps) {
  const stats = {
    total: completions.length,
    // Calculate stats from completions
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Progress Overview</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Completions</div>
        </div>
        {/* More stats */}
      </div>
      {/* Recent attempts list */}
    </div>
  );
}
```

#### 3.4 AttemptView Component

Shown when viewing a specific attempt's details.

```typescript
// components/AttemptView.tsx
import type { AttemptViewProps } from '@/templates/_shared/types/plugin-interface';

export default function AttemptView({ completion }: AttemptViewProps) {
  const data = completion.detailed_data;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <h3 className="text-xl font-bold mb-4">Attempt Details</h3>
        {/* Display attempt data */}
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
}
```

### Step 4: Create i18n Files

#### English (locales/en/translation.json)

```json
{
  "name": "My Template",
  "description": "Template description",
  "settings": {
    "setting_name": "Setting Name",
    "setting_hint": "Hint text for this setting"
  },
  "executor": {
    "title": "Task Title",
    "submit": "Submit",
    "cancel": "Cancel"
  },
  "attempt": {
    "details": "Attempt Details",
    "score": "Score",
    "time": "Time"
  }
}
```

#### Chinese (locales/zh/translation.json)

```json
{
  "name": "我的模板",
  "description": "模板描述",
  "settings": {
    "setting_name": "设置名称",
    "setting_hint": "此设置的提示文本"
  },
  "executor": {
    "title": "任务标题",
    "submit": "提交",
    "cancel": "取消"
  },
  "attempt": {
    "details": "尝试详情",
    "score": "得分",
    "time": "时间"
  }
}
```

### Step 5: Create Plugin Export

Create `index.ts`:

```typescript
import type { TemplatePlugin } from '../_shared/types/plugin-interface';
import SettingsEditor from './components/SettingsEditor';
import TaskExecutor from './components/TaskExecutor';
import AnalysisView from './components/AnalysisView';
import AttemptView from './components/AttemptView';
import manifest from './manifest.json';
import en from './locales/en/translation.json';
import zh from './locales/zh/translation.json';

const configSchema = {
  type: 'object',
  properties: {
    settingName: {
      type: 'string',
      description: 'Description of this setting',
    },
    // Add more properties
  },
  required: ['settingName'],
};

const defaultConfig = {
  settingName: 'default value',
  // Add defaults for all settings
};

export const myTemplatePlugin: TemplatePlugin = {
  id: manifest.id,
  name: manifest.name,
  version: manifest.version,
  handlerType: manifest.handlerType,
  description: manifest.description,
  author: manifest.author,
  tags: manifest.tags,
  components: {
    SettingsEditor,
    TaskExecutor,
    AnalysisView,
    AttemptView,
  },
  configSchema,
  defaultConfig,
  i18n: {
    en,
    zh,
  },
};

export default myTemplatePlugin;
```

### Step 6: Register Plugin

Update `templates/registry.ts`:

```typescript
import myTemplatePlugin from './my-template';

const pluginRegistry = new Map<string, TemplatePlugin>([
  [additionSubtractionPlugin.id, additionSubtractionPlugin],
  [writingPlugin.id, writingPlugin],
  [myTemplatePlugin.id, myTemplatePlugin], // Add your plugin
]);
```

### Step 7: Implement Backend Handler

Create backend handler at `backend/templates/my-template/handler.py`:

```python
from typing import Dict, Any
from backend.templates.base import BaseHandler

class MyTemplateHandler(BaseHandler):
    """Handler for my-template tasks"""

    def prepare_execution(self, task: dict, config: dict) -> Dict[str, Any]:
        """Prepare data needed for task execution"""
        return {
            "handler_type": "my-handler",
            "config": config,
            # Add execution data
        }

    def process_completion(
        self,
        task: dict,
        config: dict,
        completion_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process completion data and calculate results"""
        detailed_data = {
            # Structure the completion data
        }

        measured_data = {
            # Calculate metrics
        }

        return {
            "detailed_data": detailed_data,
            "measured_data": measured_data,
        }
```

Register in `backend/templates/registry.py`:

```python
from backend.templates.my_template.handler import MyTemplateHandler

TEMPLATE_HANDLERS = {
    "addition-subtraction": AdditionSubtractionHandler,
    "writing": WritingHandler,
    "my-template": MyTemplateHandler,  # Add here
}
```

## Component Integration Points

### Where Components Are Used

1. **SettingsEditor**:
   - Task creation modal (`/parent-portal/children/[id]`)
   - Task edit modal
   - Shown when `template_id` is selected

2. **TaskExecutor**:
   - Task execution page (`/child-portal/[childId]/tasks/execute/[taskId]`)
   - Retrieved via plugin registry based on `task.template_id`

3. **AnalysisView**:
   - Analysis page (`/parent-portal/analysis/[templateId]`)
   - Shows aggregated data for all completions

4. **AttemptView**:
   - Attempt detail page (`/child-portal/[childId]/tasks/attempts/[taskId]`)
   - Shows individual attempt details
   - Retrieved via `getPlugin(task.template_id).components.AttemptView`

## Using Template i18n

In your components, use the template-specific namespace:

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  // Use template-{id} as namespace
  const { t } = useTranslation(['template-my-template']);

  return (
    <div>
      <h1>{t('template-my-template:name')}</h1>
      <p>{t('template-my-template:description')}</p>
    </div>
  );
}
```

## Best Practices

### 1. Component Independence
Each component should be self-contained and not depend on other template components.

### 2. Mobile-First Design
All components must work on mobile, tablet, and desktop. Use responsive Tailwind classes:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

### 3. i18n Everything
Never hardcode user-facing text. Always use translation keys:
```tsx
// ❌ Bad
<button>Submit</button>

// ✅ Good
<button>{t('template-my-template:executor.submit')}</button>
```

### 4. Error Handling
Always handle errors gracefully:
```tsx
try {
  await onComplete(data);
  setIsComplete(true);
} catch (error) {
  setError(t('template-my-template:executor.submit_failed'));
}
```

### 5. Loading States
Show loading indicators for async operations:
```tsx
{isLoading && <LoadingSpinner />}
```

### 6. TypeScript Types
Use proper types from the plugin interface:
```tsx
import type { TaskExecutorProps } from '@/templates/_shared/types/plugin-interface';
```

## Testing

### Component Testing
```typescript
import { render, screen } from '@testing-library/react';
import TaskExecutor from '../TaskExecutor';

describe('TaskExecutor', () => {
  it('renders correctly', () => {
    render(
      <TaskExecutor
        taskId="test"
        executionData={{ handler_type: 'my-handler' }}
        onComplete={jest.fn()}
        onCancel={jest.fn()}
        setIsComplete={jest.fn()}
      />
    );
    expect(screen.getByText(/submit/i)).toBeInTheDocument();
  });
});
```

## Example Templates

### Simple Example: Addition-Subtraction
See `frontend/src/templates/addition-subtraction/` for a math practice template.

**Features:**
- Question-based execution
- Timer support
- Auto-grading
- Performance analytics

### Complex Example: Writing (with Save/Resume)
See `frontend/src/templates/writing/` for a content creation template with AI feedback.

**Features:**
- **Full save/resume support** - Auto-saves every 60 seconds
- **Resume from saved progress** - Restores title and content on resume
- Title and content inputs
- Word count tracking
- AI feedback generation
- Mobile-responsive design

**Study this template for save/resume implementation:**
- [TaskExecutor.tsx](../../../frontend/src/templates/writing/components/TaskExecutor.tsx) - Shows complete save/resume pattern
- Auto-save useEffect hook (lines 34-55)
- handleSaveAndExit function (lines 80-96)
- State initialization from savedProgress (lines 20-21)
- Save and Exit button UI (lines 199-218)

## Checklist

Before submitting your template:

- [ ] All 4 components implemented (SettingsEditor, TaskExecutor, AnalysisView, AttemptView)
- [ ] **Save/resume functionality implemented in TaskExecutor**
- [ ] **Auto-save every 60 seconds**
- [ ] **Initialize state from savedProgress prop**
- [ ] **Save and Exit button shown when onSaveProgress available**
- [ ] Both English and Chinese translations provided
- [ ] Plugin registered in `registry.ts`
- [ ] Backend handler implemented and registered
- [ ] Mobile-responsive design tested
- [ ] No hardcoded strings (all i18n)
- [ ] TypeScript types properly used
- [ ] Error handling implemented
- [ ] Loading states shown (isSubmitting, isSaving)
- [ ] Component tests written
- [ ] Manifest.json created with correct metadata

## Common Pitfalls

1. **Forgetting AttemptView** - This component is required for viewing attempt details
2. **Not implementing save/resume** - All templates should support saving progress
3. **Hardcoding strings** - Always use i18n, even for simple text
4. **Not registering plugin** - Plugin won't be found without registry entry
5. **Missing backend handler** - Frontend needs backend to prepare/process data
6. **Ignoring mobile** - Test on mobile viewport (320px-768px)
7. **Not using proper types** - Import types from plugin-interface.ts
8. **Forgetting i18n export** - Plugin must export i18n resources
9. **Not initializing from savedProgress** - Always check `savedProgress` prop to restore state
10. **Missing auto-save interval cleanup** - Return cleanup function in useEffect

## Resources

- [Plugin Interface](../../../frontend/src/templates/_shared/types/plugin-interface.ts)
- [Plugin Registry](../../../frontend/src/templates/registry.ts)
- [Addition-Subtraction Example](../../../frontend/src/templates/addition-subtraction/)
- [Writing Example](../../../frontend/src/templates/writing/)
