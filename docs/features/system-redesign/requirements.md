# KidsProgress System Requirements

## System Overview
An AI-powered time management and learning platform for children that combines task planning, learning tools, and intelligent assistance.

## Core Features

### 1. Time Planning (Main Feature)

#### 1.1 Daily Schedule Management
- **Time Slots**
  - User-defined unavailable periods (school time, sleep time, meal times)
  - Support for varying daily schedules (e.g., meal times differ on weekends)
  - Per-weekday time block templates
  - Automatically calculated available time slots
  - Visual timeline showing blocked vs. available periods

- **All Tasks Completed State**
  - When all daily tasks are finished, display celebration message
  - Show free time suggestions: "Now you have your own time! You can play Minecraft, read comics, or [custom activities]"
  - Track and suggest favorite free-time activities
  - Option to add optional bonus tasks

- **Task Types**
  - **Daily**: Recurring every day (e.g., practice piano 30min)
  - **Weekly**: Specific days per week (e.g., Tuesday/Thursday swimming)
  - **Occasional**: Periodic but not fixed (e.g., library visit every 2 weeks)
  - **One-time**: Single occurrence (e.g., complete science project)
  - **Flexible**: Must be done sometime this week/month

#### 1.2 AI-Powered Planning
- **Initial Planning**
  - On app open, analyze all pending tasks for the day
  - Consider task priority, estimated duration, dependencies
  - Factor in user's energy levels (morning vs. afternoon tasks)
  - Generate suggested schedule: "Do [task] now for [duration], then [next task]"

- **Dynamic Replanning**
  - Monitor task completion in real-time
  - If task exceeds estimated time:
    - Recalculate remaining schedule
    - Suggest adjustments (compress, postpone, or reschedule)
  - If task finishes early:
    - Offer break or advance next task
  - If task cannot finish today:
    - Automatically reschedule to next available day
    - Notify parent/guardian
    - Request confirmation for cancellation option

- **Smart Recommendations**
  - Suggest optimal task order based on:
    - Difficulty level (hard tasks when fresh)
    - Task type (creative vs. repetitive)
    - Available time windows
    - Child's historical performance patterns

#### 1.3 Task Management
- **Task Properties**
  - Title, description, category
  - Estimated duration (AI can suggest based on history)
  - Priority (low/medium/high/urgent)
  - Deadline (soft/hard)
  - Required tools (writing, math, reading, etc.)
  - Parent-assigned vs. self-assigned
  - Dependencies (task B requires task A completion)

- **Task Actions**
  - Start/Pause/Resume/Complete
  - Record actual start/finish times (automatic via button clicks)
  - Add completion notes (optional, for child)
  - Request time extension (with reason)
  - Mark as difficult (triggers AI helper offer)
  - Cancel (parent approval required for important tasks)
  - Reschedule (suggest alternative time)

- **Task Completion Flow**
  1. Child clicks "Start" (records start_time)
  2. Child works on task (timer running)
  3. Child clicks "Finish" (records finish_time, calculates actual_duration)
  4. System prompts for completion notes (optional)
  5. System awards points based on timing
  6. Parent reviews completion (optional)
  7. Parent adds quality notes (e.g., "50-meter swim took 30 seconds, faster than requirement")
  8. AI evaluates quality if tool used (writing/math)
  9. Final points adjusted based on quality

### 2. Learning Tools (Integrated with Tasks)

#### 2.1 Writing Evaluation Tool
- **Text Input**
  - Rich text editor for typed writing
  - Topic/prompt display (if provided)
  - Word count, time tracker

- **Handwriting Input**
  - Upload photo/scan of handwritten work
  - OCR to extract text
  - Preserve original image for evaluation

- **Flexible AI Evaluation** (Not Fixed Criteria)
  - **Context-Aware Analysis**
    - Analyze based on writing type (essay, story, diary, letter, etc.)
    - Consider grade level and task requirements
    - Adapt evaluation focus based on prompt/goals

  - **Dynamic Criteria**
    - Identify relevant aspects for this specific writing
    - Focus on what matters for this type/purpose
    - Grammar/spelling (always)
    - Style-specific evaluation:
      - Creative writing: imagery, character, plot
      - Essay: argument, evidence, structure
      - Diary: expression, reflection
      - Technical: clarity, accuracy

  - **Comparative Analysis**
    - Compare to previous writings of same type
    - Track improvement over time
    - Identify consistent strengths/weaknesses

  - **Feedback Structure**
    - Overall impression
    - Key strengths (2-3 points)
    - Areas for improvement (2-3 points)
    - Specific examples from text
    - Age-appropriate language
    - Actionable suggestions

#### 2.2 Math Practice Tool
- **Problem Types**
  - Multiple choice
  - Fill in the blank
  - Step-by-step solutions
  - Word problems

- **Features**
  - Difficulty levels (grade-based or custom)
  - Topic selection (arithmetic, geometry, algebra, etc.)
  - Timed practice mode
  - Show work/steps
  - Hint system (progressive hints)

- **AI Evaluation**
  - Check answers
  - Analyze problem-solving approach
  - Identify common mistakes
  - Suggest practice areas
  - Adaptive difficulty adjustment

#### 2.3 Tool Integration with Tasks
- When task requires writing: auto-open writing tool
- When task requires math: auto-open math tool
- Tool usage tracked and counted toward task completion
- Submit tool output directly to task
- Task-specific AI helper has access to tool context

### 3. AI Helper System

#### 3.1 Task-Specific AI Helper
- **Context Awareness**
  - Knows current task details
  - Accesses task requirements and instructions
  - Aware of child's progress on this task
  - Can reference previous attempts/submissions

- **Capabilities**
  - Answer task-related questions
  - Provide hints without giving full answers
  - Explain concepts related to task
  - Break down complex tasks into steps
  - Motivate and encourage

#### 3.2 General AI Helper
- **Knowledge Assistant**
  - Define words and concepts
  - Answer general knowledge questions
  - Explain "how things work"
  - Provide age-appropriate explanations

- **Chat Features**
  - Persistent chat history
  - Context switching between general and task-specific
  - Quick actions (e.g., "define this word", "explain this concept")
  - Voice input support (optional future feature)

#### 3.3 AI Helper UI
- **Chat Interface**
  - Right-side panel (current design)
  - Clear indicator: Task Helper vs. General Helper
  - Easy toggle between modes
  - Message types:
    - User question
    - AI response
    - System message (task submitted, time warning, etc.)
    - Tool interaction (writing submitted, math problem completed)

### 4. Points & Rewards System

#### 4.1 Point Earning Rules
- **Task Completion**
  - Finished on time: Full points (e.g., 100)
  - Finished early: Bonus points (e.g., +10-20)
  - Finished late but same day: Reduced points (e.g., 70-90)
  - Finished next day: Minimal points (e.g., 50)
  - Excellent quality (AI-evaluated): Bonus points (e.g., +20)

- **Behavior Points**
  - Consecutive days of task completion: Streak bonus
  - Self-started task without reminder: Initiative bonus
  - Helped set up own schedule: Planning bonus
  - Requested extension early: Responsibility bonus

#### 4.2 Point Deductions
- **Cancellation Policy** (Parent-Configurable)
  - Cancel before deadline: Small deduction (e.g., -20)
  - Cancel after deadline: Medium deduction (e.g., -50)
  - Cancel without reason: Larger deduction (e.g., -70)
  - Cancel with valid reason: No deduction (parent approves)

- **Delay Policy** (Parent-Configurable)
  - First delay: Warning only
  - Repeated delays: Incremental deductions
  - Chronic delays: AI suggests task difficulty adjustment

#### 4.3 AI Point Advisor
- **Evaluation Input**
  - Task quality and effort shown
  - Time management
  - Improvement from previous attempts
  - Difficulty level relative to child's ability

- **Recommendations to Parents**
  - "Although delayed, work quality is excellent - suggest full points"
  - "Task consistently delayed - may be too difficult, suggest adjustment"
  - "Rushed work to meet deadline - suggest quality over speed discussion"
  - "Great effort on challenging task - bonus points recommended"

#### 4.4 Points Dashboard
- **Display**
  - Total points (lifetime)
  - Available points (current balance after redemptions)
  - Points this week/month
  - Points per category (writing, math, planning, etc.)
  - Comparison to previous period
  - Streak counter

- **Goals**
  - Parent-set point goals
  - Rewards tied to milestones
  - Progress visualization (progress bar, charts)

#### 4.5 Rewards Marketplace
- **Points as Currency**
  - Children can spend points on rewards
  - Balance tracks earned minus spent points
  - Transaction history shows earnings and purchases

- **Reward Management (Parent)**
  - Create custom rewards with point cost
  - Reward types:
    - Physical items (e.g., "New toy", "Ice cream")
    - Privileges (e.g., "30min extra screen time", "Stay up late")
    - Experiences (e.g., "Movie night", "Park visit")
    - Special treats (e.g., "Choose dinner", "Skip one chore")
  - Set point cost for each reward
  - Set quantity/availability (unlimited, limited, one-time)
  - Enable/disable rewards
  - Set expiration dates (optional)
  - Add images/icons for rewards

- **Reward Catalog (Child)**
  - Browse available rewards
  - Filter by category or point cost
  - See what they can afford (highlight affordable items)
  - View reward details and cost
  - "Wishlist" feature (save favorites)
  - See points needed for desired items

- **Redemption Flow**
  1. Child selects reward from catalog
  2. System checks if enough points
  3. Child confirms purchase
  4. Points deducted automatically
  5. Notification sent to parent
  6. Parent marks reward as "delivered/fulfilled"
  7. Transaction recorded in history

- **Parent Fulfillment**
  - View pending redemptions
  - Mark as fulfilled/delivered
  - Option to cancel redemption (refund points)
  - Add notes (e.g., "Delivered on Saturday")

- **Reward Analytics**
  - Most popular rewards
  - Spending patterns
  - Motivation effectiveness (do certain rewards drive more task completion?)

### 5. User Roles & Permissions

#### 5.1 Child User
- View own schedule and tasks
- Start/pause/complete tasks
- Use learning tools
- Chat with AI helpers
- Request task extensions/cancellations
- View own points and progress
- **Browse rewards catalog**
- **Redeem rewards with points**
- **Add rewards to wishlist**
- **View redemption history**

#### 5.2 Parent/Guardian
- Create/edit/delete tasks for child
- Set schedule constraints (unavailable times)
- Configure point rules and rewards
- **Create/manage rewards (items, costs, availability)**
- **Fulfill reward redemptions**
- **View reward analytics**
- Approve task cancellations
- Override AI point recommendations
- View detailed progress reports
- Adjust task difficulty/duration based on AI suggestions

#### 5.3 Admin (Optional Future)
- Manage multiple families
- System-wide settings
- Usage analytics

## Technical Requirements

### 6. Data Models

#### 6.1 Core Entities
- **User** (Child, Parent)
- **Task** (Daily, Weekly, Occasional, OneTime, Flexible)
- **Schedule** (TimeBlocks, Constraints)
- **Tool Session** (Writing, Math)
- **Chat Message** (User, AI, System)
- **Points Transaction** (Earn, Deduct, Bonus, Spend)
- **Reward** (Items that can be purchased with points)
- **Redemption** (Reward purchase records)
- **AI Evaluation** (Tool submissions, Task quality)

#### 6.2 Relationships
- User → Tasks (assigned to)
- User → Schedule (has one)
- Task → Tool Sessions (may require)
- Task → Chat Messages (task-specific helper)
- User → Points Transactions (history)
- User → Redemptions (purchase history)
- Parent → Rewards (creates/manages)
- Child → Rewards (can redeem)
- Redemption → Reward (links purchase to item)
- Task → AI Evaluations (quality scores)

### 7. AI Technology Stack

#### 7.1 AI Provider: Google Gemini
- **Model**: Gemini 1.5 Flash
- **Reasons**:
  - Native multimodal support (text + image + audio)
  - Cost-effective ($0.075/1M tokens vs $2.50/1M for OpenAI)
  - Fast response times
  - Good quality for educational use cases
  - Single API for all needs

#### 7.2 Framework Strategy: Start Simple
- **Phase 1 (MVP)**: Direct Gemini API calls
  - No framework overhead
  - Fast to build and debug
  - Covers 90% of use cases
  - Single API call per operation

- **Phase 2 (If Needed)**: Add LangChain
  - Only if insights queries need multiple DB calls
  - Function/tool calling support
  - Still simpler than LangGraph

- **Phase 3 (Unlikely)**: Add LangGraph
  - Only if complex state management proven necessary
  - Multi-step workflows with backtracking
  - Most likely won't need this

#### 7.3 AI Features & Implementation

**Writing Evaluation** (Direct API)
- Input: Text or handwriting image, grade level, context
- Single Gemini call handles OCR + evaluation
- Output: Flexible, context-aware feedback

**Math Evaluation** (Direct API)
- Input: Problem, answer, grade level
- Output: Correctness, hints, explanation

**Planning** (Direct API with good prompts)
- Input: Tasks, constraints, user patterns
- Single Gemini call generates schedule
- Output: Scheduled tasks with reasoning

**Replanning** (Direct API)
- Input: Current schedule, task overrun
- Output: Adjusted schedule, notifications

**Chat Helper** (Direct API or simple LangChain)
- Task-specific or general mode
- Age-appropriate responses
- Add LangChain only if needs multiple tools

**Insights & Analytics** (Optional LangChain)
- Natural language queries about performance
- Generate visualizations on demand
- Compare across time periods
- Add tool calling only if queries get complex

**Point Advisor** (Direct API)
- Recommend points based on quality and effort
- Provide reasoning for parents

#### 7.4 Multimodal Capabilities
- **Text**: All AI features
- **Images**: Handwriting OCR + evaluation
- **Audio** (Future): Voice reading assessment
  - Record child reading passage
  - Transcribe + evaluate pronunciation/fluency
  - Track reading progress

### 8. Internationalization (i18n)

- **Multi-Language Support**
  - Support for multiple languages (English, Chinese, Spanish, etc.)
  - Language selection in user settings
  - Per-user language preference
  - All UI text translatable
  - AI responses in user's preferred language

- **Implementation**
  - Frontend: i18next or similar library
  - Backend: Return language-specific content
  - AI agents: Generate responses in requested language
  - Content: Separate translation files per language

- **Considerations**
  - Right-to-left (RTL) language support (future)
  - Date/time formatting per locale
  - Number formatting per locale

### 9. UI/UX Requirements

#### 9.1 Responsive Design (CRITICAL)
- **All pages must work on both PC and mobile devices**
- **Desktop (>1024px)**
  - Three-panel layout (Left | Center | Right)
  - Full feature set visible

- **Tablet (768px - 1024px)**
  - Collapsible side panels
  - Two panels visible at once
  - Swipe to switch panels

- **Mobile (<768px)**
  - Single panel view (stack vertically)
  - Bottom navigation bar
  - Chat as modal/overlay
  - Touch-optimized controls
  - Larger tap targets (min 44px)

- **Design Principles**
  - Mobile-first approach
  - Fluid layouts (no fixed widths)
  - Touch-friendly buttons and inputs
  - Readable font sizes (min 16px on mobile)
  - Avoid horizontal scrolling

#### 9.2 Layout
- **Left Panel**: Navigation & Schedule
  - Daily timeline view
  - Current task highlight
  - Quick tools access

- **Center Panel**: Main Work Area
  - Task details
  - Learning tool interface (writing/math)
  - Schedule overview

- **Right Panel**: AI Chat
  - Helper mode indicator
  - Message history
  - Quick actions
  - System notifications

### 10. Notifications & Reminders

- Task starting soon (5-10 min before)
- Task time exceeded (gentle reminder)
- Task completion acknowledgment
- Points earned notification
- Schedule adjustment alerts
- Parent approval requests
- Daily summary (morning: plan, evening: achievements)

### 11. Analytics & Insights (AI-Powered)

#### 11.1 For Children (Conversational AI)
- **Natural Language Queries**
  - Ask questions about their own progress
  - Get instant AI-generated insights
  - Request specific comparisons or visualizations

- **Example Interactions**:
  - "How was my last writing?" → AI provides evaluation summary
  - "Am I getting better at writing?" → AI shows trend analysis
  - "What type of writing am I best at?" → AI identifies strengths
  - "Show my swimming progress" → AI generates performance graph

- **Visualizations**
  - Line graphs (progress over time)
  - Bar charts (comparison across categories)
  - Pie charts (time distribution)
  - Streak calendars
  - Generated on-demand by AI based on query

- **Static Dashboard**
  - Current points and streak
  - This week's summary
  - Recent achievements
  - Suggested areas to practice

#### 11.2 For Parents
- **Similar AI Query System**
  - Ask questions about child's progress
  - Request custom reports
  - Compare periods or categories

- **Parent-Specific Insights**
  - Task completion rates
  - Time management patterns
  - Tool usage statistics
  - AI evaluation trends
  - Point earning patterns
  - Areas needing support
  - Suggested interventions

- **Example Queries**:
  - "How is my child doing this month?"
  - "Which subjects need more attention?"
  - "Show task completion rate by weekday"
  - "Has quality of work improved?"

#### 11.3 AI Insights Engine
- **Data Collection**
  - All task completions with timing
  - All tool submissions with evaluations
  - Parent quality notes
  - Points transactions
  - Chat history (optional, for context)

- **Analysis Capabilities**
  - Identify patterns (strengths/weaknesses)
  - Track improvement trajectories
  - Compare similar tasks
  - Generate custom visualizations
  - Provide context-aware recommendations

- **Implementation Notes**
  - Use LangGraph agent for query interpretation
  - Generate visualization specs (type, data, labels)
  - Frontend renders charts from specs
  - Cache common queries for performance
  - Store generated insights for reference

## Future Enhancements

- Multi-child support (family plan)
- Collaborative tasks (siblings)
- Reading comprehension tool
- Science/history learning modules
- Parental controls (screen time, content filters)
- Gamification (badges, achievements, avatars)
- Voice interaction
- Offline mode
- Mobile apps (iOS/Android)
