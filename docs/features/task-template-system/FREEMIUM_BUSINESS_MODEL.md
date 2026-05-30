# Template System - Freemium Business Model

## Business Model Design

### Template Types

#### 1. **System Plugins** (Code-based)
- Created by developers in code (`templates/` folder)
- Core templates everyone gets
- Examples: addition-subtraction, writing

#### 2. **Template Library** (Database-based)
- TaskTemplate records in MongoDB
- Tagged as `free` or `premium`
- Users "add to my templates"

### User Tiers

#### Free Tier
- Can access **Free system plugins** (all basic templates)
- Can add **Free library templates** to "My Templates"
- Limited to X templates from library (e.g., 5 total)

#### Premium Tier ($9.99/month)
- All **Free** features
- Can add **Premium library templates**
- Unlimited templates
- Early access to new templates
- Can create custom templates (future feature)

## Architecture

### Two-Layer System

```
Layer 1: System Plugins (Code)
├── Free: addition-subtraction, writing, reading
└── Premium: advanced-math, creative-writing-pro, science-lab

Layer 2: Template Library (Database)
├── Free Templates (is_premium: false)
│   └── Users can add to "My Templates"
└── Premium Templates (is_premium: true)
    └── Only premium users can add
```

### Database Schema

```typescript
interface TaskTemplate {
  template_id: string;           // e.g., "multiplication-mastery"
  name: string;
  description: string;
  category_path: string;

  // Plugin reference
  plugin_id: string;             // References code plugin (e.g., "interactive_math_quiz")
  execution_config: Record<string, any>;  // Pre-configured settings

  // Business model
  is_public: boolean;            // In marketplace?
  is_premium: boolean;           // Requires premium subscription?

  // Authorship
  created_by: string;            // "system" or user_id
  created_at: datetime;
}

interface UserTemplate {
  user_id: string;
  template_id: string;           // References TaskTemplate
  added_at: datetime;
}
```

## User Experience Flow

### Free User

1. **Browse Template Library**
   - See free templates (is_premium: false)
   - Premium templates shown but locked 🔒

2. **Add Template**
   - Click "Add to My Templates" on free template
   - Check: Has user reached limit? (e.g., 5 templates max)
   - If yes → Prompt upgrade
   - If no → Add to user_templates collection

3. **Create Task**
   - Dropdown shows:
     - System free plugins
     - User's added templates from library
   - Select → Configure → Create task

### Premium User

1. **Browse Template Library**
   - See ALL templates (free + premium)
   - No locks 🔓

2. **Add Template**
   - Click "Add to My Templates" on ANY template
   - No limits
   - Add to user_templates collection

3. **Create Task**
   - Dropdown shows:
     - All system plugins (free + premium)
     - All user's added templates
   - More choices available

## Monetization Strategy

### Free Tier Value Prop
- 3-5 core system plugins (math, writing, reading)
- Can try 5 additional templates from library
- Good for trying the system

### Premium Tier ($9.99/month)
**What they get:**
1. **Unlimited Templates** - Add as many as you want
2. **Premium Templates** - Advanced, specialized templates
3. **Early Access** - New templates before free users
4. **Priority Support** - Faster help
5. **Custom Templates** (future) - Create your own
6. **Advanced Analytics** (future) - Deeper insights

### Additional Revenue Streams

#### 1. Template Marketplace (Future)
- Users can create and sell custom templates
- Platform takes 30% commission
- Premium users can publish templates

#### 2. School/Organization Plans ($49.99/month)
- Multiple parent accounts
- Shared template library
- Admin dashboard
- Bulk discounts

#### 3. One-time Template Purchases
- Users can buy individual premium templates ($2.99 each)
- Alternative to monthly subscription
- "Try before you buy" with previews

## Implementation Plan

### Phase 1: Basic Template Library ✅ (Current)
- System plugins working
- No freemium yet
- All templates available to all users

### Phase 2: Template Library Pages
- **Templates Library Page** - Browse all templates
- **My Templates Page** - User's added templates
- "Add to My Templates" button
- user_templates collection

### Phase 3: Freemium Model
- Add `is_premium` field to templates
- Check user subscription status
- Limit free users to X templates
- Lock premium templates for free users
- Upgrade prompts

### Phase 4: Marketplace
- User-created templates
- Template review/approval system
- Pricing and revenue sharing

## Template Library Structure

### System Templates (Code Plugins)
```
templates/
├── free/
│   ├── addition_subtraction/     (Free - always available)
│   ├── basic_writing/
│   └── reading_comprehension/
└── premium/
    ├── advanced_math/             (Premium - subscription required)
    ├── creative_writing_pro/
    └── science_experiments/
```

### Library Templates (Database)
```
task_templates collection:
{
  template_id: "multiplication-practice-10x10",
  name: "Multiplication Practice (10x10)",
  plugin_id: "interactive_math_quiz",     // Uses existing plugin
  execution_config: {                      // Pre-configured
    max_value: 100,
    num_questions: 20,
    only_carry: false
  },
  is_public: true,
  is_premium: false,                       // Free template
  created_by: "system"
}

{
  template_id: "advanced-algebra-practice",
  name: "Advanced Algebra Practice",
  plugin_id: "interactive_math_quiz",
  execution_config: { ... },
  is_public: true,
  is_premium: true,                        // Premium template 🔒
  created_by: "system"
}
```

### User Templates Tracking
```
user_templates collection:
{
  user_id: "user123",
  template_id: "multiplication-practice-10x10",
  added_at: "2025-01-15T10:30:00Z"
}
```

## Competitive Pricing Analysis

| Competitor | Price | Templates | Custom |
|------------|-------|-----------|--------|
| Khan Academy Kids | Free | Limited | No |
| ABCmouse | $12.99/mo | 10,000+ | No |
| IXL | $9.95/mo | Unlimited | No |
| **KidsProgress** | **$9.99/mo** | **Unlimited + Custom** | **Yes** |

## Key Differentiators

1. **Plugin Architecture** - Extensible, not locked-in
2. **Custom Templates** - Parents can create their own
3. **Template Marketplace** - Community-driven content
4. **Fair Freemium** - Useful free tier, clear upgrade value

## Conversion Funnel

```
Free User
  ↓
Hits template limit (5 templates added)
  ↓
See locked premium template they want
  ↓
Upgrade prompt: "Unlock unlimited templates + premium content"
  ↓
Trial: 14-day free trial of premium
  ↓
Convert to paid: $9.99/month
```

## Metrics to Track

- **Free tier**: Templates added, limit hits, upgrade prompts shown
- **Premium tier**: Templates used, most popular premium templates
- **Conversion rate**: Free → Premium
- **Churn rate**: Premium cancellations
- **Template engagement**: Which templates get used most

## Recommendations

### Start Simple
1. **Phase 2 first** - Build template library (free for all)
2. **Validate usage** - See if users actually add templates
3. **Then add premium** - Once you have template engagement

### Pricing Strategy
- **Start generous** - 10 free templates, not 5
- **Focus on value** - Premium templates must be obviously better
- **Trial period** - 14-day free trial converts better

### Template Creation
- **Curate carefully** - Quality over quantity
- **Progressive disclosure** - Simple templates free, advanced premium
- **Clear value** - Premium templates solve real pain points
