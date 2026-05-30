# Addition & Subtraction Practice Template

## Overview

A math practice template for children to practice addition and subtraction skills with immediate feedback and progress tracking.

## Template ID

`addition-subtraction`

## Features

- ✅ Dynamic question generation
- ✅ Configurable difficulty (max value)
- ✅ Variable question count (1-100)
- ✅ Optional carry/borrow only mode
- ✅ Built-in timer
- ✅ Immediate answer validation
- ✅ Detailed attempt review
- ✅ Progress analytics

## Configuration Options

### Settings

| Setting | Type | Range | Default | Description |
|---------|------|-------|---------|-------------|
| `max_value` | number | 10-10000 | 100 | Maximum number in questions |
| `num_questions` | number | 1-100 | 10 | Number of questions to generate |
| `only_carry` | boolean | - | false | Only questions requiring carry/borrow |
| `has_timer` | boolean | - | true | Enable timer during practice |

### Example Configuration

```json
{
  "max_value": 100,
  "num_questions": 10,
  "only_carry": false,
  "has_timer": true
}
```

## User Experience

### Child View (Execution)

1. Child starts task
2. System generates questions based on settings
3. Timer starts (if enabled)
4. Child answers each question
5. System validates answers in real-time
6. On submission, task auto-completes
7. Child can view detailed results

### Parent View (Analysis)

- Total questions answered
- Accuracy percentage
- Average time per question
- Common mistake patterns
- Progress over time

## Data Structure

### Execution Data

```typescript
{
  handler_type: "addition-subtraction",
  questions: [
    {
      question_id: string,
      num1: number,
      operator: "+" | "-",
      num2: number,
      answer: number
    }
  ],
  has_timer: boolean
}
```

### Completion Data

```typescript
{
  detailed_data: {
    questions: Array<Question>,
    answers: Record<string, number>,  // question_id -> user_answer
    total_time_seconds: number,
    started_at: string
  },
  measured_data: {
    correct_count: number,
    incorrect_count: number,
    accuracy: number,
    average_time_per_question: number
  }
}
```

## Components

### 1. SettingsEditor

Located: `frontend/src/templates/addition-subtraction/components/SettingsEditor.tsx`

Configuration UI for task creation/edit modal.

**Features:**
- Number range slider
- Question count selector
- Carry/borrow toggle
- Timer toggle

### 2. TaskExecutor

Located: `frontend/src/templates/addition-subtraction/components/TaskExecutor.tsx`

Main execution interface for children.

**Features:**
- Question display with large fonts
- Number input for answers
- Progress indicator
- Timer display (optional)
- Submit button

### 3. AnalysisView

Located: `frontend/src/templates/addition-subtraction/components/AnalysisView.tsx`

Progress analysis for parents.

**Features:**
- Key metrics cards (total, accuracy, avg time)
- Recent attempts list
- Detailed breakdown per attempt

### 4. AttemptView

Located: `frontend/src/templates/addition-subtraction/components/AttemptView.tsx`

Detailed view of individual attempts.

**Features:**
- Question-by-question breakdown
- Color-coded correct/incorrect
- Shows user answer vs correct answer
- Summary statistics (correct, incorrect, accuracy)

## Backend Handler

Located: `backend/templates/addition_subtraction/handler.py`

**Methods:**
- `prepare_execution()` - Generates random questions based on settings
- `process_completion()` - Validates answers and structures data
- `calculate_metrics()` - Computes accuracy, timing statistics

## i18n Support

**English**: `frontend/src/templates/addition-subtraction/locales/en/translation.json`
**Chinese**: `frontend/src/templates/addition-subtraction/locales/zh/translation.json`

**Namespace**: `template-addition-subtraction`

## Use Cases

### Elementary School Math Practice

- **Grade 1-2**: max_value: 20, num_questions: 5-10
- **Grade 3-4**: max_value: 100, num_questions: 10-15, only_carry: true
- **Grade 5-6**: max_value: 1000, num_questions: 20-30

### Homework Assignments

Parents can assign daily math practice with specific difficulty levels tailored to their child's current skill level.

### Skill Assessment

Use consistent settings across multiple attempts to track improvement over time.

## Metrics Tracked

| Metric | Description |
|--------|-------------|
| Accuracy | Percentage of correct answers |
| Speed | Average time per question |
| Completion Rate | Questions answered / total questions |
| Improvement Trend | Accuracy change over time |
| Error Patterns | Which operations cause most mistakes |

## Best Practices

### For Parents

1. **Start Easy**: Begin with lower max_value and fewer questions
2. **Build Gradually**: Increase difficulty as child improves
3. **Regular Practice**: Daily short sessions better than long weekly sessions
4. **Review Mistakes**: Use AttemptView to identify problem areas

### For Developers

1. **Random Generation**: Ensure questions are truly random, not predictable
2. **Validation**: Validate answers both client and server side
3. **Performance**: Keep generation fast even for 100 questions
4. **Accessibility**: Ensure large, readable numbers for young children

## Future Enhancements

- [ ] Multiplication and division support
- [ ] Mixed operations in single session
- [ ] Adaptive difficulty (automatic adjustment)
- [ ] Timed challenge mode
- [ ] Leaderboards/achievements
- [ ] Practice specific number ranges (e.g., "numbers ending in 5")

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-11 | Initial plugin architecture version |

## Related

- [Writing Template](../writing/) - For language arts practice
- [Plugin Development Guide](../../guidelines/guide-template-development.md)
- [Plugin Architecture](../../guidelines/PLUGIN_ARCHITECTURE.md)
