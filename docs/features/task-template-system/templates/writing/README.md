# Writing Template

## Overview

A creative writing template that allows children to write stories, essays, or journal entries with optional AI-powered feedback to improve their writing skills.

## Template ID

`writing`

## Features

- ✅ Title and content input
- ✅ Writing prompts to guide creativity
- ✅ Word count tracking
- ✅ Minimum/maximum word limits
- ✅ Optional AI feedback on writing quality
- ✅ Draft saving capability
- ✅ Progress analytics
- ✅ Writing history

## Configuration Options

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `content_type` | enum | "writing" | Type: writing, drawing, recording |
| `prompts` | string[] | [] | Writing prompts to guide child |
| `min_length` | number | 50 | Minimum word count required |
| `max_length` | number | 2000 | Maximum word count allowed |
| `allow_llm_feedback` | boolean | true | Enable AI feedback |
| `save_drafts` | boolean | false | Allow saving drafts |

### Example Configuration

```json
{
  "content_type": "writing",
  "prompts": [
    "Write about your favorite day",
    "What made it special?",
    "How did you feel?"
  ],
  "min_length": 100,
  "max_length": 500,
  "allow_llm_feedback": true,
  "save_drafts": false
}
```

## User Experience

### Child View (Execution)

1. Child sees writing prompts (if provided)
2. Enters title and content
3. Real-time word count displayed
4. Validates minimum word requirement
5. Submits writing
6. (Optional) Receives AI feedback

### Parent View (Analysis)

- Total writings completed
- Total words written
- Average words per writing
- AI scores (if enabled)
- Writing history with titles and dates
- Improvement trends

## Data Structure

### Execution Data

```typescript
{
  handler_type: "writing",
  content_type: "writing",
  prompts: string[],
  min_length: number,
  max_length: number
}
```

### Completion Data

```typescript
{
  detailed_data: {
    title: string,
    content: string,
    prompts_used?: string[],
    started_at: string,
    content_type: string
  },
  measured_data: {
    word_count: number,
    character_count: number
  },
  llm_analysis?: {
    overall_score?: number,          // 0-10
    feedback_summary?: string,
    strengths?: string[],
    improvements?: string[],
    highlighted_phrases?: string[]
  }
}
```

## Components

### 1. SettingsEditor

Located: `frontend/src/templates/writing/components/SettingsEditor.tsx`

Configuration UI for task creation/edit modal.

**Features:**
- Content type selector
- Writing prompts editor (multi-line)
- Min/max word length inputs
- AI feedback toggle
- Draft saving toggle

### 2. TaskExecutor

Located: `frontend/src/templates/writing/components/TaskExecutor.tsx`

Main writing interface for children.

**Features:**
- Title input field
- Large content textarea
- Writing prompts display (if configured)
- Real-time word/character count
- Min/max length indicators
- Submit button with validation

### 3. AnalysisView

Located: `frontend/src/templates/writing/components/AnalysisView.tsx`

Progress analysis for parents.

**Features:**
- Key metrics (total writings, words, average)
- AI score average (if enabled)
- Recent writings list with titles and dates
- Quick preview of each writing

### 4. AttemptView

Located: `frontend/src/templates/writing/components/AttemptView.tsx`

Detailed view of individual writings.

**Features:**
- Full text display
- Writing statistics (word count, characters)
- AI feedback section (if available):
  - Overall score
  - Feedback summary
  - Strengths list
  - Areas for improvement
- Beautiful formatting for readability

## Backend Handler

Located: `backend/templates/writing/handler.py`

**Methods:**
- `prepare_execution()` - Provides writing prompts and settings
- `process_completion()` - Stores writing and calculates basic metrics
- `request_llm_analysis()` - (Optional) Requests AI feedback
- `calculate_metrics()` - Computes word count, character count

## AI Feedback Integration

When `allow_llm_feedback` is enabled:

1. Writing is submitted
2. Backend sends to LLM for analysis
3. LLM evaluates:
   - Overall quality (0-10 score)
   - Writing strengths
   - Areas for improvement
   - Notable phrases
4. Feedback stored with completion
5. Displayed in AttemptView

**LLM Prompt Structure:**
```
Evaluate this child's writing:
- Grade level appropriateness
- Grammar and spelling
- Creativity and expression
- Structure and organization

Provide encouraging, constructive feedback.
```

## i18n Support

**English**: `frontend/src/templates/writing/locales/en/translation.json`
**Chinese**: `frontend/src/templates/writing/locales/zh/translation.json`

**Namespace**: `template-writing`

## Use Cases

### Creative Writing Practice

- **Journal Entries**: Daily reflections (min: 50 words)
- **Story Writing**: Creative stories (min: 200 words)
- **Essay Practice**: Structured essays (min: 500 words)

### English Language Learning

Parents can use prompts to guide ESL children in writing practice with immediate word count feedback and grammar suggestions from AI.

### Writing Portfolio

Build a collection of writings over time to track improvement and celebrate progress.

## Metrics Tracked

| Metric | Description |
|--------|-------------|
| Word Count | Total words per writing |
| Character Count | Total characters including spaces |
| Writing Frequency | Writings per week/month |
| AI Score Trend | Improvement in AI ratings over time |
| Average Length | Average words per writing |

## Best Practices

### For Parents

1. **Start with Prompts**: Young children benefit from guided prompts
2. **Appropriate Length**: Adjust min/max based on child's age and skill
3. **Celebrate Progress**: Review writings together to show improvement
4. **Use AI Wisely**: AI feedback is a tool, not a judge

### For Developers

1. **Preserve Formatting**: Store content as-is, preserve line breaks
2. **LLM Rate Limiting**: Don't overwhelm AI services
3. **Privacy**: Ensure writings aren't used for LLM training
4. **Encouraging Tone**: AI feedback should be positive and constructive

## Future Enhancements

- [ ] Drawing mode with canvas
- [ ] Audio recording for oral stories
- [ ] Collaborative writing (sibling co-authoring)
- [ ] Writing templates (letters, poems, reports)
- [ ] Spell-check integration
- [ ] Export to PDF/print
- [ ] Illustration adding capability
- [ ] Writing contests/challenges

## Privacy & Safety

⚠️ **Important**: Children's writings may contain personal information.

- Writings are stored securely in database
- Access restricted to family members only
- AI analysis uses privacy-preserving methods
- Parents can disable AI feedback
- No writings used for training AI models

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-11 | Initial plugin architecture version |

## Related

- [Addition-Subtraction Template](../addition-subtraction/) - For math practice
- [Plugin Development Guide](../../guidelines/guide-template-development.md)
- [Plugin Architecture](../../guidelines/PLUGIN_ARCHITECTURE.md)
