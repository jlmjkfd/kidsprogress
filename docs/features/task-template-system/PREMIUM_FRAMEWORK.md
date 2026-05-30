# Premium Framework (Phase 2.5)

## Overview

Added premium framework with TODOs for future implementation. **All users currently have premium access** - the framework is in place but enforcement is disabled until Phase 3.

## What Was Implemented

### 1. Subscription Service

**File**: [backend/services/subscription_service.py](../../../backend/services/subscription_service.py)

Created helper functions that return premium status for all users:

```python
async def get_user_subscription_tier(user_id: ObjectId) -> str:
    """
    TODO Phase 3: Query from User model
    For now: All users are premium
    """
    return "premium"

async def check_user_has_premium(user_id: ObjectId) -> bool:
    """
    TODO Phase 3: Implement real check
    For now: All users have premium
    """
    return True

async def check_can_add_template(user_id: ObjectId, current_template_count: int):
    """
    TODO Phase 3: Enforce limits
    For now: Allow unlimited for all users
    """
    return {
        "allowed": True,
        "reason": "OK",
        "upgrade_required": False
    }

async def check_can_access_premium_template(user_id: ObjectId, template_is_premium: bool):
    """
    TODO Phase 3: Enforce premium access
    For now: Allow all users to access premium templates
    """
    return {
        "allowed": True,
        "reason": "OK",
        "upgrade_required": False
    }
```

### 2. Subscription Tiers Configuration

```python
SUBSCRIPTION_TIERS = {
    "free": {
        "max_templates": 5,
        "can_access_premium": False,
        "price": 0,
    },
    "premium": {
        "max_templates": None,  # Unlimited
        "can_access_premium": True,
        "price": 9.99,  # per month
    },
}
```

### 3. API Route Integration

**File**: [backend/routes/template_library_routes.py](../../../backend/routes/template_library_routes.py)

Updated `add_template_to_my_collection` to call subscription service:

```python
# TODO Phase 3: Check premium access (currently allows all users)
access_check = await check_can_access_premium_template(
    user_id=ObjectId(current_user["_id"]),
    template_is_premium=template.get("is_premium", False)
)
if not access_check["allowed"]:
    raise HTTPException(status_code=402, detail=access_check["reason"])

# TODO Phase 3: Check template count limit (currently allows unlimited)
user_template_count = await user_templates_collection.count_documents({
    "user_id": ObjectId(current_user["_id"])
})
limit_check = await check_can_add_template(
    user_id=ObjectId(current_user["_id"]),
    current_template_count=user_template_count
)
if not limit_check["allowed"]:
    raise HTTPException(status_code=402, detail=limit_check["reason"])
```

### 4. Premium Template Example

**File**: [backend/scripts/seed_plugin_templates.py:81](../../../backend/scripts/seed_plugin_templates.py#L81)

Marked "Creative Writing" template as premium for UI demonstration:

```python
{
    "template_id": "writing",
    "name": "Creative Writing",
    "is_premium": True,  # TODO Phase 3: Mark as premium for demo purposes
    "tags": ["writing", "language", "creativity", "composition", "premium"],
}
```

### 5. UI Shows Premium Badge

**File**: [frontend/src/pages/parent-portal/templates/library.tsx](../../../frontend/src/pages/parent-portal/templates/library.tsx)

Template cards show premium badge:

```tsx
{template.is_premium && (
  <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
    <IconLock className="w-3 h-3" />
    Premium
  </span>
)}
```

## Current Behavior

### What Works Now
✅ Premium badge displays on "Creative Writing" template
✅ All users can add all templates (premium or free)
✅ No template count limits
✅ API calls subscription service (but service returns "allowed")
✅ Framework ready for Phase 3 enforcement

### What's Disabled (TODO Phase 3)
❌ Premium access restriction
❌ Template count limits for free users
❌ Subscription tier checking
❌ Upgrade prompts
❌ Payment integration

## Testing Premium UI

### View Premium Badge

1. Start backend:
```bash
cd d:/workspaces/kidsprogress
backend/.venv/Scripts/python -m uvicorn backend.main:app --reload
```

2. Reseed templates (marks "Creative Writing" as premium):
```bash
backend/.venv/Scripts/python -m backend.scripts.seed_plugin_templates
```

3. Login as parent → Navigate to Template Library
4. See "Creative Writing" has amber "Premium" badge
5. Click "Add to My Templates" → Works (no restriction)

### Templates in Database

After reseeding:
- **Addition & Subtraction Practice**: `is_premium: false` (Free)
- **Creative Writing**: `is_premium: true` (Premium - but accessible to all)

## Phase 3 Implementation Guide

When ready to enforce premium restrictions, follow these steps:

### 1. Update User Model

Add subscription fields:

```python
class User(BaseModel):
    # ... existing fields
    subscription_tier: str = "free"  # "free" or "premium"
    subscription_expires_at: Optional[datetime] = None
    subscription_started_at: Optional[datetime] = None
```

### 2. Implement Real Subscription Service

Update [backend/services/subscription_service.py](../../../backend/services/subscription_service.py):

```python
async def get_user_subscription_tier(user_id: ObjectId) -> str:
    user = await users_collection.find_one({"_id": user_id})
    if not user:
        return "free"

    # Check if expired
    if user.get("subscription_expires_at"):
        if user["subscription_expires_at"] < utcnow():
            return "free"

    return user.get("subscription_tier", "free")
```

### 3. Remove Hardcoded Returns

Replace all `return "premium"` and `return True` with real checks.

### 4. Add Subscription API Routes

Create `backend/routes/subscription_routes.py`:

```python
@router.post("/subscribe")
async def create_subscription(tier: str, payment_token: str):
    # Integrate with Stripe
    # Create subscription
    # Update user record

@router.delete("/subscription")
async def cancel_subscription():
    # Cancel Stripe subscription
    # Update user to free tier

@router.get("/subscription/status")
async def get_subscription_status():
    # Return current subscription info
```

### 5. Frontend Upgrade Prompts

When template limit reached or premium template locked:

```tsx
if (response.status === 402) {
  // Show upgrade modal
  <UpgradeModal
    reason="Premium template access"
    currentPlan="free"
    limitReached={true}
  />
}
```

### 6. Payment Integration

- Install Stripe SDK
- Create checkout session
- Handle webhooks
- Update subscription on payment success

### 7. Analytics Tracking

Track metrics:
- Template usage by tier
- Upgrade conversion rate
- Popular premium templates
- Churn rate

## Files Created/Modified

### Created
- `backend/services/subscription_service.py` - Subscription helper functions with TODOs

### Modified
- `backend/routes/template_library_routes.py` - Integrated subscription checks
- `backend/scripts/seed_plugin_templates.py` - Marked writing template as premium

## Architecture Decisions

### Why This Approach?

1. **Framework First**: Build structure before enforcement
2. **Safe Rollout**: Can enable/disable premium without code changes
3. **Easy Testing**: Premium UI visible without breaking functionality
4. **Gradual Migration**: Add payment integration separately
5. **Future-Proof**: Service layer abstracts subscription logic

### Service Layer Benefits

✅ **Centralized Logic**: All subscription checks in one place
✅ **Testable**: Easy to mock for unit tests
✅ **Flexible**: Change tier definitions without touching routes
✅ **Auditable**: Log all premium access attempts
✅ **Maintainable**: Clear TODOs for Phase 3

## Database Changes

No schema changes needed yet. The `is_premium` field already exists on templates.

**Phase 3 will add**:
- `subscription_tier` field to User model
- `subscription_expires_at` field
- `subscriptions` collection for payment history

## Conclusion

Premium framework is in place with:
- ✅ Service layer with helper functions
- ✅ API integration points
- ✅ UI premium badges
- ✅ Clear TODOs for enforcement
- ✅ All users have premium access (temporary)

**Next Step**: When ready for monetization, implement Phase 3 by removing hardcoded returns and adding real subscription checks.
