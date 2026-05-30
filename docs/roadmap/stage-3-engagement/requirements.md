# Stage 3: Engagement & Rewards Requirements

## Goal
Make the app fun, motivating, and rewarding to use daily.

**Timeline**: 3-4 weeks
**Prerequisites**: Stage 2 complete, AI features working well

## Success Criteria
- [ ] Kids can browse and redeem rewards
- [ ] Parents can create custom rewards
- [ ] Achievement system adds motivation
- [ ] Daily check-ins track well-being
- [ ] Streaks encourage consistency
- [ ] Point advisor gives quality-based bonuses

---

## Features Included

### 1. Rewards Marketplace

**Parent: Create Rewards**
- Add reward (title, description, image/icon)
- Set point cost
- Choose category (physical, privilege, experience, treat)
- Set quantity (unlimited, limited, one-time)
- Set availability (enable/disable)
- Optional expiration date

**Child: Browse & Redeem**
- View available rewards catalog
- Filter by category or point cost
- See affordable items highlighted
- Add to wishlist
- Purchase with points (confirmation dialog)
- View redemption history

**Redemption Flow**
1. Child redeems reward
2. Points deducted automatically
3. Parent gets notification
4. Parent fulfills reward (marks delivered)
5. Optional: parent adds notes
6. Transaction recorded

**Parent Fulfillment**
- View pending redemptions
- Mark as fulfilled
- Cancel and refund points (if needed)
- Add fulfillment notes

---

### 2. Advanced Points System

**Earning Enhancements**
- Quality bonuses (AI-recommended)
- Streak bonuses (consecutive days)
- Early completion bonus
- Initiative bonus (self-started task)

**Point Deductions** (Parent-Configurable)
- Late completion penalties (optional)
- Cancellation deductions (optional)
- Parent can disable penalties entirely

**Point Advisor AI**
- Analyzes task quality and effort
- Recommends bonus points to parent
- Provides reasoning
- Parent can accept or override

**Configurable Rules**
- Parent sets base point values
- Enable/disable bonuses and penalties
- Set streak multipliers
- Define quality thresholds

---

### 3. Achievements & Badges

**Achievement Types**
- Task milestones (10, 50, 100 tasks completed)
- Streak achievements (7, 30, 100 days)
- Category mastery (20 writing tasks)
- Quality achievements (5 perfect scores)
- Special (first task, early bird, night owl)

**Badge Display**
- Earned badges on profile
- Progress towards next badge
- Notification when earned
- Visual trophy case

**Gamification Balance**
- Focus on progress, not perfection
- Celebrate effort, not just results
- No public leaderboards (private only)

---

### 4. Streaks & Milestones

**Daily Streak**
- Track consecutive days with at least 1 completed task
- Streak counter badge
- Warning when streak at risk
- Streak recovery (1 free skip per month)

**Weekly Goals**
- Parent or child sets weekly point goal
- Progress bar visualization
- Celebration when achieved
- History of weekly performance

**Milestones**
- 100 points, 500 points, 1000 points
- 10 tasks, 50 tasks, 100 tasks
- Special celebrations for big milestones

---

### 5. Daily Check-ins

**Morning Check-in**
- "How are you feeling today?" (mood scale 1-5)
- Optional: "What are you looking forward to?"
- Affects AI planning (lighter schedule if feeling tired)

**Evening Check-in**
- "How was your day?" (mood scale)
- Optional: "What did you learn today?"
- Celebrate accomplishments

**Mood Tracking**
- Simple visualization (emoji scale)
- Parents can see mood trends
- AI adjusts encouragement based on mood
- Privacy: child can skip if they want

**Well-being Indicators**
- Consistently low mood → parent notification
- High stress patterns → suggest break/adjustment
- Positive trends → celebrate

---

### 6. Parent Communication Tools

**Parent Notes**
- Leave encouraging notes for child
- Displayed in dashboard or before tasks
- Optional: schedule notes for future

**Quality Feedback**
- Parent can add quality notes to completed tasks
- "Great job on the presentation!"
- "50m swim in 30 seconds, faster than requirement!"
- Shown alongside AI evaluation

**Check-in Review**
- Parent can view child's mood check-ins
- Identify patterns or concerns
- Discussion prompts if needed

---

## Technical Enhancements

### New Data Models
```python
Reward:
  - id, parent_id, title, description
  - category, point_cost, quantity
  - image_url, icon, available
  - expiration_date, times_redeemed

Redemption:
  - id, child_id, reward_id
  - points_spent, redeemed_at, status
  - fulfilled_by, fulfilled_at, parent_notes
  - refunded, refund_reason

Achievement:
  - id, type, title, description
  - icon, criteria (milestone value)
  - category

UserAchievement:
  - id, user_id, achievement_id
  - earned_at, progress (for partial)

DailyCheckin:
  - id, user_id, date, time (morning/evening)
  - mood_score (1-5)
  - notes (optional text)

Streak:
  - id, user_id, current_streak
  - longest_streak, last_activity_date
  - recovery_available

ParentNote:
  - id, parent_id, child_id
  - content, scheduled_for (optional)
  - created_at, displayed (bool)
```

### New API Endpoints
```
Rewards:
GET    /api/rewards
POST   /api/rewards              # Parent only
PATCH  /api/rewards/{id}         # Parent only
DELETE /api/rewards/{id}         # Parent only

Redemptions:
POST   /api/redemptions          # Child
GET    /api/redemptions
GET    /api/redemptions/pending  # Parent
PATCH  /api/redemptions/{id}/fulfill
POST   /api/redemptions/{id}/cancel

Achievements:
GET    /api/achievements
GET    /api/achievements/earned
GET    /api/achievements/progress

Check-ins:
POST   /api/checkins
GET    /api/checkins
GET    /api/checkins/trends

Streaks:
GET    /api/streaks/current
POST   /api/streaks/recovery

Parent Notes:
POST   /api/notes
GET    /api/notes
PATCH  /api/notes/{id}/displayed
```

---

## Development Phases

### Week 1: Rewards Marketplace
- [ ] Reward model and API
- [ ] Create reward UI (parent)
- [ ] Rewards catalog UI (child)
- [ ] Redemption flow
- [ ] Parent fulfillment UI
- [ ] Points deduction logic
- [ ] Transaction history

### Week 2: Points Enhancement
- [ ] Quality bonus system
- [ ] Point advisor AI
- [ ] Configurable point rules UI
- [ ] Streak bonus calculation
- [ ] Points dashboard redesign
- [ ] Bonus notifications

### Week 3: Achievements & Streaks
- [ ] Achievement definitions
- [ ] Progress tracking logic
- [ ] Badge UI and animations
- [ ] Streak counter
- [ ] Streak recovery
- [ ] Achievement notifications
- [ ] Trophy case page

### Week 4: Daily Check-ins & Communication
- [ ] Check-in prompts (morning/evening)
- [ ] Mood tracking UI
- [ ] Mood trends visualization
- [ ] Parent notes feature
- [ ] Quality feedback UI
- [ ] Well-being alerts

---

## UX Enhancements

**Visual Polish**
- Confetti animation when earning achievement
- Progress bars for goals
- Smooth transitions
- Celebratory messages
- Better icons and imagery

**Notifications**
- Points earned notification
- Achievement unlocked
- Streak milestone
- Redemption fulfilled
- Parent note available

---

## What's Still Deferred

**For Stage 4+:**
- Multi-language
- Offline mode
- Performance optimization
- Advanced analytics
- Voice features
- Social features

---

## Success Metrics

**Engagement**
- Redemptions per week > 0.5 (users spending points)
- Check-in completion rate > 60%
- Achievement view rate > 80%
- Streak retention > 50% (maintain 7+ days)

**Motivation**
- Task completion rate increases 10%+
- User satisfaction rating improves
- Parents report increased motivation
- Kids report it's "more fun"

**Economic**
- Rewards catalog usage > 70% of parents create rewards
- Point velocity (earn vs spend) balanced
- No exploitation of point system

---

## Risks & Mitigation

**Risks**
- Gamification feels manipulative
- Kids focus on rewards, not learning
- Point inflation/deflation issues
- Check-ins feel like chore

**Mitigation**
- Growth mindset messaging throughout
- Celebrate effort, not just outcomes
- Parent controls all reward values
- Optional check-ins (can skip)
- Regular user feedback surveys

---

## Go/No-Go Criteria

**After 4 weeks, evaluate:**
- [ ] Engagement metrics show improvement
- [ ] User feedback positive (fun factor)
- [ ] No negative behavioral patterns
- [ ] Parents feel in control
- [ ] Ready for optimization phase

**If YES → Proceed to Stage 4**
**If NO → Refine engagement features, A/B test**
