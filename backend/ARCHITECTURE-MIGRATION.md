# Architecture Migration Guide

## Problem with Current Architecture

The current `base_nodes.py` and `base_tools.py` approach has several issues:

1. **Type Coupling**: `Union[Dict[str, Any], WritingWorkflowState, MathWorkflowState, ...]` becomes unmaintainable
2. **Single Responsibility Violation**: One file handling all workflow types
3. **Import Dependencies**: Circular imports when workflows reference each other
4. **Testing Complexity**: Hard to test workflow-specific logic in isolation
5. **Extensibility Issues**: Adding new workflows requires modifying base files

## New Modular Architecture

### 1. Interface-Based Design (`workflows/interfaces.py`)

```python
from abc import ABC, abstractmethod
from typing import TypeVar, Generic, TypedDict

# Type variable for workflow states - bound to TypedDict for dict-like behavior
StateType = TypeVar('StateType', bound=TypedDict)

class BaseWorkflowNode(ABC, Generic[StateType]):
    """Generic base class for workflow nodes"""
    @abstractmethod
    def execute(self, state: StateType) -> Dict[str, Any]: ...
```

### 2. Workflow-Specific Modules

#### Writing Workflow (`workflows/writing/`)
- `base_nodes.py` - Writing-specific node base classes
- `tools.py` - Writing-specific tools and utilities
- `__init__.py` - Package initialization

#### Math Workflow (`workflows/math/`)
- `base_nodes.py` - Math-specific node base classes  
- `tools.py` - Math-specific tools and utilities
- `__init__.py` - Package initialization

### 3. Factory Pattern (`workflows/factory.py`)

```python
class WorkflowFactory:
    """Centralized factory for creating workflow components"""
    
    @classmethod
    def create_node(cls, workflow_type: str, node_name: str, **kwargs):
        """Create workflow-specific node instances"""
        
    @classmethod  
    def create_tool(cls, workflow_type: str, tool_name: str, **kwargs):
        """Create workflow-specific tool instances"""
```

## Migration Steps

### Step 1: Update Import Statements

**Before:**
```python
from workflows.base_nodes import MetadataExtractionNode
from workflows.base_tools import JSONParser
```

**After:**
```python
from workflows.writing.base_nodes import MetadataExtractionNode
from workflows.writing.tools import WritingJSONParser
# OR using factory
from workflows.factory import WorkflowFactory
node = WorkflowFactory.create_node("writing", "metadata_extraction")
```

### Step 2: Update Node Implementations

**Before:**
```python
class MyNode(BaseWorkflowNode):
    def execute(self, state: Union[Dict[str, Any], WritingWorkflowState]) -> Dict[str, Any]:
        # Complex type handling
        if isinstance(state, WritingWorkflowState):
            # ...
```

**After:**
```python
class MyNode(WritingWorkflowNode):  # Strongly typed
    def execute(self, state: WritingWorkflowState) -> Dict[str, Any]:
        # Clean, type-safe implementation
        # No type checking needed
```

### Step 3: Update Workflow Builders

**Before:**
```python
from workflows.base_nodes import MetadataExtractionNode, EvaluationNode
```

**After:**
```python
from workflows.factory import WorkflowFactory

def build_writing_workflow():
    metadata_node = WorkflowFactory.create_node("writing", "metadata_extraction")
    evaluation_node = WorkflowFactory.create_node("writing", "evaluation")
    # OR direct import for better IDE support
    from workflows.writing.base_nodes import MetadataExtractionNode
    metadata_node = MetadataExtractionNode()
```

### Step 4: Create New Workflow Types

```python
# workflows/reading/base_nodes.py
class ReadingWorkflowNode(BaseWorkflowNode[ReadingWorkflowState]):
    """Base class for reading workflow nodes"""
    pass

class ReadingComprehensionNode(ReadingWorkflowNode):
    def execute(self, state: ReadingWorkflowState) -> Dict[str, Any]:
        # Reading-specific logic
        pass

# Register with factory
WorkflowFactory.register_node("reading", "comprehension", ReadingComprehensionNode)
```

## Benefits of New Architecture

### 1. **Type Safety**
- No more complex Union types
- Strong typing for each workflow with `TypeVar` bound to `TypedDict`
- Better IDE support and autocompletion

### 2. **Separation of Concerns**
- Each workflow manages its own components
- Clear boundaries between different domains
- Easier to maintain and extend

### 3. **Testability**
- Workflow-specific test suites
- Mock dependencies at workflow level
- Isolated unit testing

### 4. **Extensibility**
- Add new workflows without touching existing code
- Plugin-style architecture
- Dynamic component registration

### 5. **Code Organization**
```
workflows/
├── interfaces.py           # Core interfaces and protocols
├── factory.py             # Component factory and registry
├── writing/               # Writing workflow module
│   ├── __init__.py
│   ├── base_nodes.py      # Writing-specific nodes
│   └── tools.py           # Writing-specific tools
├── math/                  # Math workflow module
│   ├── __init__.py
│   ├── base_nodes.py      # Math-specific nodes
│   └── tools.py           # Math-specific tools
└── reading/               # Future reading workflow
    ├── __init__.py
    ├── base_nodes.py
    └── tools.py
```

## Implementation Timeline

### Phase 1: Create New Structure
- ✅ Create `interfaces.py` with base protocols
- ✅ Create `workflows/writing/` module
- ✅ Create `workflows/math/` module skeleton
- ✅ Create factory pattern

### Phase 2: Migrate Existing Code
- Update writing workflow to use new base classes
- Update imports in workflow builders
- Update tests to use new structure

### Phase 3: Deprecate Old Files
- Mark `base_nodes.py` and `base_tools.py` as deprecated
- Provide migration warnings
- Remove old files after full migration

### Phase 4: Extend with New Workflows
- Implement reading workflow
- Implement science workflow
- Add more subject areas as needed

## Error Prevention

### Type Checking
```python
# Before: Runtime type errors possible
def execute(self, state: Union[WritingWorkflowState, MathWorkflowState]):
    if state.get('math_problem'):  # Error if writing state!
        # ...

# After: Compile-time type safety
def execute(self, state: WritingWorkflowState):
    title = state.get('title')  # Always valid for writing workflow
```

### Dependency Injection
```python
# Testable, mockable dependencies
class WritingEvaluationNode(WritingWorkflowNode):
    def __init__(self, llm=None, database=None):
        self.llm = llm or LLMProvider.get_llm()
        self.database = database or WritingDatabaseManager()
```

This architecture provides a solid foundation for scaling to many different educational workflows while maintaining code quality and developer experience.