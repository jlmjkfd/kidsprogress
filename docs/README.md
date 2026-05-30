# KidsProgress Documentation

## Documentation Structure

```
docs/
├── README.md                    # This file - navigation guide
├── architecture.md              # System architecture (tech stack, data models, APIs)
├── roadmap/                     # Development roadmap (staged releases)
│   ├── README.md               # Master tracker & timeline
│   ├── stage-1-mvp/
│   ├── stage-2-ai/
│   ├── stage-3-engagement/
│   ├── stage-4-optimization/
│   └── stage-5-advanced/
├── api-registry.md             # API endpoints catalog
├── component-map.md            # Reusable components
└── templates/                  # Feature documentation templates
    ├── plan.md
    ├── context.md
    └── tasks.md
```

## Quick Navigation

### 🎯 Start Here
- **New to the project?** → [Architecture Overview](architecture.md)
- **Want to start building?** → [Stage 1 MVP Requirements](roadmap/stage-1-mvp/requirements.md)
- **Need to check progress?** → [Roadmap Tracker](roadmap/README.md)
- **Looking for files to modify?** → [Code Organization Guide](CODE_ORGANIZATION.md) ⭐ **Essential**

### 📚 Key Documents

#### Architecture & Design
- **[architecture.md](architecture.md)** - Complete system architecture
  - High-level overview
  - Frontend & backend structure
  - Data models
  - AI workflows
  - API endpoints
  - Database schema

#### Development Roadmap
- **[roadmap/README.md](roadmap/README.md)** - Master roadmap tracker
  - All stages overview
  - Timeline
  - Progress tracking
  - Decision log

#### Stage Requirements (Detailed)
- **[Stage 1: MVP](roadmap/stage-1-mvp/requirements.md)** (8-10 weeks)
  - Core features
  - Basic task management
  - Simple points
  - Writing tool (text only)
  - Basic chat

- **[Stage 2: AI & Intelligence](roadmap/stage-2-ai/requirements.md)** (4-6 weeks)
  - AI planning/replanning
  - Handwriting OCR
  - Math tool
  - Enhanced chat

- **[Stage 3: Engagement](roadmap/stage-3-engagement/requirements.md)** (3-4 weeks)
  - Rewards marketplace
  - Achievements
  - Streaks
  - Check-ins

- **[Stage 4: Optimization](roadmap/stage-4-optimization/requirements.md)** (3-4 weeks)
  - Performance
  - Offline support
  - i18n
  - Security

- **[Stage 5: Advanced](roadmap/stage-5-advanced/requirements.md)** (Future)
  - Voice features
  - Multi-child
  - Integrations

#### Reference Documents
- **[CODE_ORGANIZATION.md](CODE_ORGANIZATION.md)** ⭐ - **How to find all files for any feature**
- **[api-registry.md](api-registry.md)** - All API endpoints (auto-updated)
- **[component-map.md](component-map.md)** - Reusable components catalog

---

## Document Purposes

### Architecture (Reference)
**Purpose**: Technical blueprint
**Audience**: Developers
**When to read**: Before starting any implementation
**Updates**: When tech stack or data models change

### Roadmap (Planning)
**Purpose**: What to build and when
**Audience**: Everyone
**When to read**: Planning sprints, checking progress
**Updates**: Weekly (progress), as needed (scope changes)

### Stage Requirements (Specifications)
**Purpose**: Detailed feature specs for each stage
**Audience**: Developers, designers, testers
**When to read**: At start of each stage
**Updates**: During implementation (clarifications)

### Templates (Workflow)
**Purpose**: Consistent documentation for new features
**Audience**: Developers
**When to use**: When building complex features
**Location**: Create in `docs/features/[feature-name]/`

---

## How to Use This Documentation

### Starting a New Stage
1. Read [architecture.md](architecture.md) - understand the system
2. Read stage requirements (e.g., [stage-1-mvp/requirements.md](roadmap/stage-1-mvp/requirements.md))
3. Break down into tasks (or use checklist in requirements)
4. Update [roadmap/README.md](roadmap/README.md) progress weekly

### Implementing a Complex Feature
1. Create `docs/features/[feature-name]/`
2. Use templates from `templates/` (optional)
3. Document decisions in feature folder
4. Update relevant reference docs when done

### Need to Find Something?
- **Where are the files I need to change?** → [CODE_ORGANIZATION.md](CODE_ORGANIZATION.md) ⭐
- **Tech decisions?** → [architecture.md](architecture.md)
- **What's in scope?** → [roadmap/README.md](roadmap/README.md)
- **Detailed specs?** → Stage requirements files
- **API endpoints?** → [api-registry.md](api-registry.md)
- **Reusable code?** → [component-map.md](component-map.md)

---

## Documentation Principles

**✓ Single source of truth** - Each type of info lives in one place
**✓ Reference over duplication** - Link to other docs, don't copy
**✓ Keep it current** - Update as you build, not after
**✓ Concise over comprehensive** - Enough detail, not all detail
**✓ Living documents** - Evolve with the project

---

## Archived Documentation

**Old planning docs** (kept for reference):
- `features/system-redesign/` - Initial design thinking
  - Contains comprehensive feature brainstorming
  - Now superseded by staged roadmap
  - Useful for understanding original vision

**Note**: Don't use `system-redesign` docs for implementation.
Use staged requirements instead.
