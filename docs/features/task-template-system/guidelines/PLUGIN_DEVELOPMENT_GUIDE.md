# Template Plugin Development Guide

## Introduction

This guide shows you how to create a new task template plugin. Each template is a self-contained module with its own settings, execution logic, and analysis.

## Prerequisites

- Understanding of React and TypeScript (frontend)
- Understanding of Python and FastAPI (backend)
- Familiarity with the task system basics

## Plugin Structure

Every template plugin has **3 components**:

### 1. Settings Editor
Shows in task creation modal. Parent configures template-specific settings.

### 2. Task Executor
Main execution page. Child completes the task here.
- Controls its own completion logic via `setIsComplete(true)`
- Can save progress (resume functionality)
- Submits completion data when done

### 3. Analysis View
Custom analysis page with charts, insights, AI feedback.

## Step-by-Step Guide

### Step 1: Choose Template Name

Use kebab-case for folder name (e.g., `math-quiz`, `reading-tracker`)

### Step 2: Create Frontend Plugin

```bash
# Create plugin folder
mkdir -p frontend/src/templates/your-template-name
cd frontend/src/templates/your-template-name
```

Create these files:
```
your-template-name/
  index.ts              # Plugin export
  manifest.json         # Metadata
  components/
    SettingsEditor.tsx  # Settings UI
    TaskExecutor.tsx    # Execution page
    AnalysisView.tsx    # Analysis page
  hooks/
    useYourTemplate.ts  # Custom hooks
  types/
    config.ts           # Config types
  utils/
    validation.ts       # Helper functions
```

**manifest.json**:
```json
{
  "id": "your-template-name",
  "name": "Your Template Name",
  "version": "1.0.0",
  "handlerType": "your_handler_type",
  "description": "Brief description",
  "author": "Your Name",
  "tags": ["math", "practice"]
}
```

**index.ts**:
```typescript
import type { TemplatePlugin } from '../_shared/types/plugin-interface';
import SettingsEditor from './components/SettingsEditor';
import TaskExecutor from './components/TaskExecutor';
import AnalysisView from './components/AnalysisView';
import manifest from './manifest.json';

export const yourTemplatePlugin: TemplatePlugin = {
  ...manifest,
  components: {
    SettingsEditor,
    TaskExecutor,
    AnalysisView,
  },
  configSchema: {
    type: 'object',
    properties: {
      // Define your config schema
      setting1: { type: 'number', minimum: 1 },
      setting2: { type: 'boolean' },
    },
    required: ['setting1'],
  },
  defaultConfig: {
    setting1: 10,
    setting2: true,
  },
};

export default yourTemplatePlugin;
```

### Step 3: Implement Settings Editor

```tsx
// components/SettingsEditor.tsx
import type { SettingsEditorProps } from '../../_shared/types/plugin-interface';

export default function SettingsEditor({ config, onChange, template }: SettingsEditorProps) {
  const handleChange = (field: string, value: any) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
      <h4 className="font-medium text-gray-900">Practice Settings</h4>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Setting 1
        </label>
        <input
          type="number"
          value={config.setting1 ?? 10}
          onChange={(e) => handleChange('setting1', parseInt(e.target.value))}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={config.setting2 ?? true}
          onChange={(e) => handleChange('setting2', e.target.checked)}
          className="w-4 h-4"
        />
        <label className="text-sm font-medium text-gray-700">
          Enable Setting 2
        </label>
      </div>
    </div>
  );
}
```

### Step 4: Implement Task Executor

```tsx
// components/TaskExecutor.tsx
import { useState, useEffect } from 'react';
import type { TaskExecutorProps } from '../../_shared/types/plugin-interface';

export default function TaskExecutor({
  taskId,
  executionData,
  onComplete,
  onCancel,
  setIsComplete,
}: TaskExecutorProps) {
  const [state, setState] = useState({
    // Your state here
  });

  // Example: Auto-complete when conditions met
  useEffect(() => {
    if (/* completion condition */) {
      setIsComplete(true);  // Host system will auto-complete task
    }
  }, [state]);

  const handleSubmit = async () => {
    const completionData = {
      // Your completion data
    };

    await onComplete(completionData);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Your execution UI here */}

        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 text-white py-3 rounded-lg"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
```

### Step 5: Implement Analysis View

```tsx
// components/AnalysisView.tsx
import type { AnalysisViewProps } from '../../_shared/types/plugin-interface';

export default function AnalysisView({
  templateId,
  childId,
  completions,
}: AnalysisViewProps) {
  // Calculate metrics from completions
  const metrics = useMemo(() => {
    // Your analysis logic
  }, [completions]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Progress Analysis</h2>

      {/* Your charts and insights */}
    </div>
  );
}
```

### Step 6: Register Frontend Plugin

```typescript
// frontend/src/templates/registry.ts

import yourTemplatePlugin from './your-template-name';

const PLUGIN_REGISTRY = new Map<string, TemplatePlugin>([
  // ... existing plugins
  ['your-template-name', yourTemplatePlugin],
]);
```

### Step 7: Create Backend Plugin

```bash
# Create backend plugin folder
mkdir -p backend/templates/your-template-name
cd backend/templates/your-template-name
```

Create these files:
```
your-template-name/
  __init__.py
  manifest.json
  handler.py           # Execution handler
  analyzer.py          # Analysis logic
  config.py            # Pydantic config model
  tests/
    test_handler.py
```

**config.py**:
```python
from pydantic import BaseModel, Field

class YourTemplateConfig(BaseModel):
    """Configuration for your template."""
    setting1: int = Field(default=10, ge=1, description="Setting 1")
    setting2: bool = Field(default=True, description="Enable setting 2")
```

**handler.py**:
```python
from typing import Dict, Any
from backend.templates._shared.base_handler import TemplateHandler
from backend.models.task_template import TaskCompletion
from .config import YourTemplateConfig

class YourTemplateHandler(TemplateHandler):
    """Handler for your template."""

    def __init__(self, config: YourTemplateConfig):
        self.config = config

    async def validate_config(self, config: Dict[str, Any]) -> None:
        """Validate configuration."""
        if config.get('setting1', 0) < 1:
            raise ValueError("setting1 must be >= 1")

    async def prepare_execution(self, task_id: str) -> Dict[str, Any]:
        """Prepare execution data for frontend."""
        return {
            "handler_type": "your_handler_type",
            "config": self.config.model_dump(),
            # Your execution data
        }

    async def process_completion(
        self, task_id: str, child_id: str, data: Dict[str, Any]
    ) -> TaskCompletion:
        """Process completion data."""
        # Create TaskCompletion object
        pass

    async def calculate_metrics(self, completion: TaskCompletion) -> Dict[str, Any]:
        """Calculate metrics."""
        return {
            # Your metrics
        }

    async def should_auto_complete(self, completion: TaskCompletion) -> bool:
        """Return True to auto-complete task."""
        # Your completion logic
        return True  # or False
```

### Step 8: Register Backend Plugin

```python
# backend/templates/registry.py

from .your_template_name.handler import YourTemplateHandler

HANDLER_REGISTRY: Dict[str, Type[TemplateHandler]] = {
    # ... existing handlers
    "your_handler_type": YourTemplateHandler,
}
```

### Step 9: Add Configuration Model

```python
# backend/models/execution_configs.py

from .your_template_name.config import YourTemplateConfig

# Add to EXECUTION_CONFIG_MAP
EXECUTION_CONFIG_MAP = {
    # ... existing configs
    "your_handler_type": YourTemplateConfig,
}
```

### Step 10: Update Task Model (CRITICAL)

**IMPORTANT**: Ensure `template_id` and `execution_config` fields exist in Task models.

These fields should already exist in `backend/models/task.py`:

```python
# In TaskBase, TaskCreate, and TaskUpdate models:
# Template-based task fields
template_id: Optional[str] = None
execution_config: Optional[Dict[str, Any]] = None
```

And in `backend/services/task_service/crud.py`, ensure they're included in task_doc:

```python
# In create_task method:
task_doc = {
    # ... other fields
    # Template-based task fields
    "template_id": task_data.template_id,
    "execution_config": task_data.execution_config,
    # ... remaining fields
}
```

**Why this matters**: Without these fields, tasks won't know which template executor to use and won't navigate to the execution page.

### Step 11: Create Database Seed Script

```python
# backend/scripts/seed_your_template.py

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime

async def seed_template():
    client = AsyncIOMotorClient("mongodb://localhost:27016")
    db = client["kidsprogress"]
    collection = db["task_templates"]

    template = {
        "_id": ObjectId(),
        "template_id": f"tmpl_{ObjectId()}",
        "name": "Your Template Name",
        "description": "Description of your template",
        "category_path": "Category/Subcategory",
        "execution_handler": "your_handler_type",
        "execution_config": {
            "setting1": 10,
            "setting2": True,
        },
        "created_by": ObjectId("000000000000000000000000"),
        "is_public": True,
        "tags": ["tag1", "tag2"],
        "version": 1,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    existing = await collection.find_one({"name": template["name"]})
    if existing:
        print(f"Template already exists: {existing['template_id']}")
        return

    await collection.insert_one(template)
    print(f"Created template: {template['template_id']}")

if __name__ == "__main__":
    asyncio.run(seed_template())
```

### Step 12: Add i18n Translations

```json
// frontend/src/i18n/locales/en/tasks.json
{
  "handlers": {
    "your_handler_type": "Your Template Name"
  }
}

// frontend/src/i18n/locales/zh/tasks.json
{
  "handlers": {
    "your_handler_type": "您的模板名称"
  }
}
```

### Step 13: Test Your Plugin

```bash
# Seed template to database
python -m backend.scripts.seed_your_template

# Test in UI:
# 1. Go to Template Library
# 2. Find your template
# 3. Add to collection
# 4. Create task with custom settings
# 5. Child executes task
# 6. Check completion and analysis
```

## Best Practices

### 1. Use Shared Components

Reuse components from `_shared/` folder:
```tsx
import { Timer } from '../../_shared/components/Timer';
import { SubmitButton } from '../../_shared/components/SubmitButton';
```

### 2. Handle Auto-Save

For long tasks, implement auto-save:
```tsx
import { useAutoSave } from '../../_shared/hooks/useAutoSave';

function TaskExecutor() {
  const { saveProgress } = useAutoSave(taskId);

  useEffect(() => {
    const interval = setInterval(() => {
      saveProgress({ state: /* current state */ });
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);
}
```

### 3. Validation

Validate both frontend and backend:
```typescript
// Frontend
const validateConfig = (config) => {
  if (config.setting1 < 1) {
    return { valid: false, error: "Must be >= 1" };
  }
  return { valid: true };
};

// Backend
async def validate_config(self, config):
    if config.get('setting1', 0) < 1:
        raise ValueError("setting1 must be >= 1")
```

### 4. Error Handling

```tsx
try {
  await onComplete(data);
} catch (error) {
  console.error('Completion error:', error);
  alert(t('tasks:submission_error'));
}
```

### 5. Responsive Design

All components must work on mobile:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols */}
</div>
```

## Checklist

Before submitting your plugin:

- [ ] Frontend plugin structure created
- [ ] Backend handler implemented
- [ ] Configuration schema defined
- [ ] Settings editor working
- [ ] Task executor with completion logic
- [ ] Analysis view with charts
- [ ] **Task model includes `template_id` and `execution_config` fields**
- [ ] **TaskCRUD saves `template_id` and `execution_config` to database**
- [ ] Seed script created
- [ ] i18n translations added (EN + ZH)
- [ ] Plugin registered in both registries
- [ ] Tested end-to-end (verify navigation to executor works)
- [ ] Documentation updated
- [ ] Tests written

## Common Issues

### Plugin not appearing in library
- Check seed script ran successfully
- Verify `is_public: true` in template
- Check MongoDB connection

### Settings not saving
- Verify `execution_config` in Task model
- Check config passed to handler correctly

### Task not navigating to execution page
**Symptom**: Clicking "Start" shows pause/complete buttons but doesn't navigate to executor
**Cause**: `template_id` not being saved to database
**Fix**:
1. Verify `TaskCreate` model has `template_id` field in `backend/models/task.py`
2. Verify `TaskCRUD.create_task()` includes `template_id` in `task_doc` dictionary
3. Delete old tasks and create new ones after fix

### Auto-complete not working
- Ensure `should_auto_complete()` returns True
- Check `setIsComplete(true)` called in executor

## Need Help?

- Read [ARCHITECTURE_ANALYSIS.md](./ARCHITECTURE_ANALYSIS.md) for design details
- Check existing templates for examples
- Ask in team chat
