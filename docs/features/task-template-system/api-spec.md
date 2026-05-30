# Task Template System - API Specification

## Base URL

All endpoints are prefixed with `/api`

## Authentication

All endpoints require authentication via JWT token in Authorization header:

```
Authorization: Bearer <token>
```

## Templates

### List Templates

```http
GET /api/templates
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| category | string | No | Filter by category path (e.g., "academic.math") |
| execution_handler | string | No | Filter by handler type |
| is_public | boolean | No | Filter public/private templates |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 20) |

**Response:**

```json
{
  "templates": [
    {
      "template_id": "tmpl_123",
      "name": "Math Homework Tracker",
      "description": "Track daily math homework completion",
      "category_path": "academic.math.homework",
      "execution_handler": "passive_form",
      "execution_config": { ... },
      "analysis_handler": "structured",
      "created_by": "user_456",
      "is_public": false,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pages": 3
}
```

### Get Template

```http
GET /api/templates/{template_id}
```

**Response:**

```json
{
  "template_id": "tmpl_123",
  "name": "Math Homework Tracker",
  "description": "Track daily math homework completion",
  "category_path": "academic.math.homework",
  "execution_handler": "passive_form",
  "execution_config": {
    "fields": [
      {
        "field_id": "problems_completed",
        "field_type": "number",
        "label": "Problems completed",
        "required": true
      }
    ],
    "allow_photos": true,
    "allow_notes": true
  },
  "execution_llm": null,
  "content_provider": null,
  "analysis_handler": "structured",
  "analysis_config": {
    "metrics": ["completion_rate", "average_problems"]
  },
  "analysis_llm": {
    "enabled": true,
    "model": "gpt-4",
    "prompt_template": "Analyze math homework progress..."
  },
  "created_by": "user_456",
  "is_public": false,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-20T15:30:00Z"
}
```

### Create Template

```http
POST /api/templates
```

**Request Body:**

```json
{
  "name": "Spelling Practice",
  "description": "Weekly spelling quiz",
  "category_path": "academic.english.spelling",
  "execution_handler": "interactive_quiz",
  "execution_config": {
    "questions": [],
    "question_bank_id": "bank_789",
    "num_questions": 10,
    "shuffle_questions": true,
    "show_feedback": true
  },
  "analysis_handler": "structured",
  "analysis_config": {
    "metrics": ["accuracy", "speed"]
  },
  "is_public": false
}
```

**Response:**

```json
{
  "template_id": "tmpl_124",
  "name": "Spelling Practice",
  "created_at": "2024-01-21T09:00:00Z"
}
```

**Validation Errors:**

```json
{
  "detail": [
    {
      "loc": ["body", "execution_handler"],
      "msg": "Unknown execution handler: invalid_handler",
      "type": "value_error"
    }
  ]
}
```

### Update Template

```http
PUT /api/templates/{template_id}
```

**Request Body:** Same as Create Template

**Response:** Updated template object

### Delete Template

```http
DELETE /api/templates/{template_id}
```

**Response:**

```json
{
  "status": "deleted",
  "template_id": "tmpl_123"
}
```

## Task Instances

### Create Task from Template

```http
POST /api/tasks/from-template
```

**Request Body:**

```json
{
  "template_id": "tmpl_123",
  "child_id": "child_456",
  "title": "Math Homework - Chapter 5",
  "scheduled_date": "2024-01-22",
  "time_window": {
    "start_time": "16:00",
    "end_time": "18:00"
  }
}
```

**Response:**

```json
{
  "task_id": "task_789",
  "template_id": "tmpl_123",
  "title": "Math Homework - Chapter 5",
  "scheduled_date": "2024-01-22",
  "status": "pending",
  "created_at": "2024-01-21T10:00:00Z"
}
```

## Completions

### Prepare Task Execution

```http
GET /api/completions/{task_id}/prepare
```

**Response:**

```json
{
  "task_id": "task_789",
  "template_id": "tmpl_123",
  "execution_data": {
    "handler_type": "passive_form",
    "fields": [
      {
        "field_id": "problems_completed",
        "field_type": "number",
        "label": "Problems completed",
        "required": true
      }
    ],
    "allow_photos": true,
    "allow_notes": true
  }
}
```

### Submit Completion

```http
POST /api/completions/{task_id}/submit
```

**Request Body:**

```json
{
  "child_id": "child_456",
  "completion_data": {
    "form_responses": {
      "problems_completed": "15"
    },
    "notes": "Struggled with word problems",
    "photos": ["https://storage.example.com/photo1.jpg"],
    "started_at": "2024-01-22T16:15:00Z"
  }
}
```

**Response:**

```json
{
  "completion_id": "comp_999",
  "task_id": "task_789",
  "metrics": {
    "fields_completed": 1,
    "total_fields": 1,
    "has_notes": true,
    "has_attachments": true,
    "average_numeric_value": 15
  },
  "completed_at": "2024-01-22T16:45:00Z"
}
```

### Get Completions for Task

```http
GET /api/completions?task_id={task_id}
```

**Response:**

```json
{
  "completions": [
    {
      "completion_id": "comp_999",
      "task_id": "task_789",
      "child_id": "child_456",
      "template_id": "tmpl_123",
      "started_at": "2024-01-22T16:15:00Z",
      "completed_at": "2024-01-22T16:45:00Z",
      "measured_data": {
        "fields_completed": 1,
        "has_notes": true
      },
      "detailed_data": {
        "responses": {
          "problems_completed": "15"
        },
        "notes": "Struggled with word problems"
      },
      "llm_analysis": null
    }
  ],
  "total": 1
}
```

### Get Completions by Child and Template

```http
GET /api/completions?child_id={child_id}&template_id={template_id}
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| child_id | string | Yes | Child identifier |
| template_id | string | Yes | Template identifier |
| start_date | string | No | Filter by date (ISO format) |
| end_date | string | No | Filter by date (ISO format) |
| limit | integer | No | Max results (default: 50) |

**Response:** Same as above

## Analysis

### Get Analysis Report

```http
GET /api/analysis/{child_id}/{template_id}
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| start_date | string | No | Start of date range (ISO) |
| end_date | string | No | End of date range (ISO) |
| regenerate | boolean | No | Force regenerate report |

**Response:**

```json
{
  "report_id": "rpt_555",
  "child_id": "child_456",
  "template_id": "tmpl_123",
  "date_range": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "structured_metrics": {
    "total_completions": 12,
    "average_problems_completed": 14.5,
    "completion_rate": 0.86,
    "trend": "improving"
  },
  "llm_insights": {
    "summary": "Child shows consistent improvement in math homework completion...",
    "strengths": [
      "Consistent daily practice",
      "Strong performance on algebra problems"
    ],
    "areas_for_improvement": [
      "Word problems need more attention"
    ],
    "recommendations": [
      "Add extra practice on word problems",
      "Continue current routine"
    ]
  },
  "charts": [
    {
      "chart_type": "line",
      "title": "Problems Completed Over Time",
      "data": [
        {"date": "2024-01-01", "value": 10},
        {"date": "2024-01-02", "value": 12},
        {"date": "2024-01-03", "value": 15}
      ]
    }
  ],
  "generated_at": "2024-02-01T10:00:00Z"
}
```

### Trigger LLM Analysis

```http
POST /api/analysis/{completion_id}/analyze
```

**Request Body:**

```json
{
  "analysis_type": "deep",
  "include_context": true
}
```

**Response:**

```json
{
  "completion_id": "comp_999",
  "llm_analysis": {
    "feedback": "Good effort on completing all problems...",
    "identified_gaps": ["word_problems", "fractions"],
    "confidence": 0.85
  },
  "analyzed_at": "2024-01-22T17:00:00Z"
}
```

## Content Providers

### List Available Providers

```http
GET /api/providers/available
```

**Response:**

```json
{
  "providers": [
    {
      "provider_type": "school_api",
      "name": "School Management System",
      "description": "Integrate with school assignments",
      "auth_type": "api_key",
      "capabilities": ["questions", "assignments"],
      "supports_result_sync": true
    },
    {
      "provider_type": "llm_generator",
      "name": "AI Question Generator",
      "description": "Generate custom questions using AI",
      "auth_type": "api_key",
      "capabilities": ["questions"],
      "supports_result_sync": false
    }
  ]
}
```

### Configure Provider

```http
POST /api/providers/configure
```

**Request Body:**

```json
{
  "provider_type": "school_api",
  "config": {
    "name": "ABC Elementary School",
    "base_url": "https://school.example.com/api",
    "auth_type": "api_key"
  },
  "credentials": {
    "api_key": "sk_test_123456"
  },
  "user_id": "user_456",
  "child_id": "child_789"
}
```

**Response:**

```json
{
  "provider_id": "user_456_school_api",
  "status": "configured",
  "test_result": {
    "status": "success",
    "message": "Connected to ABC Elementary School"
  }
}
```

### Get Provider Content

```http
GET /api/providers/{provider_id}/content
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| content_type | string | Yes | "questions", "assignments", etc. |
| subject | string | No | Filter by subject |
| difficulty | string | No | Filter by difficulty |
| grade_level | string | No | Filter by grade level |
| limit | integer | No | Max items (default: 10) |

**Response:**

```json
{
  "provider_id": "user_456_school_api",
  "content_type": "questions",
  "items": [
    {
      "question_id": "q1",
      "question_text": "What is 5 × 7?",
      "question_type": "multiple_choice",
      "correct_answer": "35",
      "options": ["30", "35", "40", "45"],
      "difficulty": "easy",
      "subject": "math",
      "provider_id": "user_456_school_api",
      "provider_content_id": "school_q_123"
    }
  ],
  "count": 1
}
```

### Sync Result to Provider

```http
POST /api/providers/{provider_id}/sync-result
```

**Request Body:**

```json
{
  "content_id": "school_q_123",
  "result_data": {
    "child_id": "child_789",
    "provider_content_id": "school_q_123",
    "completed_at": "2024-01-22T17:00:00Z",
    "metrics": {
      "score": 0.85,
      "total_questions": 10,
      "correct_answers": 8
    }
  }
}
```

**Response:**

```json
{
  "status": "synced",
  "provider_id": "user_456_school_api",
  "synced_at": "2024-01-22T17:01:00Z"
}
```

## Question Banks

### Create Question Bank

```http
POST /api/question-banks
```

**Request Body:**

```json
{
  "name": "3rd Grade Math - Multiplication",
  "description": "Multiplication tables 1-10",
  "subject": "math",
  "grade_level": "3",
  "questions": [
    {
      "question_id": "q1",
      "question_text": "What is 3 × 4?",
      "question_type": "multiple_choice",
      "correct_answer": "12",
      "options": ["10", "12", "14", "16"],
      "difficulty": "easy"
    }
  ]
}
```

**Response:**

```json
{
  "question_bank_id": "bank_123",
  "name": "3rd Grade Math - Multiplication",
  "question_count": 1,
  "created_at": "2024-01-22T10:00:00Z"
}
```

### Get Question Bank

```http
GET /api/question-banks/{bank_id}
```

**Response:**

```json
{
  "question_bank_id": "bank_123",
  "name": "3rd Grade Math - Multiplication",
  "description": "Multiplication tables 1-10",
  "subject": "math",
  "grade_level": "3",
  "questions": [ ... ],
  "question_count": 50,
  "created_at": "2024-01-22T10:00:00Z"
}
```

## Error Responses

All endpoints may return standard error responses:

### 400 Bad Request

```json
{
  "detail": "Invalid execution_handler: unknown_handler"
}
```

### 401 Unauthorized

```json
{
  "detail": "Invalid or expired token"
}
```

### 403 Forbidden

```json
{
  "detail": "You don't have permission to access this template"
}
```

### 404 Not Found

```json
{
  "detail": "Template not found: tmpl_invalid"
}
```

### 422 Validation Error

```json
{
  "detail": [
    {
      "loc": ["body", "execution_config", "fields"],
      "msg": "At least one field required",
      "type": "value_error"
    }
  ]
}
```

### 500 Internal Server Error

```json
{
  "detail": "Internal server error",
  "error_id": "err_12345"
}
```

## Rate Limits

| Endpoint Pattern | Limit |
|------------------|-------|
| `/api/templates/*` | 100/minute |
| `/api/completions/*/submit` | 30/minute |
| `/api/analysis/*` | 20/minute |
| `/api/providers/*/content` | 10/minute |

Rate limit headers included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706025600
```

## Webhooks (Future)

### Register Webhook

```http
POST /api/webhooks
```

**Request Body:**

```json
{
  "url": "https://your-app.com/webhook",
  "events": ["completion.created", "analysis.completed"],
  "secret": "whsec_your_secret"
}
```

**Response:**

```json
{
  "webhook_id": "wh_123",
  "url": "https://your-app.com/webhook",
  "events": ["completion.created", "analysis.completed"],
  "created_at": "2024-01-22T10:00:00Z"
}
```

### Webhook Payload Example

```json
{
  "event": "completion.created",
  "timestamp": "2024-01-22T17:00:00Z",
  "data": {
    "completion_id": "comp_999",
    "task_id": "task_789",
    "child_id": "child_456",
    "template_id": "tmpl_123"
  }
}
```

## SDK Examples

### Python

```python
from kidsprogress import KidsProgressAPI

api = KidsProgressAPI(api_key="your_api_key")

# Create template
template = api.templates.create(
    name="Math Homework",
    execution_handler="passive_form",
    execution_config={
        "fields": [{"field_id": "score", "field_type": "number", "label": "Score"}]
    }
)

# Create task from template
task = api.tasks.from_template(
    template_id=template.id,
    child_id="child_123",
    scheduled_date="2024-01-22"
)

# Submit completion
completion = api.completions.submit(
    task_id=task.id,
    child_id="child_123",
    completion_data={"form_responses": {"score": "85"}}
)

# Get analysis
report = api.analysis.get(child_id="child_123", template_id=template.id)
print(report.llm_insights.summary)
```

### TypeScript

```typescript
import { KidsProgressAPI } from "@kidsprogress/sdk";

const api = new KidsProgressAPI({ apiKey: "your_api_key" });

// Create template
const template = await api.templates.create({
  name: "Math Homework",
  execution_handler: "passive_form",
  execution_config: {
    fields: [{ field_id: "score", field_type: "number", label: "Score" }],
  },
});

// Create task from template
const task = await api.tasks.fromTemplate({
  templateId: template.id,
  childId: "child_123",
  scheduledDate: "2024-01-22",
});

// Submit completion
const completion = await api.completions.submit({
  taskId: task.id,
  childId: "child_123",
  completionData: { form_responses: { score: "85" } },
});

// Get analysis
const report = await api.analysis.get({
  childId: "child_123",
  templateId: template.id,
});
console.log(report.llmInsights.summary);
```
