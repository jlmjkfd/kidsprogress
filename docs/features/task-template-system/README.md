# Task Template System

## Overview

The Task Template System is a **plugin-based architecture** that allows easy creation and integration of new task types. Each template is a self-contained module with its own UI components, business logic, and analytics.

## Quick Links

### 📚 For Developers

- **[Plugin Development Guide](./guidelines/guide-template-development.md)** - Step-by-step guide to create a new template
- **[Plugin Architecture](./guidelines/PLUGIN_ARCHITECTURE.md)** - High-level architecture overview
- **[API Specification](./api-spec.md)** - API contracts and data structures
- **[Context](./context.md)** - Project background and decisions

### 📦 Current Templates

- **[Addition & Subtraction](./templates/addition-subtraction/)** - Math practice template
- **[Writing](./templates/writing/)** - Creative writing with AI feedback

### 🔧 System Documentation

- **[Provider Integration Guide](./guide-provider-integration.md)** - Third-party service integration
- **[Business Model](./FREEMIUM_BUSINESS_MODEL.md)** - Freemium framework
- **[Premium Framework](./PREMIUM_FRAMEWORK.md)** - Premium features
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions

## What is a Template?

A template is a **plugin** that defines:

- ✅ **4 UI Components** - How tasks are configured, executed, analyzed, and reviewed
- ✅ **Configuration Schema** - What settings are available
- ✅ **i18n Translations** - Multi-language support (EN + ZH)
- ✅ **Backend Handler** - How data is processed
- ✅ **Data Structure** - What data is captured and how

Templates are completely **independent** - adding, removing, or modifying one template doesn't affect others.

## Key Concepts

### Plugin Architecture

```
Main Application (Framework)
        ↓
  Plugin Registry
        ↓
   ┌────┴────┬────────┐
   │         │        │
Template1  Template2  Template3
```

The main app doesn't know about specific templates. It uses a **registry** to discover and load them dynamically.

### 4 Required Components

Every template must implement:

| Component | Purpose | Shown In |
|-----------|---------|----------|
| **SettingsEditor** | Configure task settings | Task creation/edit modal |
| **TaskExecutor** | Execute the task | Child portal (task execution page) |
| **AnalysisView** | View progress/analytics | Parent portal (analysis page) |
| **AttemptView** | View single attempt details | Both portals (attempt detail page) |

### Template Structure

```
templates/my-template/
├── components/
│   ├── SettingsEditor.tsx    # Config UI
│   ├── TaskExecutor.tsx      # Execution UI
│   ├── AnalysisView.tsx      # Analytics UI
│   └── AttemptView.tsx       # Detail view UI
├── locales/
│   ├── en/translation.json   # English
│   └── zh/translation.json   # Chinese
├── index.ts                   # Plugin export
└── manifest.json             # Metadata
```

## Getting Started

### Create a New Template

1. **Read the guide**: [Plugin Development Guide](./guidelines/guide-template-development.md)
2. **Study examples**: Check [addition-subtraction](./templates/addition-subtraction/) or [writing](./templates/writing/)
3. **Create folder structure**:
   ```bash
   mkdir -p templates/my-template/{components,locales/{en,zh}}
   ```
4. **Implement 4 components** using TypeScript interfaces
5. **Add translations** for both English and Chinese
6. **Create backend handler** in Python
7. **Register plugin** in `registry.ts`
8. **Test thoroughly**

### Use an Existing Template

1. Browse available templates in [templates/](./templates/)
2. Read the template's README for configuration options
3. Create a task using the template in the parent portal
4. Assign it to a child with a due date
5. Child completes the task in their portal
6. View analytics in parent portal

## Architecture Highlights

### Framework Benefits

- **Easy to Extend**: Add new templates without touching existing code
- **Type-Safe**: Full TypeScript support with interfaces
- **Independent**: Templates don't depend on each other
- **Maintainable**: Clear separation of concerns
- **Testable**: Each component can be tested in isolation

### Data Flow

```
1. Parent creates task → SettingsEditor → config saved
2. Child starts task → TaskExecutor loads → execution data prepared
3. Child completes → data submitted → backend processes
4. Parent views progress → AnalysisView loads → shows analytics
5. Anyone views attempt → AttemptView loads → shows details
```

### Integration Points

| Integration | Location | Purpose |
|-------------|----------|---------|
| Plugin Registry | `frontend/src/templates/registry.ts` | Register all plugins |
| Backend Handlers | `backend/templates/{template-id}/` | Process execution/completion |
| API Endpoints | `backend/routes/tasks.py` | CRUD operations |
| i18n Loader | Auto-loaded from plugin | Multi-language support |

## Current Status

✅ **Complete Features**:
- Plugin architecture implemented
- Template registry system
- 4-component interface standardized
- Template-specific i18n support
- Addition-subtraction template (complete)
- Writing template (complete)
- Backend handlers functional
- API integration working

⏳ **In Progress**:
- More template examples
- Template marketplace
- AI integration enhancements

## Contributing

### Adding a New Template

1. Fork the repository
2. Create your template following the [development guide](./guidelines/guide-template-development.md)
3. Add comprehensive tests
4. Document in `templates/your-template/README.md`
5. Submit a pull request

### Template Requirements

- ✅ All 4 components implemented
- ✅ Both EN and ZH translations
- ✅ Backend handler with tests
- ✅ TypeScript types properly used
- ✅ Mobile-responsive design
- ✅ Accessibility considerations
- ✅ Documentation complete

## Resources

### Documentation

- [Plugin Development Guide](./guidelines/guide-template-development.md) - Complete tutorial
- [Plugin Architecture](./guidelines/PLUGIN_ARCHITECTURE.md) - Architecture overview
- [API Specification](./api-spec.md) - API contracts

### Examples

- [Addition-Subtraction Template](./templates/addition-subtraction/README.md) - Math practice
- [Writing Template](./templates/writing/README.md) - Creative writing

### Code

- Frontend Templates: `frontend/src/templates/`
- Backend Handlers: `backend/templates/`
- Plugin Interface: `frontend/src/templates/_shared/types/plugin-interface.ts`
- Registry: `frontend/src/templates/registry.ts`

## Folder Structure

```
docs/features/task-template-system/
├── README.md                           # This file
├── guidelines/                         # Development guides
│   ├── guide-template-development.md  # Complete tutorial
│   ├── PLUGIN_ARCHITECTURE.md         # Architecture overview
│   └── PLUGIN_DEVELOPMENT_GUIDE.md    # Original guide
├── templates/                          # Template documentation
│   ├── addition-subtraction/
│   │   └── README.md
│   └── writing/
│       └── README.md
├── api-spec.md                        # API specification
├── context.md                         # Background
├── guide-provider-integration.md      # Third-party integration
├── plan.md                            # Original plan
├── tasks.md                           # Task tracking
├── FREEMIUM_BUSINESS_MODEL.md        # Business model
├── PREMIUM_FRAMEWORK.md              # Premium features
└── TROUBLESHOOTING.md                # Common issues
```

## Support

### Questions?

- Check [Troubleshooting](./TROUBLESHOOTING.md) for common issues
- Read the [Plugin Development Guide](./guidelines/guide-template-development.md) for detailed instructions
- Review example templates in [templates/](./templates/)

### Found a Bug?

1. Check if it's template-specific or system-wide
2. Create an issue with:
   - Template name (if applicable)
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/error messages

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2024-11 | Plugin architecture, 4-component system, template-specific i18n |
| 1.0.0 | 2024-11 | Initial template system |

## License

See main project LICENSE file.
