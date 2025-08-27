import pytest
from unittest.mock import Mock, patch
from workflows.supervisor import supervisor_router, writing_workflow, general_workflow, analysis_workflow
from workflows.states import SupervisorState
from db.constants import ChatHistoryType, ChatHistoryFormType

@pytest.mark.unit
def test_supervisor_router_form_writing():
    """Test supervisor router for writing form submission"""
    state = SupervisorState(
        type=ChatHistoryType.FORM,
        formType=ChatHistoryFormType.WRITING,
        userContent="",
        payload={"title": "Test", "text": "Test story"}
    )
    
    result = supervisor_router(state)
    assert result == "writing_workflow"

@pytest.mark.unit
def test_supervisor_router_form_math():
    """Test supervisor router for math form submission"""
    state = SupervisorState(
        type=ChatHistoryType.FORM,
        formType=ChatHistoryFormType.MATH,
        userContent="",
        payload={"problem": "2+2"}
    )
    
    result = supervisor_router(state)
    assert result == "math_workflow"

@pytest.mark.unit
@patch('workflows.supervisor.llm')
def test_supervisor_router_text_system_related(mock_llm):
    """Test supervisor router for system-related text"""
    mock_llm.invoke.return_value = Mock(content="system_related")
    
    state = SupervisorState(
        type=ChatHistoryType.TEXT,
        userContent="How can I improve my writing skills?"
    )
    
    result = supervisor_router(state)
    assert result == "analysis_workflow"

@pytest.mark.unit
@patch('workflows.supervisor.llm')
def test_supervisor_router_text_general(mock_llm):
    """Test supervisor router for general conversation"""
    mock_llm.invoke.return_value = Mock(content="general")
    
    state = SupervisorState(
        type=ChatHistoryType.TEXT,
        userContent="Hello, how are you?"
    )
    
    result = supervisor_router(state)
    assert result == "general_workflow"

@pytest.mark.unit
@patch('workflows.workflow_writing.build_writing_workflow')
def test_writing_workflow_execution(mock_build_workflow):
    """Test writing workflow execution"""
    # Mock the writing workflow
    mock_workflow = Mock()
    mock_workflow.invoke.return_value = {
        "overall_score": 8,
        "writingId": "test_id",
        "feedback_student": "Great story!"
    }
    mock_build_workflow.return_value = mock_workflow
    
    state = SupervisorState(
        type=ChatHistoryType.FORM,
        formType=ChatHistoryFormType.WRITING,
        userContent="",
        payload={"title": "Test Story", "text": "This is a test story."}
    )
    
    result = writing_workflow(state)
    
    assert result["AIContent"] == ""
    assert result["workflowResult"]["overallScore"] == 8
    assert result["workflowResult"]["writingId"] == "test_id"
    assert result["workflowResult"]["feedback"] == "Great story!"

@pytest.mark.unit
@patch('workflows.workflow_general.build_general_workflow')
def test_general_workflow_execution(mock_build_workflow):
    """Test general workflow execution"""
    mock_workflow = Mock()
    mock_workflow.invoke.return_value = {
        "AIContent": "Hello! I'm here to help you with your learning journey."
    }
    mock_build_workflow.return_value = mock_workflow
    
    state = SupervisorState(
        type=ChatHistoryType.TEXT,
        userContent="Hello!"
    )
    
    result = general_workflow(state)
    
    assert result["AIContent"] == "Hello! I'm here to help you with your learning journey."

@pytest.mark.unit
@patch('workflows.workflow_analysis.build_analysis_workflow')
def test_analysis_workflow_execution(mock_build_workflow):
    """Test analysis workflow execution"""
    mock_workflow = Mock()
    mock_workflow.invoke.return_value = {
        "AIContent": "Here's some analysis about improving your writing...",
        "analysis_type": "writing_improvement",
        "tools_used": ["writing_analyzer"],
        "analysis_result": {"suggestions": ["Use more descriptive words"]}
    }
    mock_build_workflow.return_value = mock_workflow
    
    state = SupervisorState(
        type=ChatHistoryType.TEXT,
        userContent="How can I improve my writing?"
    )
    
    result = analysis_workflow(state)
    
    assert result["AIContent"] == "Here's some analysis about improving your writing..."
    assert result["workflowResult"]["analysis_type"] == "writing_improvement"
    assert result["workflowResult"]["tools_used"] == ["writing_analyzer"]

@pytest.mark.unit
@patch('workflows.supervisor.mongodb')
def test_save_message_to_db(mock_mongodb):
    """Test saving messages to database"""
    from workflows.supervisor import save_message_to_db
    from bson import ObjectId
    
    mock_user_id = ObjectId("507f1f77bcf86cd799439011")
    mock_ai_id = ObjectId("507f1f77bcf86cd799439012")
    
    mock_mongodb.__getitem__.return_value.insert_one.side_effect = [
        Mock(inserted_id=mock_user_id),
        Mock(inserted_id=mock_ai_id)
    ]
    
    state = SupervisorState(
        type=ChatHistoryType.TEXT,
        userContent="Test message",
        AIContent="Test response",
        workflowResult={}
    )
    
    result = save_message_to_db(state)
    
    assert result["userMsgId"] == str(mock_user_id)
    assert result["AIMsgId"] == str(mock_ai_id)
    assert mock_mongodb.__getitem__.return_value.insert_one.call_count == 2