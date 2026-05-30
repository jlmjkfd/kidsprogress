# Template Plugin Architecture

## Overview

The KidsProgress template system uses a **plugin architecture** where each template is a self-contained, independent module. This document provides a high-level overview of how the system works.

## Key Concepts

### 1. Self-Contained Plugins

Each template plugin contains everything it needs:
- ✅ UI Components (4 required)
- ✅ i18n Translations (EN + ZH)
- ✅ Configuration Schema
- ✅ Default Settings
- ✅ Metadata (manifest)

### 2. Framework-Driven Integration

The main app doesn't know about specific templates. Instead, it uses the plugin registry:

```typescript
// Main app asks: "Give me the components for this template"
const plugin = getPlugin(task.template_id);

// Then uses the components
<plugin.components.SettingsEditor />
<plugin.components.TaskExecutor />
<plugin.components.AnalysisView />
<plugin.components.AttemptView />
```

### 3. Consistent Interface

All templates implement the same `TemplatePlugin` interface, ensuring:
- Predictable structure
- Type safety
- Easy integration
- Simple testing

## Plugin Structure

```
templates/my-template/
├── components/
│   ├── SettingsEditor.tsx    # Config UI in task modal
│   ├── TaskExecutor.tsx      # Execution UI for child
│   ├── AnalysisView.tsx      # Progress view for parent
│   └── AttemptView.tsx       # Detail view for attempts
├── locales/
│   ├── en/translation.json   # English text
│   └── zh/translation.json   # Chinese text
├── index.ts                   # Plugin export
└── manifest.json             # Metadata
```

## Component Lifecycle

### 1. Task Creation/Edit
```
User selects template → Main app loads SettingsEditor → User configures → Saved to task
```

### 2. Task Execution
```
Child starts task → Main app loads TaskExecutor → Child completes → Data saved
```

### 3. Progress Analysis
```
Parent views progress → Main app loads AnalysisView → Shows all completions
```

### 4. Attempt Detail
```
User views attempt → Main app loads AttemptView → Shows single completion
```

## Plugin Registry

Central registry manages all plugins:

```typescript
// registry.ts
const pluginRegistry = new Map<string, TemplatePlugin>([
  ['addition-subtraction', additionSubtractionPlugin],
  ['writing', writingPlugin],
  // Add new plugins here
]);

export function getPlugin(id: string): TemplatePlugin | undefined {
  return pluginRegistry.get(id);
}
```

## Integration Points

### Frontend
- Task modal uses `SettingsEditor`
- Execute page uses `TaskExecutor`
- Analysis page uses `AnalysisView`
- Attempt page uses `AttemptView`

### Backend
- Prepare execution data
- Process completion data
- Calculate metrics

### i18n
- Template-specific namespace: `template-{id}`
- Auto-loaded with plugin
- Supports multiple languages

## Benefits

### For Developers
- **Easy to create**: Follow template, implement 4 components
- **Easy to test**: Each component is isolated
- **Type-safe**: Full TypeScript support
- **Reusable**: Can be shared across projects

### For Users
- **Consistent UX**: All templates follow same patterns
- **Predictable**: Know what to expect
- **Multilingual**: Built-in i18n support

### For System
- **Scalable**: Add unlimited templates
- **Maintainable**: No coupling between templates
- **Extensible**: Easy to add features

## Example: Adding a New Template

1. Create folder: `templates/my-template/`
2. Implement 4 components
3. Add translations
4. Create manifest
5. Export plugin in `index.ts`
6. Register in `registry.ts`
7. Done! ✨

## Current Templates

| Template | ID | Components | i18n | Status |
|----------|-----|------------|------|--------|
| Addition-Subtraction | `addition-subtraction` | ✅ | ✅ | Complete |
| Writing | `writing` | ✅ | ✅ | Complete |

## Next Steps

See [guide-template-development.md](./guide-template-development.md) for step-by-step instructions on creating your own template.

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│           Main Application                      │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │     Plugin Registry                        │ │
│  │  - getPlugin(id)                          │ │
│  │  - getAllPlugins()                        │ │
│  └───────────────────────────────────────────┘ │
│                    │                            │
│         ┌──────────┴──────────┬───────────┐   │
│         │                     │           │   │
│    ┌────▼───┐           ┌────▼───┐  ┌───▼───┐│
│    │Template│           │Template│  │ ...   ││
│    │   1    │           │   2    │  │       ││
│    └────────┘           └────────┘  └───────┘│
└─────────────────────────────────────────────────┘

Each Template:
├── 4 Components (SettingsEditor, TaskExecutor, AnalysisView, AttemptView)
├── i18n (en, zh)
├── Config Schema
└── Backend Handler
```

## Philosophy

> "Templates are plugins. The main app is just a framework that loads and displays them."

This philosophy ensures:
- Templates don't depend on each other
- Main app doesn't depend on specific templates
- Easy to add, remove, or modify templates
- Clear separation of concerns
