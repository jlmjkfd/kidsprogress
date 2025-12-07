"""
Subscription Service - Handle user subscription status and template access

TODO Phase 3: Implement real subscription management
- Add subscription_tier field to User model
- Integrate with payment provider (Stripe)
- Add subscription management endpoints
- Track subscription status and expiry
"""
from typing import Dict, Any
from bson import ObjectId


# TODO Phase 3: Define subscription tiers
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


async def get_user_subscription_tier(user_id: ObjectId) -> str:
    """
    Get user's subscription tier.

    TODO Phase 3: Query from User model
    - Check user.subscription_tier field
    - Verify subscription is active (not expired)
    - Handle trial periods

    For now: All users are premium
    """
    # TODO Phase 3: Real implementation
    # user = await users_collection.find_one({"_id": user_id})
    # if not user:
    #     return "free"
    #
    # subscription = user.get("subscription", {})
    # tier = subscription.get("tier", "free")
    # expires_at = subscription.get("expires_at")
    #
    # # Check if subscription expired
    # if expires_at and expires_at < utcnow():
    #     return "free"
    #
    # return tier

    # Temporary: All users are premium
    return "premium"


async def check_user_has_premium(user_id: ObjectId) -> bool:
    """
    Check if user has premium subscription.

    TODO Phase 3: Implement real check
    - Verify subscription tier
    - Check expiry date
    - Handle grace periods

    For now: All users have premium
    """
    tier = await get_user_subscription_tier(user_id)
    return tier == "premium"


async def check_can_add_template(user_id: ObjectId, current_template_count: int) -> Dict[str, Any]:
    """
    Check if user can add another template to their collection.

    Returns:
        {
            "allowed": bool,
            "reason": str,
            "current_count": int,
            "max_count": int | None,
            "upgrade_required": bool
        }

    TODO Phase 3: Implement real limits
    - Check user's subscription tier
    - Compare current count with tier limit
    - Return upgrade prompt if needed

    For now: All users can add unlimited templates
    """
    tier = await get_user_subscription_tier(user_id)
    tier_config = SUBSCRIPTION_TIERS[tier]
    max_templates = tier_config["max_templates"]

    # TODO Phase 3: Enforce limits
    # if max_templates is not None and current_template_count >= max_templates:
    #     return {
    #         "allowed": False,
    #         "reason": "Template limit reached for free tier",
    #         "current_count": current_template_count,
    #         "max_count": max_templates,
    #         "upgrade_required": True
    #     }

    # Temporary: Allow unlimited for all users
    return {
        "allowed": True,
        "reason": "OK",
        "current_count": current_template_count,
        "max_count": max_templates,
        "upgrade_required": False
    }


async def check_can_access_premium_template(user_id: ObjectId, template_is_premium: bool) -> Dict[str, Any]:
    """
    Check if user can access a premium template.

    Returns:
        {
            "allowed": bool,
            "reason": str,
            "upgrade_required": bool
        }

    TODO Phase 3: Implement premium access control
    - Check if template is premium
    - Verify user has premium subscription
    - Return upgrade prompt if needed

    For now: All users can access premium templates
    """
    if not template_is_premium:
        return {
            "allowed": True,
            "reason": "Template is free",
            "upgrade_required": False
        }

    has_premium = await check_user_has_premium(user_id)

    # TODO Phase 3: Enforce premium access
    # if not has_premium:
    #     return {
    #         "allowed": False,
    #         "reason": "Premium subscription required",
    #         "upgrade_required": True
    #     }

    # Temporary: Allow all users to access premium templates
    return {
        "allowed": True,
        "reason": "OK",
        "upgrade_required": False
    }


# TODO Phase 3: Add subscription management functions
# - create_subscription(user_id, tier, payment_method)
# - cancel_subscription(user_id)
# - upgrade_subscription(user_id, new_tier)
# - handle_payment_webhook(event)
# - check_subscription_expiry()
# - send_subscription_reminders()
