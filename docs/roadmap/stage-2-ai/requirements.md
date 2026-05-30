# Stage 2: AI & Intelligence Requirements

## Goal
Add AI-powered features that make the app truly intelligent and adaptive.

**Timeline**: 4-6 weeks
**Prerequisites**: Stage 1 MVP complete and stable

## Success Criteria
- [ ] AI generates daily schedules automatically
- [ ] System replans when tasks run over
- [ ] Handwriting can be uploaded and evaluated
- [ ] Math tool works for grade-appropriate problems
- [ ] Chat helper is context-aware
- [ ] Users can ask analytics questions and get insights

---

## Features Included

### 1. AI Schedule Planning

**Auto-Schedule Generation**
- Click "Generate Plan" button
- AI analyzes all pending tasks
- Considers time constraints
- Factors in task priority, duration, dependencies
- Generates optimized schedule for the day

**Smart Recommendations**
- Suggest task order based on difficulty
- Add appropriate breaks
- Warn about overscheduled days
- Provide reasoning for decisions

**User Control**
- Accept entire plan
- Modify individual slots
- Regenerate with different preferences
- Save preferences for future plans

**Implementation**: Direct Gemini API call with good prompting

---

### 2. Dynamic Replanning

**Trigger Conditions**
- Task exceeds estimated time by 10+ minutes
- Task completes significantly early
- User manually requests replan
- New urgent task added mid-day

**Replanning Logic**
- Calculate impact on remaining tasks
- Decide: compress, postpone, or reschedule
- Notify user of changes
- Explain why changes were made

**User Experience**
- Notification: "Math took longer. Adjusting schedule..."
- Show before/after comparison
- Accept or reject changes
- Option to manually override

**Implementation**: Direct Gemini API call

---

### 3. Handwriting OCR & Evaluation

**Upload Handwriting**
- Take photo or upload image
- Crop/rotate if needed
- Preview before submission

**OCR Processing**
- Gemini extracts text from image
- Display extracted text for review
- Child can correct OCR errors
- Original image preserved

**Evaluation**
- Evaluate both content and handwriting
- Feedback on legibility (if poor OCR accuracy)
- Same quality feedback as typed text
- Compare handwritten vs typed (improvement tracking)

**Implementation**: Single Gemini API call (image → OCR + evaluation)

---

### 4. Math Tool

**Problem Types**
- Multiple choice
- Fill in the blank
- Show your work (step-by-step)
- Word problems

**Problem Sources**
- Parent creates custom problems
- AI generates practice problems by topic
- Difficulty adjusts to grade level

**AI Evaluation**
- Check if answer is correct
- Analyze solution steps (if shown)
- Identify where mistakes occurred
- Provide hints (progressive, not full answer)
- Suggest practice areas

**Interface**
- Math equation editor (or simple text input)
- Scratch pad for work
- Submit answer
- View evaluation and hints

**Implementation**: Direct Gemini API call

---

### 5. Context-Aware Chat Helper

**Task-Specific Mode**
- Know current task details
- Provide relevant help without giving full answers
- "Stuck on this math problem? Let's think through it step by step"
- Access task instructions and requirements

**General Mode**
- Answer any question
- Educational content
- Encouragement and motivation

**Context Switching**
- Automatic: detect if question is about current task
- Manual: toggle button
- Clear indicator of current mode

**Enhanced Capabilities**
- Remember conversation context (last 10 messages)
- Refer to previous questions
- Build on prior explanations

**Implementation**: Direct Gemini API, add conversation history

---

### 6. AI Insights & Analytics

**Natural Language Queries**
- "How was my last writing?"
- "Am I getting better at math?"
- "Show my task completion rate this month"
- "What should I practice more?"

**Insights Types**
- Performance summaries
- Trend analysis
- Comparisons (this week vs last week)
- Strengths and weaknesses identification

**Visualizations**
- Line graphs (progress over time)
- Bar charts (category comparisons)
- Simple tables

**Implementation**
- Start with direct Gemini API
- Add LangChain tool calling only if needed for complex queries

**Initial Queries Supported**
- Last N submissions for a tool
- Completion rate over time
- Points earned by category
- Most/least completed task types

---

## Technical Enhancements

### AI Module Structure
```python
backend/ai/
├── client.py                    # Gemini setup
├── prompts/
│   ├── planning.py             # Schedule generation prompts
│   ├── replanning.py
│   ├── writing_eval.py
│   ├── math_eval.py
│   ├── chat_helper.py
│   └── insights.py
├── evaluators/
│   ├── writing.py              # OCR + evaluation
│   ├── math.py
│   └── points_advisor.py
├── planning.py                  # Schedule generation logic
└── insights/                    # Optional: LangChain if needed
    └── analytics_agent.py
```

### New API Endpoints
```
Planning:
POST   /api/schedule/generate     # AI generates plan
POST   /api/schedule/replan       # Trigger replanning

Math:
POST   /api/tools/math/submit
GET    /api/tools/math/{id}
POST   /api/tools/math/generate   # Generate practice problems

Writing (enhanced):
POST   /api/tools/writing/ocr     # Upload image, get OCR
PATCH  /api/tools/writing/{id}    # Update text after OCR

Insights:
POST   /api/insights/query        # Natural language query
GET    /api/insights/history      # Query history
```

### New Data Models
```python
MathSession (extends ToolSession):
  - problem_text
  - student_answer
  - work_shown
  - correct (bool)
  - hints_given

Schedule (enhanced):
  - ai_generated (bool)
  - generation_reasoning
  - user_modifications
  - replan_history

InsightsQuery:
  - id, user_id, query_text
  - result (analysis + visualization_spec)
  - created_at
```

---

## Development Phases

### Week 1-2: AI Planning
- [ ] Planning prompt engineering
- [ ] Generate schedule API
- [ ] Schedule display with AI suggestions
- [ ] Accept/modify plan UI
- [ ] Replanning trigger logic
- [ ] Replanning API and UI

### Week 3: Handwriting OCR
- [ ] Image upload UI
- [ ] Crop/rotate functionality
- [ ] Gemini OCR integration
- [ ] OCR review/correction UI
- [ ] Preserve original images
- [ ] Update writing evaluation for images

### Week 4: Math Tool
- [ ] Math problem model
- [ ] Problem creation UI (parent)
- [ ] Math interface (child)
- [ ] Answer submission
- [ ] Gemini math evaluation
- [ ] Hints system
- [ ] Practice problem generation

### Week 5: Enhanced Chat
- [ ] Context-aware prompting
- [ ] Task-specific mode
- [ ] Mode indicator UI
- [ ] Conversation history (10 messages)
- [ ] Improved responses

### Week 6: Insights
- [ ] Natural language query parsing
- [ ] Basic analytics queries
- [ ] Visualization generation
- [ ] Query UI
- [ ] Results display
- [ ] LangChain integration (if needed)

---

## What's Still Deferred

**For Stage 3+:**
- Rewards marketplace
- Advanced point rules
- Achievements/badges
- Audio features
- Multi-language
- Offline mode

---

## Success Metrics

**AI Quality**
- Schedule acceptance rate > 70%
- Replanning triggers appropriately (not too often)
- OCR accuracy > 85%
- Math evaluation accuracy > 90%
- Chat helpfulness rating > 4/5

**Usage**
- 50%+ users try AI planning
- Handwriting submissions increase
- Math tool used regularly
- Insights queries per user > 2/week

**Technical**
- AI response time < 3s (95th percentile)
- API costs manageable (< $0.10/user/month)
- No AI-related errors causing failures

---

## Risks & Mitigation

**Risks**
- AI planning too complex/unpredictable
- OCR quality poor for handwriting
- Math evaluation misses correct alternative solutions
- Gemini API costs higher than expected

**Mitigation**
- Start with simple planning heuristics, iterate
- Allow manual OCR correction
- Extensive math evaluation testing
- Monitor API usage, optimize prompts
- Set budget alerts

---

## Go/No-Go Criteria

**After 6 weeks, evaluate:**
- [ ] AI features add clear value (user feedback)
- [ ] Quality metrics met
- [ ] No performance degradation
- [ ] API costs within budget
- [ ] Users excited about Stage 3 features

**If YES → Proceed to Stage 3**
**If NO → Iterate on AI quality, extend timeline**
