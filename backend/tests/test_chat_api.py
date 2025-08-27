import pytest
from unittest.mock import Mock, patch
from bson import ObjectId

@pytest.mark.unit
def test_get_chat_history_success(client, mock_mongodb):
    """Test successful retrieval of chat history"""
    mock_messages = [
        {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "role": "user",
            "content": "Hello!",
            "timestamp": "2024-01-15T10:00:00Z",
            "type": "text"
        },
        {
            "_id": ObjectId("507f1f77bcf86cd799439012"),
            "role": "assistant",
            "content": "Hi there! How can I help?",
            "timestamp": "2024-01-15T10:01:00Z",
            "type": "text"
        }
    ]
    
    mock_mongodb.db.__getitem__.return_value.find.return_value.sort.return_value = mock_messages
    
    response = client.get("/api/chat/history")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["role"] == "user"
    assert data[1]["role"] == "assistant"

@pytest.mark.integration
@patch('workflows.supervisor.build_supervisor')
def test_send_text_message_integration(mock_supervisor, client, sample_chat_message):
    """Integration test for sending text message"""
    # Mock supervisor workflow
    mock_workflow = Mock()
    mock_workflow.invoke.return_value = {
        "AIContent": "I'd be happy to help you with your writing!",
        "userMsgId": "user123",
        "AIMsgId": "ai123"
    }
    mock_supervisor.return_value = mock_workflow
    
    response = client.post("/api/chat/message", json=sample_chat_message)
    
    assert response.status_code == 200
    data = response.json()
    assert "AIContent" in data
    assert data["AIContent"] == "I'd be happy to help you with your writing!"

@pytest.mark.integration
@patch('workflows.supervisor.build_supervisor')
def test_send_form_message_integration(mock_supervisor, client, sample_writing_data, mock_writing_response):
    """Integration test for sending form message"""
    mock_workflow = Mock()
    mock_workflow.invoke.return_value = {
        "AIContent": "",
        "workflowResult": mock_writing_response,
        "userMsgId": "user123",
        "AIMsgId": "ai123"
    }
    mock_supervisor.return_value = mock_workflow
    
    form_message = {
        "type": "form",
        "formType": "writing",
        "userContent": "",
        "payload": sample_writing_data
    }
    
    response = client.post("/api/chat/message", json=form_message)
    
    assert response.status_code == 200
    data = response.json()
    assert "workflowResult" in data
    assert data["workflowResult"]["overallScore"] == 8

@pytest.mark.unit
def test_send_message_validation_error(client):
    """Test message validation error"""
    invalid_message = {
        "type": "invalid_type",
        "userContent": "test"
    }
    
    response = client.post("/api/chat/message", json=invalid_message)
    
    assert response.status_code == 422  # Validation error

@pytest.mark.unit
@patch('workflows.supervisor.build_supervisor')
def test_supervisor_workflow_error_handling(mock_supervisor, client, sample_chat_message):
    """Test supervisor workflow error handling"""
    # Mock workflow that raises an exception
    mock_workflow = Mock()
    mock_workflow.invoke.side_effect = Exception("Workflow error")
    mock_supervisor.return_value = mock_workflow
    
    response = client.post("/api/chat/message", json=sample_chat_message)
    
    assert response.status_code == 500
    assert "Internal server error" in response.json()["detail"]