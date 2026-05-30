# Context: Task Template System

## Current State

### Existing Code

**Backend (Complete):**
- Models: TaskTemplate, TaskCompletion, AnalysisReport, QuestionBank, ContentProvider
- Services: Execution handler framework with PassiveFormHandler
- Routes: Template CRUD, Completion submission
- Tests: 31 unit tests (100% passing)

**Frontend (80% Complete):**
- Types: Complete TypeScript definitions
- API Hooks: TanStack Query hooks for all endpoints
- Components: PassiveFormExecutor, Template list page
- Missing: Template creation UI, Task execution page

**Related Components:**
- Task system: `backend/models/task.py` (modified to add template_id)
- Task creation modal: `frontend/src/pages/parent-portal/children/[id]/components/UnifiedTaskModal.tsx`
- Child portal: `frontend/src/pages/child-portal/`

**Related APIs:**
- `/api/tasks` - Task CRUD (existing)
- `/api/templates` - Template CRUD (new)
- `/api/completions` - Completion recording (new)

**Related Database Models:**
- `tasks` collection - Modified to include template_id field
- `task_templates` collection - New
- `task_completions` collection - New
- `question_banks` collection - New

### File Locations

```
frontend/src/
  ✅ types/template.ts - Complete TypeScript types
  ✅ api/queries/useTemplates.ts - Template queries
  ✅ api/queries/useCompletions.ts - Completion queries
  ✅ api/mutations/useTemplateMutations.ts - Template mutations
  ✅ api/mutations/useCompletionMutations.ts - Completion mutations
  ✅ components/executors/ - Executor components
    ✅ PassiveFormExecutor.tsx
    ✅ registry.ts
    ✅ types.ts
  ✅ pages/parent-portal/templates/index.tsx - Template list
  ⏳ pages/parent-portal/templates/components/ - Need: CreateTemplateModal, etc.
  ⏳ pages/child-portal/tasks/execute/[taskId].tsx - Need to create

backend/
  ✅ models/task_template.py - Template models
  ✅ models/execution_configs.py - Config models
  ✅ models/content_provider.py - Provider models
  ✅ models/task.py - Updated with template_id
  ✅ services/execution/ - Handler framework
    ✅ base_handler.py
    ✅ passive_handler.py
    ✅ registry.py
  ✅ routes/template_routes.py - Template CRUD
  ✅ routes/completion_routes.py - Completion APIs
  ✅ tests/unit/ - 31 passing tests
  ✅ tests/fixtures/templates.py - Test data
```

## Available Resources

### Reusable Components

**Executors:**
- `PassiveFormExecutor`: Form-based task completion
  - Location: `frontend/src/components/executors/PassiveFormExecutor.tsx`
  - Props: `ExecutorProps` (taskId, executionData, onComplete, onCancel)
  - Features: Field validation, photo upload, notes

**Modals:**
- `UnifiedTaskModal`: Task creation/editing
  - Location: `frontend/src/pages/parent-portal/children/[id]/components/UnifiedTaskModal.tsx`
  - Can be extended to support "Create from Template"

**Form Components:**
- Standard input/select/textarea components used throughout
- Validation patterns from existing forms
- Mobile-responsive design patterns

### Reusable Hooks

**API Hooks (New):**
- `useTemplates(filters)` - Fetch templates
- `useTemplate(templateId)` - Fetch single template
- `useCreateTemplate()` - Create template mutation
- `useUpdateTemplate()` - Update template mutation
- `useDeleteTemplate()` - Delete template mutation
- `usePrepareExecution(taskId)` - Get execution config
- `useSubmitCompletion()` - Submit completion mutation
- `useCompletions(filters)` - Fetch completions

**Existing Hooks:**
- `useCurrentUser()` - Get authenticated user
- `useChild(childId)` - Get child details
- Form validation hooks from existing pages

### Existing APIs

**Templates (New - Ready to Use):**
- `GET /api/templates` - List templates with filters
- `POST /api/templates` - Create template
- `GET /api/templates/{id}` - Get template details
- `PUT /api/templates/{id}` - Update template
- `DELETE /api/templates/{id}` - Delete template

**Completions (New - Ready to Use):**
- `GET /api/completions/{task_id}/prepare` - Get execution config
- `POST /api/completions/{task_id}/submit` - Submit completion
- `GET /api/completions` - List completions (filterable)
- `GET /api/completions/{id}` - Get completion details

**Tasks (Existing):**
- `GET /api/tasks/child/{child_id}` - List tasks
- `POST /api/tasks` - Create task (can use template_id)
- `PUT /api/tasks/{id}` - Update task
- Task status transitions

### Shared Types

```typescript
// Template Types
interface TaskTemplate {
  _id: string;
  template_id: string;
  name: string;
  description?: string;
  category_path: string;
  execution_handler: string;
  execution_config: ExecutionConfig;
  execution_llm?: LLMConfig;
  analysis_handler: string;
  analysis_config: Record<string, any>;
  analysis_llm?: LLMConfig;
  created_by: string;
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// Completion Types
interface TaskCompletion {
  completion_id: string;
  task_id: string;
  child_id: string;
  template_id: string;
  started_at: string;
  completed_at: string;
  measured_data: Record<string, any>;
  detailed_data: Record<string, any>;
  attachments: string[];
}

// Executor Types
interface ExecutorProps {
  taskId: string;
  executionData: any;
  onComplete: (completionData: any) => Promise<void>;
  onCancel: () => void;
}
```

### Test Scripts

**Backend Tests:**
```bash
# Run all unit tests
cd backend
.venv/Scripts/python.exe -m pytest tests/unit -v

# Run with coverage
.venv/Scripts/python.exe -m pytest tests/unit --cov=backend

# Run specific test file
.venv/Scripts/python.exe -m pytest tests/unit/test_passive_handler.py -v
```

**Frontend Tests:**
```bash
# Run frontend tests (when created)
cd frontend
npm test

# Run with watch
npm test -- --watch
```

## Related Features

**Dependencies:**
- Task management system (existing)
- Child management (existing)
- Authentication system (existing)

**Future Extensions:**
- InteractiveQuizHandler (planned)
- ContentCreationHandler (planned)
- Analysis reports with LLM (planned)
- Template marketplace (planned)
- Content providers (planned)

## Known Issues/Limitations

**Current Limitations:**
- Only PassiveForm handler implemented (others are extensible)
- No template marketplace UI yet
- No LLM integration yet
- No content provider framework yet
- No analysis reports yet

**Technical Debt:**
- Some Pydantic deprecation warnings (Config class → ConfigDict)
- pytest-asyncio configuration warning (minor)

**Mobile Considerations:**
- All components must be mobile-responsive
- Touch-friendly UI required
- Tested breakpoints: sm (640px), md (768px), lg (1024px)

## References

**Documentation:**
- [Feature Plan](./plan.md) - Architecture and roadmap
- [API Specification](./api-spec.md) - Complete API docs
- [Template Development Guide](./guide-template-development.md) - Creating new handlers
- [Provider Integration Guide](./guide-provider-integration.md) - Third-party integration
- [Testing Documentation](./testing.md) - Testing strategy
- [Test Results](./TEST_RESULTS.md) - Latest test execution

**External Resources:**
- Pydantic V2 docs: https://docs.pydantic.dev/latest/
- TanStack Query: https://tanstack.com/query/latest
- Tailwind CSS: https://tailwindcss.com/docs

**Design Patterns:**
- Plugin/Registry pattern for handlers
- Factory pattern for executor components
- Separation of concerns: Template → Instance → Completion → Report

**Database Indexes:**
- `task_templates.template_id` (unique)
- `task_templates.created_by`, `is_public`
- `task_completions.completion_id` (unique)
- `task_completions.task_id`, `child_id`, `template_id`
