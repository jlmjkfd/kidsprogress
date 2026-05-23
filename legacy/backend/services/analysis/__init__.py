"""Analysis handlers for task completions."""
from backend.services.analysis.registry import (
    register_analyzer,
    get_analyzer,
    get_analyzer_class,
    list_analyzers
)
from backend.services.analysis.structured_analyzer import StructuredAnalyzer
from backend.services.analysis.writing_analyzer import WritingAnalyzer


# Register all analyzers
register_analyzer("structured", StructuredAnalyzer)
register_analyzer("writing", WritingAnalyzer)


__all__ = [
    "register_analyzer",
    "get_analyzer",
    "get_analyzer_class",
    "list_analyzers",
    "StructuredAnalyzer",
    "WritingAnalyzer",
]
