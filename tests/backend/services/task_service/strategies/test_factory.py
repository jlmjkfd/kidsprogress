"""Tests for TaskStrategyFactory."""

import pytest
from backend.models.task_identifier import TaskIdentifier
from backend.services.task_service.strategies.factory import TaskStrategyFactory
from backend.services.task_service.strategies.real_task_strategy import RealTaskStrategy
from backend.services.task_service.strategies.virtual_task_strategy import VirtualTaskStrategy


class TestTaskStrategyFactory:
    """Test TaskStrategyFactory."""

    @pytest.fixture
    def factory(self):
        """Create factory instance for testing."""
        mock_db = None
        mock_collections = {
            "tasks": None,
            "sessions": None,
            "completions": None,
        }
        return TaskStrategyFactory(mock_db, mock_collections)

    def test_factory_returns_real_strategy_for_real_task(self, factory):
        """Factory should return RealTaskStrategy for real task IDs."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011")
        strategy = factory.get_strategy(identifier)
        assert isinstance(strategy, RealTaskStrategy)

    def test_factory_returns_virtual_strategy_for_virtual_task(self, factory):
        """Factory should return VirtualTaskStrategy for virtual task IDs."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2025-12-10")
        strategy = factory.get_strategy(identifier)
        assert isinstance(strategy, VirtualTaskStrategy)

    def test_factory_caches_strategies(self, factory):
        """Factory should cache and reuse strategy instances."""
        identifier1 = TaskIdentifier(raw_id="507f1f77bcf86cd799439011")
        identifier2 = TaskIdentifier(raw_id="507f1f77bcf86cd799439012")

        strategy1 = factory.get_strategy(identifier1)
        strategy2 = factory.get_strategy(identifier2)

        # Should be the same instance (cached)
        assert strategy1 is strategy2

    def test_factory_caches_different_strategy_types(self, factory):
        """Factory should cache real and virtual strategies separately."""
        real_id = TaskIdentifier(raw_id="507f1f77bcf86cd799439011")
        virtual_id = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2025-12-10")

        real_strategy = factory.get_strategy(real_id)
        virtual_strategy = factory.get_strategy(virtual_id)

        # Should be different strategy types
        assert real_strategy is not virtual_strategy
        assert isinstance(real_strategy, RealTaskStrategy)
        assert isinstance(virtual_strategy, VirtualTaskStrategy)
