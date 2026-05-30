# Task Template System - Feature Plan

## Overview

**Goal:** Enable structured, analyzable tasks through a flexible template system that supports multiple execution modes (passive recording, interactive quizzes, content creation) and LLM-powered analysis.

**Problem:** Current task system only tracks completion status. Cannot analyze skill progression because tasks are unstructured and inconsistent.

**Solution:** Introduce TaskTemplate system with:
- Predefined task schemas for common activities (math, reading, writing)
- Multiple execution modes (passive, interactive, content creation)
- Flexible data capture (structured + unstructured)
- LLM-powered analysis and insights
- Third-party content provider integration
- Template marketplace

## Core Concepts

### 1. Template vs Instance vs Completion

```
TaskTemplate (Schema/Blueprint)
  ↓ creates
TaskInstance (Scheduled task)
  ↓ generates
TaskCompletion (Actual results + data)
  ↓ analyzed by
AnalysisReport (Insights over time)
```

**TaskTemplate**: Defines structure, execution mode, analysis method
**TaskInstance**: Your existing Task model with optional template_id
**TaskCompletion**: NEW - separate collection for completion data
**AnalysisReport**: NEW - aggregated insights over multiple completions

### 2. Execution Handlers (Pluggable)

Different templates need different execution experiences:

- **PassiveFormHandler**: Parent/child fills form after completing task offline
- **InteractiveQuizHandler**: System presents questions, tracks answers in real-time
- **ContentCreationHandler**: Child writes/draws/records, gets AI feedback
- **ExternalLinkHandler**: Opens external tool/website, imports results
- **Custom handlers**: Extensible for future needs (VR games, physical sensors, etc.)

### 3. Content Providers (Integrations)

Templates can source content from:
- **Internal**: Our own question banks
- **LLM-generated**: AI creates questions on-the-fly
- **Third-party**: Schools, Khan Academy, educational platforms
- **User-created**: Parents create custom question sets

### 4. Analysis Layers

**Structured Analysis** (Fast, predictable):
- Accuracy trends (% correct over time)
- Speed metrics (time per question)
- Difficulty progression
- Fixed charts and reports

**LLM Analysis** (Deep, contextual):
- Qualitative insights from text/photos
- Pattern recognition across completions
- Personalized recommendations
- Natural language reports for parents

**Hybrid** (Best of both):
- Quick metrics dashboard + deep insights tab

## Architecture

### Database Models

```
TaskTemplate
├─ execution_handler: str (plugin ID)
├─ execution_config: Dict (handler-specific)
├─ execution_llm: Optional[LLMConfig] (real-time feedback)
├─ content_provider: Optional[ProviderConfig]
├─ analysis_handler: str
├─ analysis_config: Dict
└─ analysis_llm: Optional[LLMConfig] (post-analysis)

Task (existing, minimal changes)
├─ ... all existing fields
├─ template_id: Optional[str]  # NEW: link to template
└─ category_path: Optional[str]  # NEW: hierarchical category

TaskCompletion (NEW)
├─ task_id: str
├─ child_id: str
├─ template_id: Optional[str]
├─ started_at: datetime
├─ completed_at: datetime
├─ measured_data: Optional[Dict]  # Structured metrics
├─ detailed_data: Optional[Dict]  # Question-level data
├─ content_data: Optional[Dict]  # Text, photos, audio
├─ llm_analysis: Optional[Dict]  # Cached AI insights
└─ attachments: List[Dict]

AnalysisReport (NEW)
├─ child_id: str
├─ template_id: str
├─ date_range: Dict
├─ structured_metrics: Optional[Dict]
├─ llm_insights: Optional[Dict]
└─ charts: List[Dict]

ContentProvider (NEW)
├─ provider_id: str
├─ name: str
├─ auth_schema: Dict
├─ api_config: Dict
└─ active: bool
```

### Backend Services

```
backend/
├─ services/
│   ├─ template_service.py  # CRUD for templates
│   ├─ completion_service.py  # NEW: Record completions
│   ├─ analysis_service.py  # NEW: Generate insights
│   ├─ execution/
│   │   ├─ base_handler.py  # ExecutionHandler base class
│   │   ├─ passive_handler.py
│   │   ├─ interactive_handler.py
│   │   └─ content_creation_handler.py
│   ├─ providers/
│   │   ├─ base_provider.py  # ContentProvider base class
│   │   ├─ question_bank_provider.py
│   │   ├─ llm_provider.py
│   │   └─ school_api_provider.py  # Example integration
│   └─ llm/
│       ├─ feedback_service.py  # Real-time feedback
│       └─ analysis_service.py  # Post-completion analysis
├─ models/
│   ├─ task_template.py  # NEW
│   ├─ task_completion.py  # NEW
│   └─ analysis_report.py  # NEW
└─ routes/
    ├─ templates.py  # NEW: Template CRUD APIs
    ├─ completions.py  # NEW: Completion APIs
    └─ analysis.py  # NEW: Analysis APIs
```

### Frontend Components

```
frontend/src/
├─ pages/
│   ├─ parent-portal/
│   │   ├─ templates/  # NEW: Template marketplace/library
│   │   │   ├─ index.tsx  # Browse templates
│   │   │   ├─ create.tsx  # Create custom template
│   │   │   └─ [id].tsx  # Template details
│   │   └─ analysis/  # NEW: Child analytics
│   │       ├─ index.tsx  # Overview dashboard
│   │       └─ [templateId].tsx  # Template-specific insights
│   └─ child-portal/
│       └─ task-execution/  # NEW: Execution modes
│           ├─ PassiveFormExecutor.tsx
│           ├─ InteractiveQuizExecutor.tsx
│           └─ ContentCreationExecutor.tsx
├─ components/
│   ├─ templates/
│   │   ├─ TemplateCard.tsx
│   │   ├─ TemplateBuilder.tsx  # Visual template creator
│   │   └─ FieldConfigurator.tsx
│   ├─ executors/  # NEW: Execution mode components
│   │   ├─ FormBuilder.tsx  # Dynamic form from config
│   │   ├─ QuizRunner.tsx  # Interactive quiz UI
│   │   └─ ContentEditor.tsx  # Rich text/media editor
│   └─ analysis/  # NEW: Visualization components
│       ├─ MetricChart.tsx  # Line/bar charts
│       ├─ ProgressGauge.tsx
│       ├─ InsightCard.tsx  # LLM insights display
│       └─ ComparisonView.tsx
└─ api/
    ├─ queries/
    │   ├─ useTemplates.ts  # NEW
    │   ├─ useCompletions.ts  # NEW
    │   └─ useAnalysis.ts  # NEW
    └─ mutations/
        ├─ useTemplateMutations.ts  # NEW
        └─ useCompletionMutations.ts  # NEW
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Core models and passive form mode

**Backend:**
- [ ] Create TaskTemplate model
- [ ] Create TaskCompletion model
- [ ] Add template_id to existing Task model (optional field)
- [ ] Template CRUD service + routes
- [ ] Completion recording service + routes
- [ ] PassiveFormHandler implementation

**Frontend:**
- [ ] Template list/detail pages (parent portal)
- [ ] PassiveFormExecutor component
- [ ] Form completion flow in child portal
- [ ] Basic completion recording UI

**Deliverable:** Parents can create simple form-based templates, children can complete and record results

### Phase 2: Interactive Mode (Week 3-4)

**Goal:** Question bank + interactive quiz execution

**Backend:**
- [ ] QuestionBank model
- [ ] InteractiveQuizHandler implementation
- [ ] Question management service
- [ ] Real-time quiz session handling

**Frontend:**
- [ ] QuizRunner component
- [ ] Question bank builder UI
- [ ] Interactive quiz execution flow
- [ ] Progress tracking during quiz

**Deliverable:** Math practice template with 10 questions, tracks accuracy

### Phase 3: LLM Integration (Week 5-6)

**Goal:** AI-powered feedback and analysis

**Backend:**
- [ ] LLM feedback service (real-time)
- [ ] LLM analysis service (post-completion)
- [ ] Prompt template system
- [ ] Analysis caching

**Frontend:**
- [ ] ContentCreationHandler + UI
- [ ] Real-time feedback display
- [ ] Analysis dashboard (structured metrics)
- [ ] LLM insights display

**Deliverable:** Writing template with AI feedback, math template with trend analysis

### Phase 4: Analysis & Reports (Week 7-8)

**Goal:** Comprehensive analytics

**Backend:**
- [ ] AnalysisReport model
- [ ] Report generation service
- [ ] Metric calculation engine
- [ ] Chart data generation

**Frontend:**
- [ ] Analysis dashboard redesign
- [ ] Multiple chart types (line, bar, gauge)
- [ ] Comparison views (child's progress)
- [ ] Export reports (PDF)

**Deliverable:** Full analytics page with charts, trends, and insights

### Phase 5: Content Providers (Week 9-10)

**Goal:** Third-party integrations

**Backend:**
- [ ] ContentProvider base class
- [ ] Provider registry system
- [ ] School API provider example
- [ ] LLM question generator provider
- [ ] Result sync-back to providers

**Frontend:**
- [ ] Provider configuration UI
- [ ] OAuth/API key management
- [ ] Provider status monitoring

**Deliverable:** Integration with one school system (demo)

### Phase 6: Marketplace (Week 11-12)

**Goal:** Template discovery and sharing

**Backend:**
- [ ] Template publishing system
- [ ] Template versioning
- [ ] Premium template pricing
- [ ] Template ratings/reviews

**Frontend:**
- [ ] Template marketplace UI
- [ ] Template preview
- [ ] One-click template installation
- [ ] Template creation wizard

**Deliverable:** Public marketplace with 10+ system templates

## Key Decisions

### 1. Backward Compatibility

**Decision:** Template system is OPTIONAL
- Existing tasks continue working as-is
- template_id field is nullable
- Only templated tasks get analysis features
- Clear communication to parents about benefits

### 2. Data Storage

**Decision:** Separate TaskCompletion collection
- Don't bloat Task model with historical data
- Faster queries for analysis
- Can archive old completions
- Easier to anonymize for comparisons

### 3. Extensibility

**Decision:** Plugin architecture for handlers and providers
- Registry pattern (not enums)
- Hierarchical categories (not fixed list)
- Schema validation for configs
- Frontend components map to handler IDs

### 4. LLM Usage

**Decision:** Two separate LLM configs
- execution_llm: Real-time feedback during task
- analysis_llm: Post-completion deep analysis
- Different models, prompts, cost controls
- Caching to reduce API calls

### 5. Third-Party Integration

**Decision:** Provider plugin system
- Schools/platforms don't access our DB
- We fetch content via their API
- Optional result sync-back (with permission)
- Isolated authentication per provider

## Success Metrics

### Phase 1-2
- 3+ system templates created
- 10+ task completions recorded with structured data
- PassiveForm + InteractiveQuiz modes working

### Phase 3-4
- LLM analysis running on 50+ completions
- 5+ parents viewing analysis dashboard
- Average analysis accuracy > 80%

### Phase 5-6
- 1+ school integration live
- Template marketplace with 15+ templates
- 3+ parents creating custom templates

## Risks & Mitigations

**Risk:** LLM costs too high
**Mitigation:** Caching, rate limiting, tiered features (premium)

**Risk:** Templates too complex for parents
**Mitigation:** Start with 10 system templates, wizard for custom

**Risk:** Third-party APIs unreliable
**Mitigation:** Fallback to internal question banks, retry logic

**Risk:** Analysis not useful
**Mitigation:** User research, iterate on metrics/insights

## Next Steps

1. Create detailed development guide (see: `guide-template-development.md`)
2. Create provider integration guide (see: `guide-provider-integration.md`)
3. Review with team, adjust timeline
4. Start Phase 1 implementation
5. Set up demo school API for testing (mock server)

## Related Documents

- [Template Development Guide](./guide-template-development.md)
- [Provider Integration Guide](./guide-provider-integration.md)
- [API Specification](./api-spec.md)
- [Existing Task Management](../task-management/plan.md)
- [AI Scheduling Integration](../phase3-ai-scheduling/plan.md)
