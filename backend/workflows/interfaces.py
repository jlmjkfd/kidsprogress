from abc import ABC, abstractmethod
from typing import Dict, Any, TypeVar, Generic

# Type variable for workflow states - accepts any dict-like type
StateType = TypeVar('StateType')

class BaseWorkflowNode(ABC, Generic[StateType]):
    """Base class for all workflow nodes with generic state type"""
    
    def __init__(self, **kwargs):
        """Initialize node with any required dependencies"""
        pass
    
    @abstractmethod
    def execute(self, state: StateType) -> Dict[str, Any]:
        """Execute the node logic with strongly typed state"""
        pass

class BaseWorkflowTool(ABC):
    """Base class for workflow tools that can be used across different workflows"""
    
    @abstractmethod
    def get_name(self) -> str:
        """Get the tool name"""
        pass
    
    @abstractmethod
    def execute(self, **kwargs) -> Any:
        """Execute the tool with keyword arguments"""
        pass