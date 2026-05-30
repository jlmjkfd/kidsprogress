# Type Safety in Plugin Architecture

## The Challenge

In plugin-based architectures, we face a fundamental tension:

1. **Framework needs flexibility**: Must work with ANY plugin without knowing specific types
2. **Plugins need strictness**: Want type safety for their specific data structures
3. **TypeScript wants specificity**: Doesn't like `any` types

## Solution: Generic Types with Constraints

### Strategy Overview

Use **Generic Types** with **Type Constraints** to provide:
- ✅ Framework flexibility (works with any plugin)
- ✅ Plugin type safety (each plugin has specific types)
- ✅ No `any` types (everything is properly typed)

## Implementation

### 1. Define Template-Specific Types

Each template defines its own strict types:

```typescript
// templates/addition-subtraction/types.ts

// Configuration type
export interface AdditionSubtractionConfig {
  max_value: number;
  num_questions: number;
  only_carry: boolean;
  has_timer: boolean;
}

// Execution data type
export interface AdditionSubtractionExecution {
  handler_type: 'addition-subtraction';
  questions: Array<{
    question_id: string;
    num1: number;
    operator: '+' | '-';
    num2: number;
    answer: number;
  }>;
  has_timer: boolean;
}

// Completion data type
export interface AdditionSubtractionCompletion {
  answers: Record<string, number>;
  total_time_seconds: number;
  started_at: string;
}

// Detailed data structure
export interface AdditionSubtractionDetailedData {
  questions: Array<{
    question_id: string;
    num1: number;
    operator: '+' | '-';
    num2: number;
    answer: number;
  }>;
  answers: Record<string, number>;
  total_time_seconds: number;
  started_at: string;
}

// Measured data structure
export interface AdditionSubtractionMeasuredData {
  correct_count: number;
  incorrect_count: number;
  accuracy: number;
  average_time_per_question: number;
}
```

### 2. Create Generic Plugin Interface

Update the plugin interface to use generics:

```typescript
// _shared/types/plugin-interface.ts

/**
 * Generic Settings Editor Props
 */
export interface SettingsEditorProps<TConfig = unknown> {
  config: TConfig;
  onChange: (config: TConfig) => void;
  template: TaskTemplate;
}

/**
 * Generic Task Executor Props
 */
export interface TaskExecutorProps<TExecution = unknown, TCompletion = unknown> {
  taskId: string;
  executionData: TExecution;
  onComplete: (data: TCompletion) => Promise<void>;
  onCancel: () => void;
  setIsComplete: (completed: boolean) => void;
}

/**
 * Generic Attempt View Props
 */
export interface AttemptViewProps<TDetailedData = unknown, TMeasuredData = unknown> {
  completion: TaskCompletion<TDetailedData, TMeasuredData>;
}

/**
 * Generic Task Completion
 */
export interface TaskCompletion<TDetailedData = unknown, TMeasuredData = unknown> {
  completion_id: string;
  task_id: string;
  child_id: string;
  template_id: string;
  completed_at: string;
  started_at: string;
  detailed_data: TDetailedData;
  measured_data?: TMeasuredData;
  llm_analysis?: LLMAnalysis;
}

/**
 * Generic Template Plugin
 */
export interface TemplatePlugin<
  TConfig = unknown,
  TExecution = unknown,
  TCompletion = unknown,
  TDetailedData = unknown,
  TMeasuredData = unknown
> {
  id: string;
  name: string;
  version: string;
  handlerType: string;
  description: string;
  author?: string;
  tags?: string[];

  components: {
    SettingsEditor: React.ComponentType<SettingsEditorProps<TConfig>>;
    TaskExecutor: React.ComponentType<TaskExecutorProps<TExecution, TCompletion>>;
    AnalysisView: React.ComponentType<AnalysisViewProps>;
    AttemptView: React.ComponentType<AttemptViewProps<TDetailedData, TMeasuredData>>;
  };

  configSchema: JSONSchema;
  defaultConfig: TConfig;
  i18n?: TemplateI18nResources;
  hooks?: PluginHooks<TConfig>;
}
```

### 3. Use Specific Types in Templates

Each template provides its types to the generic interface:

```typescript
// templates/addition-subtraction/index.ts
import type { TemplatePlugin } from '../_shared/types/plugin-interface';
import type {
  AdditionSubtractionConfig,
  AdditionSubtractionExecution,
  AdditionSubtractionCompletion,
  AdditionSubtractionDetailedData,
  AdditionSubtractionMeasuredData,
} from './types';

export const additionSubtractionPlugin: TemplatePlugin<
  AdditionSubtractionConfig,
  AdditionSubtractionExecution,
  AdditionSubtractionCompletion,
  AdditionSubtractionDetailedData,
  AdditionSubtractionMeasuredData
> = {
  id: 'addition-subtraction',
  // ... rest of plugin
  components: {
    SettingsEditor,  // Now typed with AdditionSubtractionConfig
    TaskExecutor,    // Now typed with AdditionSubtractionExecution & Completion
    AnalysisView,
    AttemptView,     // Now typed with AdditionSubtractionDetailedData & MeasuredData
  },
  defaultConfig: {
    max_value: 100,
    num_questions: 10,
    only_carry: false,
    has_timer: true,
  },
};
```

### 4. Type-Safe Component Implementation

Components now have full type safety:

```typescript
// components/SettingsEditor.tsx
import type { SettingsEditorProps } from '@/templates/_shared/types/plugin-interface';
import type { AdditionSubtractionConfig } from '../types';

export default function SettingsEditor({
  config,
  onChange,
  template
}: SettingsEditorProps<AdditionSubtractionConfig>) {
  // config is now AdditionSubtractionConfig, not any!
  const handleChange = (field: keyof AdditionSubtractionConfig, value: number | boolean) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div>
      <input
        type="number"
        value={config.max_value}  // ✅ TypeScript knows this exists
        onChange={(e) => handleChange('max_value', parseInt(e.target.value))}
      />
      {/* TypeScript will error if we try to access config.nonexistent */}
    </div>
  );
}
```

```typescript
// components/TaskExecutor.tsx
import type { TaskExecutorProps } from '@/templates/_shared/types/plugin-interface';
import type {
  AdditionSubtractionExecution,
  AdditionSubtractionCompletion,
} from '../types';

export default function TaskExecutor({
  executionData,
  onComplete,
}: TaskExecutorProps<AdditionSubtractionExecution, AdditionSubtractionCompletion>) {
  // executionData is now AdditionSubtractionExecution!
  const questions = executionData.questions;  // ✅ Typed array
  const hasTimer = executionData.has_timer;   // ✅ Boolean

  const handleSubmit = async () => {
    const completionData: AdditionSubtractionCompletion = {
      answers: {},
      total_time_seconds: 120,
      started_at: new Date().toISOString(),
    };
    await onComplete(completionData);  // ✅ Type-checked
  };
}
```

```typescript
// components/AttemptView.tsx
import type { AttemptViewProps } from '@/templates/_shared/types/plugin-interface';
import type {
  AdditionSubtractionDetailedData,
  AdditionSubtractionMeasuredData,
} from '../types';

export default function AttemptView({
  completion
}: AttemptViewProps<AdditionSubtractionDetailedData, AdditionSubtractionMeasuredData>) {
  // completion.detailed_data is now AdditionSubtractionDetailedData!
  const questions = completion.detailed_data.questions;  // ✅ Typed
  const answers = completion.detailed_data.answers;      // ✅ Typed

  // completion.measured_data is now AdditionSubtractionMeasuredData!
  const accuracy = completion.measured_data?.accuracy;   // ✅ Typed
}
```

## Benefits

### 1. Full Type Safety in Templates

```typescript
// ❌ Before (with any)
const questions = completion.detailed_data?.questions || [];
questions.map((question: any) => { ... });  // No type checking

// ✅ After (with generics)
const questions = completion.detailed_data.questions;  // Type is known
questions.map((question) => {
  // TypeScript knows all properties: question_id, num1, num2, operator, answer
  return question.num1 + question.num2;
});
```

### 2. Compile-Time Error Detection

```typescript
// TypeScript will error on:
config.nonexistent_field = 10;           // Property doesn't exist
executionData.questions = "string";      // Wrong type
completionData.answers = [];             // Should be Record<string, number>
```

### 3. IntelliSense/Autocomplete

IDE provides perfect autocomplete for all template-specific properties.

### 4. Refactoring Safety

Renaming a field updates everywhere or shows errors.

## Migration Steps

### Step 1: Create Types File

For each template, create `types.ts`:

```typescript
// templates/my-template/types.ts
export interface MyTemplateConfig {
  // All config fields
}

export interface MyTemplateExecution {
  handler_type: 'my-template';
  // Execution data structure
}

export interface MyTemplateCompletion {
  // Completion submission data
}

export interface MyTemplateDetailedData {
  // Stored detailed data
}

export interface MyTemplateMeasuredData {
  // Calculated metrics
}
```

### Step 2: Update Plugin Interface

Use updated generic interface from `plugin-interface.ts`.

### Step 3: Update Plugin Export

Add type parameters to plugin definition:

```typescript
export const myTemplatePlugin: TemplatePlugin<
  MyTemplateConfig,
  MyTemplateExecution,
  MyTemplateCompletion,
  MyTemplateDetailedData,
  MyTemplateMeasuredData
> = { ... };
```

### Step 4: Update Components

Add type parameters to component props:

```typescript
function SettingsEditor(props: SettingsEditorProps<MyTemplateConfig>) { ... }
function TaskExecutor(props: TaskExecutorProps<MyTemplateExecution, MyTemplateCompletion>) { ... }
function AttemptView(props: AttemptViewProps<MyTemplateDetailedData, MyTemplateMeasuredData>) { ... }
```

### Step 5: Remove `any` Types

Replace all `any` with proper types:

```typescript
// ❌ Before
questions.map((question: any) => ...)

// ✅ After
questions.map((question) => ...)  // Type inferred from array
```

## Handling Unknown Types in Framework

The framework code (registry, routing) still needs to handle unknown types:

```typescript
// Framework code that works with any template
export function getPlugin(id: string): TemplatePlugin | undefined {
  return pluginRegistry.get(id);
}

// Returns TemplatePlugin without type parameters = TemplatePlugin<unknown, unknown, ...>
// This is OK! Framework doesn't need to know specific types
```

When framework passes data to components, TypeScript ensures type safety:

```typescript
// In attempt detail page
const plugin = getPlugin(task.template_id);  // TemplatePlugin<unknown, ...>
const AttemptView = plugin.components.AttemptView;

// AttemptView expects AttemptViewProps<unknown, unknown>
// But plugin's actual type is AttemptViewProps<SpecificType, SpecificType>
// TypeScript accepts this because unknown is compatible
return <AttemptView completion={completion} />;  // ✅ Safe
```

## Advanced: Type Guards

For runtime type checking:

```typescript
// templates/addition-subtraction/types.ts
export function isAdditionSubtractionData(
  data: unknown
): data is AdditionSubtractionDetailedData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'questions' in data &&
    Array.isArray((data as any).questions) &&
    'answers' in data &&
    typeof (data as any).answers === 'object'
  );
}

// Use in component
if (isAdditionSubtractionData(completion.detailed_data)) {
  // TypeScript knows it's AdditionSubtractionDetailedData
  const questions = completion.detailed_data.questions;
}
```

## Best Practices

### 1. Define All Types Upfront

Create comprehensive types before implementing components.

### 2. Use Strict Types, Not Union Types

```typescript
// ❌ Avoid
answer: string | number;

// ✅ Prefer
answer: number;
```

### 3. Use Optional Properties Sparingly

```typescript
// ❌ Too flexible
interface Config {
  field1?: string;
  field2?: number;
  field3?: boolean;
}

// ✅ Clear requirements
interface Config {
  field1: string;     // Required
  field2: number;     // Required
  field3?: boolean;   // Truly optional
}
```

### 4. Document Complex Types

```typescript
/**
 * Configuration for addition-subtraction template
 * @property max_value - Maximum number in questions (10-10000)
 * @property num_questions - Number of questions to generate (1-100)
 */
export interface AdditionSubtractionConfig {
  max_value: number;
  num_questions: number;
}
```

### 5. Export All Types

```typescript
// templates/my-template/index.ts
export * from './types';  // Export all types for consumers
```

## Common Patterns

### Pattern 1: Discriminated Unions

For different execution modes:

```typescript
type ExecutionData =
  | { mode: 'practice'; questions: Question[] }
  | { mode: 'test'; questions: Question[]; time_limit: number }
  | { mode: 'review'; completion_id: string };

function handleExecution(data: ExecutionData) {
  switch (data.mode) {
    case 'practice':
      // TypeScript knows data has questions but not time_limit
      break;
    case 'test':
      // TypeScript knows data has both questions and time_limit
      break;
  }
}
```

### Pattern 2: Branded Types

For preventing mixing of similar types:

```typescript
type QuestionId = string & { __brand: 'QuestionId' };
type AnswerId = string & { __brand: 'AnswerId' };

// Can't accidentally use wrong ID type
function getAnswer(id: AnswerId): string { ... }
getAnswer(questionId);  // ❌ Type error
```

### Pattern 3: Utility Types

```typescript
// Make all properties optional for partial updates
type PartialConfig = Partial<AdditionSubtractionConfig>;

// Pick only certain properties
type DisplayConfig = Pick<AdditionSubtractionConfig, 'max_value' | 'num_questions'>;

// Make all properties readonly
type ReadonlyConfig = Readonly<AdditionSubtractionConfig>;
```

## Summary

| Approach | Flexibility | Type Safety | Maintainability |
|----------|-------------|-------------|-----------------|
| `any` everywhere | ✅ High | ❌ None | ❌ Poor |
| `Record<string, any>` | ✅ High | ⚠️ Minimal | ⚠️ Moderate |
| **Generic Types** | ✅ High | ✅ Full | ✅ Excellent |

**Generic types with constraints** provide the best of all worlds:
- Framework remains flexible
- Plugins get full type safety
- No `any` types needed
- Excellent IDE support
- Compile-time error detection

## Resources

- [TypeScript Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
