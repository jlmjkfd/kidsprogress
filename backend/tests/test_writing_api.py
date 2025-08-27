import pytest
from unittest.mock import Mock, patch
from bson import ObjectId
import json

@pytest.mark.unit
def test_get_writings_success(client, mock_mongodb):
    """Test successful retrieval of writings"""
    # Mock data
    mock_writings = [
        {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "title": "Test Story 1",
            "text": "This is test story 1",
            "date": "2024-01-15T10:00:00Z",
            "overall_score": 8
        },
        {
            "_id": ObjectId("507f1f77bcf86cd799439012"),
            "title": "Test Story 2", 
            "text": "This is test story 2",
            "date": "2024-01-16T10:00:00Z",
            "overall_score": 9
        }
    ]
    
    # Configure mock
    mock_mongodb.db.__getitem__.return_value.find.return_value = mock_writings
    
    response = client.get("/api/writing")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "Test Story 1"
    assert data[1]["title"] == "Test Story 2"

@pytest.mark.unit
def test_get_writing_by_id_success(client, mock_mongodb):
    """Test successful retrieval of writing by ID"""
    writing_id = "507f1f77bcf86cd799439011"
    mock_writing = {
        "_id": ObjectId(writing_id),
        "title": "Test Story",
        "text": "This is a test story",
        "date": "2024-01-15T10:00:00Z",
        "overall_score": 8,
        "genre": "Adventure",
        "feedback_student": "Great story!",
        "rubric_scores": []
    }
    
    mock_mongodb.db.__getitem__.return_value.find_one.return_value = mock_writing
    
    response = client.get(f"/api/writing/{writing_id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Story"
    assert data["overall_score"] == 8

@pytest.mark.unit
def test_get_writing_by_id_not_found(client, mock_mongodb):
    """Test writing not found by ID"""
    writing_id = "507f1f77bcf86cd799439011"
    mock_mongodb.db.__getitem__.return_value.find_one.return_value = None
    
    response = client.get(f"/api/writing/{writing_id}")
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Writing not found"

@pytest.mark.unit
def test_get_writing_by_invalid_id(client, mock_mongodb):
    """Test writing retrieval with invalid ID format"""
    invalid_id = "invalid_id"
    
    response = client.get(f"/api/writing/{invalid_id}")
    
    assert response.status_code == 400
    assert "Invalid writing ID format" in response.json()["detail"]

@pytest.mark.integration
@patch('workflows.supervisor.build_supervisor')
def test_create_writing_integration(mock_supervisor, client, mock_mongodb, sample_writing_data, mock_writing_response):
    """Integration test for writing creation"""
    # Mock supervisor workflow
    mock_workflow = Mock()
    mock_workflow.invoke.return_value = {
        "AIContent": "",
        "workflowResult": mock_writing_response,
        "userMsgId": "user123",
        "AIMsgId": "ai123"
    }
    mock_supervisor.return_value = mock_workflow
    
    # Mock database insertion
    mock_mongodb.db.__getitem__.return_value.insert_one.return_value.inserted_id = ObjectId("507f1f77bcf86cd799439011")
    
    response = client.post("/api/chat/message", json={
        "type": "form",
        "formType": "writing",
        "userContent": "",
        "payload": sample_writing_data
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "workflowResult" in data
    assert data["workflowResult"]["overallScore"] == 8

@pytest.mark.unit
def test_analytics_summary(client, mock_mongodb):
    """Test analytics summary endpoint"""
    # Mock aggregation pipeline results
    mock_analytics = [{
        "_id": None,
        "totalWritings": 5,
        "averageScore": 8.2,
        "totalTime": 240
    }]
    
    mock_mongodb.db.__getitem__.return_value.aggregate.return_value = mock_analytics
    
    response = client.get("/api/analytics/summary")
    
    assert response.status_code == 200
    data = response.json()
    assert data["totalWritings"] == 5
    assert data["averageScore"] == 8.2
    assert data["totalTime"] == 240