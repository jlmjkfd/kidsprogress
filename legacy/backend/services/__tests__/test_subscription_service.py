"""Tests for SubscriptionService.

Note: This service is currently a stub implementation for Phase 3.
All users are treated as premium with unlimited access.
Tests verify current behavior and will need updating when real subscription logic is implemented.
"""
import pytest
from bson import ObjectId
from backend.services.subscription_service import (
    get_user_subscription_tier,
    check_user_has_premium,
    check_can_add_template,
    check_can_access_premium_template,
    SUBSCRIPTION_TIERS,
)


@pytest.mark.asyncio
async def test_get_user_subscription_tier_returns_premium():
    """Test that all users currently get premium tier (Phase 3 TODO)."""
    user_id = ObjectId()
    tier = await get_user_subscription_tier(user_id)

    assert tier == "premium"


@pytest.mark.asyncio
async def test_check_user_has_premium_returns_true():
    """Test that all users currently have premium (Phase 3 TODO)."""
    user_id = ObjectId()
    has_premium = await check_user_has_premium(user_id)

    assert has_premium is True


@pytest.mark.asyncio
async def test_check_can_add_template_with_zero_templates():
    """Test checking template add permission with no existing templates."""
    user_id = ObjectId()

    result = await check_can_add_template(user_id, current_template_count=0)

    assert result["allowed"] is True
    assert result["reason"] == "OK"
    assert result["current_count"] == 0
    assert result["max_count"] is None  # Unlimited for premium
    assert result["upgrade_required"] is False


@pytest.mark.asyncio
async def test_check_can_add_template_with_many_templates():
    """Test that users can add unlimited templates (Phase 3 TODO)."""
    user_id = ObjectId()

    result = await check_can_add_template(user_id, current_template_count=100)

    assert result["allowed"] is True
    assert result["reason"] == "OK"
    assert result["current_count"] == 100
    assert result["max_count"] is None  # Unlimited
    assert result["upgrade_required"] is False


@pytest.mark.asyncio
async def test_check_can_access_free_template():
    """Test that all users can access free templates."""
    user_id = ObjectId()

    result = await check_can_access_premium_template(user_id, template_is_premium=False)

    assert result["allowed"] is True
    assert result["reason"] == "Template is free"
    assert result["upgrade_required"] is False


@pytest.mark.asyncio
async def test_check_can_access_premium_template():
    """Test that all users can access premium templates (Phase 3 TODO)."""
    user_id = ObjectId()

    result = await check_can_access_premium_template(user_id, template_is_premium=True)

    assert result["allowed"] is True
    assert result["reason"] == "OK"
    assert result["upgrade_required"] is False


def test_subscription_tiers_configuration():
    """Test that subscription tiers are properly configured."""
    assert "free" in SUBSCRIPTION_TIERS
    assert "premium" in SUBSCRIPTION_TIERS

    free_tier = SUBSCRIPTION_TIERS["free"]
    assert free_tier["max_templates"] == 5
    assert free_tier["can_access_premium"] is False
    assert free_tier["price"] == 0

    premium_tier = SUBSCRIPTION_TIERS["premium"]
    assert premium_tier["max_templates"] is None  # Unlimited
    assert premium_tier["can_access_premium"] is True
    assert premium_tier["price"] == 9.99


@pytest.mark.asyncio
async def test_check_can_add_template_returns_tier_config():
    """Test that response includes correct tier configuration."""
    user_id = ObjectId()

    result = await check_can_add_template(user_id, current_template_count=3)

    # Should return premium tier config (unlimited templates)
    assert result["max_count"] is None

    # Verify the tier we got matches the config
    tier = await get_user_subscription_tier(user_id)
    tier_config = SUBSCRIPTION_TIERS[tier]
    assert result["max_count"] == tier_config["max_templates"]


@pytest.mark.asyncio
async def test_multiple_users_all_get_premium():
    """Test that multiple different users all get premium tier."""
    user_ids = [ObjectId() for _ in range(5)]

    for user_id in user_ids:
        tier = await get_user_subscription_tier(user_id)
        assert tier == "premium"

        has_premium = await check_user_has_premium(user_id)
        assert has_premium is True
