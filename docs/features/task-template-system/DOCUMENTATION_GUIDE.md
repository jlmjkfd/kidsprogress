# Task Template System - Documentation Guide

## Overview

This guide helps you navigate the task template system documentation.

## Documentation Structure

```
task-template-system/
├── README.md                           # Start here - main overview
├── DOCUMENTATION_GUIDE.md             # This file - navigation guide
│
├── guidelines/                         # 📚 For developers creating templates
│   ├── guide-template-development.md  # Complete step-by-step tutorial
│   ├── PLUGIN_ARCHITECTURE.md         # High-level architecture concepts
│   └── PLUGIN_DEVELOPMENT_GUIDE.md    # Alternative development guide
│
├── templates/                          # 📦 Template documentation
│   ├── README.md                      # All templates overview & comparison
│   ├── addition-subtraction/
│   │   └── README.md                  # Addition-subtraction template docs
│   └── writing/
│       └── README.md                  # Writing template docs
│
├── api-spec.md                        # 🔌 API contracts & endpoints
├── context.md                         # 📖 Project background & history
├── guide-provider-integration.md      # 🔗 Third-party service integration
├── plan.md                            # 📋 Original system design plan
├── tasks.md                           # ✅ Task tracking
├── FREEMIUM_BUSINESS_MODEL.md        # 💰 Business model & pricing
├── PREMIUM_FRAMEWORK.md              # ⭐ Premium features framework
└── TROUBLESHOOTING.md                # 🔧 Common issues & solutions
```

## Quick Navigation

### I want to...

#### Create a new template
→ Read [guidelines/guide-template-development.md](./guidelines/guide-template-development.md)
→ Study example: [templates/addition-subtraction/](./templates/addition-subtraction/)

#### Understand the architecture
→ Read [guidelines/PLUGIN_ARCHITECTURE.md](./guidelines/PLUGIN_ARCHITECTURE.md)
→ Then: [README.md](./README.md) for overview

#### Use an existing template
→ Browse [templates/README.md](./templates/README.md)
→ Select template and read its README

#### Integrate a third-party service
→ Read [guide-provider-integration.md](./guide-provider-integration.md)

#### Understand the API
→ Read [api-spec.md](./api-spec.md)

#### Fix an issue
→ Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

#### Learn about the business model
→ Read [FREEMIUM_BUSINESS_MODEL.md](./FREEMIUM_BUSINESS_MODEL.md)
→ Then: [PREMIUM_FRAMEWORK.md](./PREMIUM_FRAMEWORK.md)

## Documentation Categories

### 🎓 Learning Path

**For New Developers:**
1. [README.md](./README.md) - System overview
2. [guidelines/PLUGIN_ARCHITECTURE.md](./guidelines/PLUGIN_ARCHITECTURE.md) - Concepts
3. [templates/addition-subtraction/README.md](./templates/addition-subtraction/README.md) - Example
4. [guidelines/guide-template-development.md](./guidelines/guide-template-development.md) - Tutorial

**For Template Users (Parents):**
1. [README.md](./README.md) - What are templates?
2. [templates/README.md](./templates/README.md) - Available templates
3. Choose template → Read its README
4. Create task using template

**For System Maintainers:**
1. [context.md](./context.md) - Background
2. [plan.md](./plan.md) - Design decisions
3. [api-spec.md](./api-spec.md) - System contracts
4. [guide-provider-integration.md](./guide-provider-integration.md) - Integrations

### 📚 Reference Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [api-spec.md](./api-spec.md) | API contracts, endpoints, data structures | Developers |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues & solutions | Everyone |
| [context.md](./context.md) | Project history, decisions | Maintainers |
| [tasks.md](./tasks.md) | Task tracking | Team |

### 🎯 Topic-Specific Docs

**Plugin Architecture:**
- [guidelines/PLUGIN_ARCHITECTURE.md](./guidelines/PLUGIN_ARCHITECTURE.md)
- [README.md](./README.md) - Key Concepts section

**Template Development:**
- [guidelines/guide-template-development.md](./guidelines/guide-template-development.md)
- [guidelines/PLUGIN_DEVELOPMENT_GUIDE.md](./guidelines/PLUGIN_DEVELOPMENT_GUIDE.md)

**Business & Premium Features:**
- [FREEMIUM_BUSINESS_MODEL.md](./FREEMIUM_BUSINESS_MODEL.md)
- [PREMIUM_FRAMEWORK.md](./PREMIUM_FRAMEWORK.md)

**Integration:**
- [guide-provider-integration.md](./guide-provider-integration.md)
- [api-spec.md](./api-spec.md)

### 📦 Template Documentation

Each template has its own comprehensive README:

**[Addition-Subtraction](./templates/addition-subtraction/README.md)**
- Configuration options
- User experience (child & parent views)
- Data structures
- Component descriptions
- Backend handler
- Use cases
- Metrics tracked
- Best practices

**[Writing](./templates/writing/README.md)**
- Configuration options
- AI feedback integration
- Data structures
- Component descriptions
- Backend handler
- Use cases
- Privacy considerations
- Best practices

## Guidelines Documentation

### [guide-template-development.md](./guidelines/guide-template-development.md)

**Complete tutorial** for creating a new template plugin.

**Contents:**
- Step-by-step instructions
- Code examples for all 4 components
- i18n setup
- Backend handler implementation
- Testing guide
- Best practices
- Common pitfalls

**When to use:** When you want to create a new template from scratch.

### [PLUGIN_ARCHITECTURE.md](./guidelines/PLUGIN_ARCHITECTURE.md)

**High-level overview** of the plugin architecture.

**Contents:**
- Key concepts
- Plugin structure
- Component lifecycle
- Plugin registry
- Integration points
- Benefits
- Example: adding a template

**When to use:** When you want to understand the system design before diving into code.

### [PLUGIN_DEVELOPMENT_GUIDE.md](./guidelines/PLUGIN_DEVELOPMENT_GUIDE.md)

**Alternative development guide** with different perspective.

**Contents:**
- Conceptual overview
- Implementation patterns
- Advanced topics

**When to use:** As a supplement to guide-template-development.md or for experienced developers.

## System Documentation

### [api-spec.md](./api-spec.md)

Complete API specification.

**Contents:**
- Endpoint definitions
- Request/response formats
- Data models
- Error handling
- Authentication

### [context.md](./context.md)

Project background and decision history.

**Contents:**
- Why we built this
- Key design decisions
- Architecture evolution
- Lessons learned

### [plan.md](./plan.md)

Original system design plan.

**Contents:**
- Requirements
- Architecture design
- Implementation phases
- Success criteria

### [guide-provider-integration.md](./guide-provider-integration.md)

Third-party service integration guide.

**Contents:**
- OAuth setup
- API integration patterns
- Data synchronization
- Error handling

## Templates Documentation

### [templates/README.md](./templates/README.md)

Overview of all available templates.

**Contents:**
- Template comparison table
- Selection guide (by age, goal, time)
- Planned templates
- Contributing guidelines
- Template marketplace info

### Individual Template READMEs

Each template folder contains a comprehensive README:

**Standard sections:**
1. Overview & features
2. Configuration options
3. User experience
4. Data structures
5. Components
6. Backend handler
7. i18n support
8. Use cases
9. Metrics tracked
10. Best practices
11. Future enhancements

## Business Documentation

### [FREEMIUM_BUSINESS_MODEL.md](./FREEMIUM_BUSINESS_MODEL.md)

Freemium business model details.

**Contents:**
- Free vs premium features
- Pricing tiers
- Template marketplace model
- Revenue streams

### [PREMIUM_FRAMEWORK.md](./PREMIUM_FRAMEWORK.md)

Premium features framework.

**Contents:**
- Premium template features
- Subscription benefits
- Implementation guidelines
- Upgrade paths

## Maintenance

### Updating Documentation

When making changes:

1. **Update relevant README** - Keep main entry points current
2. **Update template docs** - If template changes, update its README
3. **Update API spec** - If endpoints change
4. **Update this guide** - If structure changes

### Adding New Templates

1. Create folder: `templates/your-template/`
2. Write comprehensive README using existing templates as model
3. Update `templates/README.md` to list new template
4. Update main `README.md` if significant

### Deprecating Documentation

When removing old docs:
1. Check for internal links to the doc
2. Update links to point to replacement
3. Add redirect note if keeping file
4. Remove from this navigation guide

## Tips for Reading

### First Time Reading
1. Start with [README.md](./README.md)
2. Read [PLUGIN_ARCHITECTURE.md](./guidelines/PLUGIN_ARCHITECTURE.md)
3. Browse [templates/README.md](./templates/README.md)
4. Pick one template README to study

### Creating Your First Template
1. Read [guide-template-development.md](./guidelines/guide-template-development.md) thoroughly
2. Study [addition-subtraction/README.md](./templates/addition-subtraction/README.md)
3. Copy template structure
4. Follow checklist in development guide
5. Refer to [api-spec.md](./api-spec.md) as needed

### Troubleshooting
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Search template-specific README
3. Review [api-spec.md](./api-spec.md) for contract details
4. Check [context.md](./context.md) for design rationale

## Version History

| Date | Change |
|------|--------|
| 2024-11-25 | Complete reorganization: created guidelines/ and templates/ folders |
| 2024-11-24 | Added plugin architecture documentation |
| 2024-11-23 | Initial template system documentation |

## Contributing to Docs

### Documentation Standards

- Use Markdown format
- Include table of contents for long docs
- Provide code examples
- Link to related docs
- Keep language clear and concise
- Support both technical and non-technical readers

### Review Checklist

- [ ] Spelling and grammar checked
- [ ] Links tested and working
- [ ] Code examples tested
- [ ] Screenshots up to date (if applicable)
- [ ] Version history updated
- [ ] Navigation guide updated

## Questions?

If you can't find what you're looking for:
1. Check the main [README.md](./README.md)
2. Search this documentation guide
3. Try the [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
4. Open an issue with your question

Happy coding! 🚀
