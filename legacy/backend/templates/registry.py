"""
Template Plugin Registry
Auto-discovers and registers all template handlers
"""
from typing import Dict, Type, Any
from backend.templates._shared.base_handler import TemplateHandler
from backend.templates.addition_subtraction import (
    AdditionSubtractionHandler,
    AdditionSubtractionConfig,
)
from backend.templates.writing import (
    WritingHandler,
    WritingConfig,
)


class PluginInfo:
    """Plugin metadata and handler information."""

    def __init__(
        self,
        plugin_id: str,
        handler_class: Type[TemplateHandler],
        config_class: Type[Any],
        handler_type: str,
    ):
        self.plugin_id = plugin_id
        self.handler_class = handler_class
        self.config_class = config_class
        self.handler_type = handler_type


class TemplateRegistry:
    """Central registry for all template plugins."""

    def __init__(self):
        self._plugins: Dict[str, PluginInfo] = {}
        self._handler_type_map: Dict[str, str] = {}
        self._register_builtin_plugins()

    def _register_builtin_plugins(self):
        """Register all built-in template plugins."""
        self.register(
            plugin_id="addition-subtraction",
            handler_class=AdditionSubtractionHandler,
            config_class=AdditionSubtractionConfig,
            handler_type="interactive_math_quiz",
        )
        self.register(
            plugin_id="writing",
            handler_class=WritingHandler,
            config_class=WritingConfig,
            handler_type="content_creation",
        )
        # Add more plugins here:
        # self.register(
        #     plugin_id="multiplication",
        #     handler_class=MultiplicationHandler,
        #     config_class=MultiplicationConfig,
        #     handler_type="interactive_math_quiz",
        # )

    def register(
        self,
        plugin_id: str,
        handler_class: Type[TemplateHandler],
        config_class: Type[Any],
        handler_type: str,
    ):
        """Register a template plugin."""
        plugin_info = PluginInfo(
            plugin_id=plugin_id,
            handler_class=handler_class,
            config_class=config_class,
            handler_type=handler_type,
        )
        self._plugins[plugin_id] = plugin_info
        self._handler_type_map[handler_type] = plugin_id

    def get_plugin(self, plugin_id: str) -> PluginInfo:
        """Get plugin info by ID."""
        if plugin_id not in self._plugins:
            raise ValueError(f"Plugin '{plugin_id}' not found in registry")
        return self._plugins[plugin_id]

    def get_plugin_by_handler_type(self, handler_type: str) -> PluginInfo:
        """Get plugin info by handler type."""
        plugin_id = self._handler_type_map.get(handler_type)
        if not plugin_id:
            raise ValueError(f"No plugin found for handler type '{handler_type}'")
        return self._plugins[plugin_id]

    def create_handler(self, plugin_id: str, config: Dict[str, Any]) -> TemplateHandler:
        """Create a handler instance for the given plugin."""
        plugin_info = self.get_plugin(plugin_id)
        return plugin_info.handler_class(config)

    def get_all_plugins(self) -> Dict[str, PluginInfo]:
        """Get all registered plugins."""
        return self._plugins.copy()

    def has_plugin(self, plugin_id: str) -> bool:
        """Check if a plugin is registered."""
        return plugin_id in self._plugins


# Global singleton registry
_registry = TemplateRegistry()


def get_registry() -> TemplateRegistry:
    """Get the global template registry."""
    return _registry


# Convenience functions
def get_plugin(plugin_id: str) -> PluginInfo:
    """Get plugin info by ID."""
    return _registry.get_plugin(plugin_id)


def create_handler(plugin_id: str, config: Dict[str, Any]) -> TemplateHandler:
    """Create a handler instance for the given plugin."""
    return _registry.create_handler(plugin_id, config)


def get_all_plugins() -> Dict[str, PluginInfo]:
    """Get all registered plugins."""
    return _registry.get_all_plugins()
