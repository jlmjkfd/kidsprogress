from typing import Type, Dict, Any
from workflows.interfaces import BaseWorkflowNode, BaseWorkflowTool
from workflows.states import WritingWorkflowState


class WorkflowFactory:
    """Factory for creating workflow-specific components"""
    
    _node_registry: Dict[str, Dict[str, Type[BaseWorkflowNode]]] = {}
    _tool_registry: Dict[str, Dict[str, Type[BaseWorkflowTool]]] = {}
    
    @classmethod
    def register_node(cls, workflow_type: str, node_name: str, node_class: Type[BaseWorkflowNode]):
        """Register a node class for a specific workflow type"""
        if workflow_type not in cls._node_registry:
            cls._node_registry[workflow_type] = {}
        cls._node_registry[workflow_type][node_name] = node_class
    
    @classmethod
    def register_tool(cls, workflow_type: str, tool_name: str, tool_class: Type[BaseWorkflowTool]):
        """Register a tool class for a specific workflow type"""
        if workflow_type not in cls._tool_registry:
            cls._tool_registry[workflow_type] = {}
        cls._tool_registry[workflow_type][tool_name] = tool_class
    
    @classmethod
    def create_node(cls, workflow_type: str, node_name: str, **kwargs) -> BaseWorkflowNode:
        """Create a node instance for a specific workflow"""
        if workflow_type not in cls._node_registry:
            raise ValueError(f"Unknown workflow type: {workflow_type}")
        
        if node_name not in cls._node_registry[workflow_type]:
            raise ValueError(f"Unknown node '{node_name}' for workflow '{workflow_type}'")
        
        node_class = cls._node_registry[workflow_type][node_name]
        return node_class(**kwargs)
    
    @classmethod
    def create_tool(cls, workflow_type: str, tool_name: str, **kwargs) -> BaseWorkflowTool:
        """Create a tool instance for a specific workflow"""
        if workflow_type not in cls._tool_registry:
            raise ValueError(f"Unknown workflow type: {workflow_type}")
        
        if tool_name not in cls._tool_registry[workflow_type]:
            raise ValueError(f"Unknown tool '{tool_name}' for workflow '{workflow_type}'")
        
        tool_class = cls._tool_registry[workflow_type][tool_name]
        return tool_class(**kwargs)
    
    @classmethod
    def get_available_nodes(cls, workflow_type: str) -> list[str]:
        """Get list of available nodes for a workflow type"""
        return list(cls._node_registry.get(workflow_type, {}).keys())
    
    @classmethod
    def get_available_tools(cls, workflow_type: str) -> list[str]:
        """Get list of available tools for a workflow type"""
        return list(cls._tool_registry.get(workflow_type, {}).keys())


# Auto-register writing workflow components
def register_writing_components():
    """Register all writing workflow components"""
    from workflows.writing.base_nodes import (
        MetadataExtractionNode, 
        EvaluationNode, 
        DatabaseSaveNode, 
        ResponsePreparationNode
    )
    from workflows.writing.tools import (
        WritingJSONParser, 
        WritingDatabaseManager, 
        WritingAnalysisTools
    )
    
    # Register nodes
    WorkflowFactory.register_node("writing", "metadata_extraction", MetadataExtractionNode)
    WorkflowFactory.register_node("writing", "evaluation", EvaluationNode)
    WorkflowFactory.register_node("writing", "database_save", DatabaseSaveNode)
    WorkflowFactory.register_node("writing", "response_preparation", ResponsePreparationNode)
    
    # Register tools
    WorkflowFactory.register_tool("writing", "json_parser", WritingJSONParser)
    WorkflowFactory.register_tool("writing", "database_manager", WritingDatabaseManager)
    WorkflowFactory.register_tool("writing", "analysis_tools", WritingAnalysisTools)


def register_math_components():
    """Register all math workflow components"""
    from workflows.math.base_nodes import ProblemSolverNode, MathEvaluationNode
    from workflows.math.tools import MathDatabaseManager, MathAnalysisTools
    
    # Register nodes
    WorkflowFactory.register_node("math", "problem_solver", ProblemSolverNode)
    WorkflowFactory.register_node("math", "evaluation", MathEvaluationNode)
    
    # Register tools
    WorkflowFactory.register_tool("math", "database_manager", MathDatabaseManager)
    WorkflowFactory.register_tool("math", "analysis_tools", MathAnalysisTools)


# Initialize registrations
register_writing_components()
register_math_components()