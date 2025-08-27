# KidsProgress Architecture

## Overview
KidsProgress is a learning application designed to help kids improve their writing and math skills through AI-powered feedback and analysis.

## System Architecture

### Frontend (React + TypeScript)
- **Framework**: Vite + React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Redux Toolkit
- **Mobile-First**: Responsive design optimized for kids

### Backend (Python + FastAPI)
- **Framework**: FastAPI
- **AI/LLM**: LangGraph workflows with Gemini 2.5 Flash
- **Database**: MongoDB (localhost:27017) + Qdrant (localhost:6333)
- **Architecture Pattern**: Supervisor-based workflow system

## Workflow System

### Main Supervisor
Routes incoming requests to appropriate workflows based on:
- **Form Submissions** → Form-specific workflows
- **Text Messages** → LLM classification → Analysis or General workflows

### Workflow Types

#### 1. Writing Workflow
- Extract metadata (genre, subjects)
- Fetch evaluation criteria 
- AI-powered writing evaluation
- Save results and provide feedback

#### 2. Analysis Workflows
Four types of writing analysis:
- **Macro Analysis**: Overall performance, trends, general skills
- **Single Analysis**: Specific writing piece analysis
- **Learning Advice**: Improvement recommendations
- **Data Query**: Search and retrieve specific writings

#### 3. Math Workflow (Placeholder)
- Future implementation for math problem generation and evaluation

#### 4. General Workflow
- Handles casual conversation and general questions

## Database Schema

### Collections

#### englishWritings
```typescript
{
  _id: ObjectId
  title: string
  text: string
  genre: string
  subjects: string[]
  feedback_student: string
  feedback_parent: string
  overall_score: number
  rubric_scores: WritingCriteriaDimension[]
  improved_text: string
  word_count: number
  difficulty_level: string
  created_at: Date
  updated_at: Date
}
```

#### chatHistory
```typescript
{
  _id: ObjectId
  role: "user" | "ai"
  type: "text" | "form"
  formType?: "writing" | "math"
  content: string
  payload?: any
  analysis_result?: AnalysisResult
  created_at: Date
}
```

#### mathProblems (Future)
```typescript
{
  _id: ObjectId
  problem_text: string
  problem_type: string
  difficulty_level: string
  correct_answer: string
  student_answer: string
  is_correct: boolean
  feedback_student: string
  created_at: Date
}
```

#### studentProgress
```typescript
{
  _id: ObjectId
  student_id: string
  subject: string
  skill_area: string
  current_level: number
  total_points: number
  streak_days: number
  strengths: string[]
  weaknesses: string[]
}
```

## API Endpoints

### Core Endpoints
- `POST /chat` - Main endpoint for all interactions
- `GET /chats` - Retrieve chat history
- `GET /writings` - Get all writings
- `GET /writings/{id}` - Get specific writing
- `GET /analytics/summary` - Get performance analytics
- `GET /health` - Health check

### Request/Response Format

#### Chat Request
```json
{
  "role": "user",
  "content": "string",
  "type": "text" | "form",
  "formType": "writing" | "math",
  "payload": {}
}
```

#### Chat Response
```json
{
  "userMsgId": "string",
  "AIMsg": {
    "_id": "string",
    "role": "ai",
    "content": "string",
    "payload": {}
  }
}
```

## Key Features

### Kid-Friendly UI
- Colorful gradient design with emojis
- Mobile-responsive with touch-friendly buttons
- Overlay navigation for mobile devices
- Progress tracking in header

### AI-Powered Analysis
- Genre and subject identification
- Multi-dimensional rubric scoring
- Personalized feedback for students and parents
- Writing improvement suggestions
- Performance trend analysis

### Analysis Tools
- Recent writing analysis
- Common weakness identification
- Learning topic suggestions
- Writing prompt generation
- Performance statistics

## Development Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Database
- MongoDB: localhost:27017
- Qdrant: localhost:6333 (for future RAG features)

## Future Enhancements

1. **Math Module**: Complete implementation of math problem generation and solving
2. **User Authentication**: Individual student profiles and progress tracking
3. **Gamification**: Badges, streaks, and achievement system
4. **Parent Dashboard**: Detailed progress reports and insights
5. **RAG System**: Use Qdrant for enhanced writing feedback using examples
6. **Multi-language**: Support for different languages beyond English
7. **Voice Integration**: Speech-to-text for younger children
8. **Collaborative Features**: Peer review and sharing capabilities

## Architecture Benefits

- **Modular**: Easy to add new subjects and workflow types
- **Scalable**: LangGraph workflows can handle complex routing
- **Maintainable**: Clear separation of concerns
- **Extensible**: Base classes allow easy feature additions
- **Kid-Focused**: UI and interactions designed for children