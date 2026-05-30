# Content Provider Integration Guide

## Overview

This guide explains how to integrate third-party content providers (schools, educational platforms, question banks) with the task template system.

## What is a Content Provider?

A content provider is an external system that supplies:
- Questions for quizzes/tests
- Assignments and tasks
- Grading criteria
- Learning resources
- Progress reports

**Examples:**
- School management systems (assignments from teacher)
- Educational platforms (Khan Academy, IXL)
- Custom question banks
- LLM-based generators

## Architecture

### Provider Flow

```
Parent activates provider integration
  ↓
Provider authentication (OAuth/API key)
  ↓
KidsProgress fetches content via provider API
  ↓
Content stored/cached in our system
  ↓
Child completes task using our execution handlers
  ↓
(Optional) Results synced back to provider
```

### Key Principles

1. **Provider stays external** - No direct database access
2. **We initiate requests** - Pull content from their API
3. **Optional sync-back** - Results can be sent back with permission
4. **Isolated authentication** - Each provider has separate auth

## Implementation Steps

### Step 1: Define Provider Schema

**Location:** `backend/models/content_provider.py`

```python
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from enum import Enum

class AuthType(str, Enum):
    """Supported authentication methods"""
    API_KEY = "api_key"
    OAUTH2 = "oauth2"
    BASIC_AUTH = "basic_auth"
    CUSTOM = "custom"

class ProviderStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"

class ContentProvider(BaseModel):
    """Content provider definition"""
    provider_id: str = Field(..., description="Unique provider identifier")
    name: str = Field(..., description="Display name")
    description: Optional[str] = None
    provider_type: str = Field(..., description="school|platform|question_bank|llm")

    # Authentication
    auth_type: AuthType
    auth_schema: Dict[str, Any] = Field(
        ..., description="Schema for authentication credentials"
    )

    # API Configuration
    base_url: str = Field(..., description="Provider API base URL")
    api_version: Optional[str] = None
    api_config: Dict[str, Any] = Field(
        default_factory=dict,
        description="Provider-specific API configuration"
    )

    # Capabilities
    supports_content_fetch: bool = Field(default=True)
    supports_result_sync: bool = Field(default=False)
    content_types: List[str] = Field(
        default_factory=list,
        description="Types of content provided (questions, assignments, resources)"
    )

    # Status
    status: ProviderStatus = Field(default=ProviderStatus.INACTIVE)
    last_sync: Optional[datetime] = None
    error_message: Optional[str] = None

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ProviderCredential(BaseModel):
    """User-specific provider credentials"""
    credential_id: str
    provider_id: str
    user_id: str  # Parent who set up integration
    child_id: Optional[str] = None  # If child-specific

    # Encrypted credentials
    credentials: Dict[str, Any] = Field(
        ..., description="Encrypted auth credentials (API key, tokens, etc.)"
    )

    # OAuth-specific fields
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None

    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

### Step 2: Implement Base Provider Class

**Location:** `backend/services/providers/base_provider.py`

```python
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from backend.models.content_provider import ContentProvider, ProviderCredential

class ContentProviderBase(ABC):
    """Base class for all content providers"""

    def __init__(self, provider: ContentProvider, credential: ProviderCredential):
        self.provider = provider
        self.credential = credential
        self.base_url = provider.base_url

    @abstractmethod
    async def authenticate(self) -> bool:
        """Verify authentication credentials

        Returns:
            True if authentication successful
        """
        pass

    @abstractmethod
    async def fetch_content(
        self,
        content_type: str,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Fetch content from provider

        Args:
            content_type: Type of content (questions, assignments, etc.)
            filters: Optional filters (subject, grade_level, difficulty, etc.)

        Returns:
            List of content items in standardized format
        """
        pass

    @abstractmethod
    async def sync_result(
        self,
        content_id: str,
        result_data: Dict[str, Any]
    ) -> bool:
        """Sync completion result back to provider

        Args:
            content_id: Provider's content identifier
            result_data: Completion data to sync

        Returns:
            True if sync successful
        """
        pass

    async def test_connection(self) -> Dict[str, Any]:
        """Test provider connection and return status"""
        try:
            is_authenticated = await self.authenticate()
            if not is_authenticated:
                return {
                    "status": "error",
                    "message": "Authentication failed"
                }

            # Try to fetch sample content
            sample = await self.fetch_content("test", {"limit": 1})

            return {
                "status": "success",
                "message": f"Connected to {self.provider.name}",
                "sample_data": sample[:1] if sample else None
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }

    def _standardize_question(self, raw_question: Dict[str, Any]) -> Dict[str, Any]:
        """Convert provider-specific question format to our standard format

        Override this method in subclasses to handle provider-specific schemas
        """
        return {
            "question_id": raw_question.get("id"),
            "question_text": raw_question.get("text"),
            "question_type": raw_question.get("type", "multiple_choice"),
            "correct_answer": raw_question.get("answer"),
            "options": raw_question.get("choices", []),
            "points": raw_question.get("points", 1),
            "difficulty": raw_question.get("difficulty"),
            "subject": raw_question.get("subject"),
            "metadata": raw_question.get("metadata", {}),
            "provider_id": self.provider.provider_id,
            "provider_content_id": raw_question.get("id"),
        }
```

### Step 3: Implement Specific Provider

**Example: School API Provider**

```python
# backend/services/providers/school_api_provider.py
import httpx
from typing import Dict, Any, List, Optional
from backend.services.providers.base_provider import ContentProviderBase

class SchoolAPIProvider(ContentProviderBase):
    """Integration with school management system API"""

    async def authenticate(self) -> bool:
        """Authenticate using API key"""
        api_key = self.credential.credentials.get("api_key")
        if not api_key:
            return False

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/auth/verify",
                headers={"X-API-Key": api_key}
            )
            return response.status_code == 200

    async def fetch_content(
        self,
        content_type: str,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Fetch assignments or questions from school API"""
        api_key = self.credential.credentials.get("api_key")
        child_id = self.credential.child_id

        # Build request parameters
        params = filters or {}
        if child_id:
            params["student_id"] = child_id

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/content/{content_type}",
                headers={"X-API-Key": api_key},
                params=params
            )
            response.raise_for_status()
            raw_items = response.json()

        # Standardize format
        standardized = []
        for item in raw_items:
            if content_type == "questions":
                standardized.append(self._standardize_question(item))
            elif content_type == "assignments":
                standardized.append(self._standardize_assignment(item))

        return standardized

    async def sync_result(
        self,
        content_id: str,
        result_data: Dict[str, Any]
    ) -> bool:
        """Send completion result back to school"""
        if not self.provider.supports_result_sync:
            return False

        api_key = self.credential.credentials.get("api_key")

        # Transform our result format to school's expected format
        payload = self._transform_result_for_school(result_data)

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/results/{content_id}",
                headers={"X-API-Key": api_key},
                json=payload
            )
            return response.status_code == 200

    def _standardize_assignment(self, raw_assignment: Dict[str, Any]) -> Dict[str, Any]:
        """Convert school assignment to our format"""
        return {
            "assignment_id": raw_assignment["id"],
            "title": raw_assignment["title"],
            "description": raw_assignment["description"],
            "subject": raw_assignment["subject"],
            "due_date": raw_assignment.get("due_date"),
            "questions": [
                self._standardize_question(q)
                for q in raw_assignment.get("questions", [])
            ],
            "provider_id": self.provider.provider_id,
            "provider_content_id": raw_assignment["id"],
        }

    def _transform_result_for_school(self, result_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform our result format to school's expected schema"""
        return {
            "student_id": result_data["child_id"],
            "assignment_id": result_data["provider_content_id"],
            "score": result_data.get("metrics", {}).get("score"),
            "completion_date": result_data["completed_at"],
            "answers": result_data.get("detailed_data", {}).get("answers", []),
        }
```

**Example: LLM Question Generator Provider**

```python
# backend/services/providers/llm_provider.py
from typing import Dict, Any, List, Optional
from backend.services.providers.base_provider import ContentProviderBase
from backend.services.llm.client import get_llm_client

class LLMQuestionProvider(ContentProviderBase):
    """Generate questions on-the-fly using LLM"""

    async def authenticate(self) -> bool:
        """Verify LLM API key"""
        llm_client = get_llm_client()
        return await llm_client.verify_credentials()

    async def fetch_content(
        self,
        content_type: str,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Generate questions using LLM"""
        if content_type != "questions":
            return []

        # Extract generation parameters
        subject = filters.get("subject", "math")
        difficulty = filters.get("difficulty", "medium")
        num_questions = filters.get("num_questions", 10)
        grade_level = filters.get("grade_level")

        # Build prompt
        prompt = self._build_generation_prompt(
            subject=subject,
            difficulty=difficulty,
            grade_level=grade_level,
            num_questions=num_questions
        )

        # Call LLM
        llm_client = get_llm_client()
        response = await llm_client.generate(
            prompt=prompt,
            model=self.provider.api_config.get("model", "gpt-4"),
            temperature=0.7,
            response_format="json"
        )

        # Parse and standardize
        raw_questions = response.get("questions", [])
        return [self._standardize_question(q) for q in raw_questions]

    async def sync_result(self, content_id: str, result_data: Dict[str, Any]) -> bool:
        """LLM provider doesn't support result sync"""
        return False

    def _build_generation_prompt(
        self,
        subject: str,
        difficulty: str,
        grade_level: Optional[str],
        num_questions: int
    ) -> str:
        """Build LLM prompt for question generation"""
        grade_info = f" for grade {grade_level}" if grade_level else ""

        return f"""Generate {num_questions} {difficulty} {subject} questions{grade_info}.

Output JSON format:
{{
  "questions": [
    {{
      "id": "q1",
      "text": "Question text here?",
      "type": "multiple_choice",
      "answer": "correct answer",
      "choices": ["option 1", "option 2", "option 3", "option 4"],
      "difficulty": "{difficulty}",
      "subject": "{subject}",
      "explanation": "Why this is the correct answer"
    }}
  ]
}}

Requirements:
- Questions must be age-appropriate{grade_info}
- Difficulty: {difficulty}
- Include clear explanations
- Vary question types when possible
"""
```

### Step 4: Provider Registry

**Location:** `backend/services/providers/registry.py`

```python
from typing import Dict, Type
from backend.services.providers.base_provider import ContentProviderBase
from backend.services.providers.school_api_provider import SchoolAPIProvider
from backend.services.providers.llm_provider import LLMQuestionProvider

PROVIDER_REGISTRY: Dict[str, Type[ContentProviderBase]] = {
    "school_api": SchoolAPIProvider,
    "llm_generator": LLMQuestionProvider,
    # Add new providers here
}

def get_provider_class(provider_type: str) -> Type[ContentProviderBase]:
    """Get provider class by type"""
    if provider_type not in PROVIDER_REGISTRY:
        raise ValueError(f"Unknown provider type: {provider_type}")
    return PROVIDER_REGISTRY[provider_type]

async def initialize_provider(
    provider: ContentProvider,
    credential: ProviderCredential
) -> ContentProviderBase:
    """Factory function to initialize provider instance"""
    provider_class = get_provider_class(provider.provider_type)
    instance = provider_class(provider, credential)

    # Verify authentication on initialization
    is_authenticated = await instance.authenticate()
    if not is_authenticated:
        raise ValueError(f"Failed to authenticate with {provider.name}")

    return instance
```

### Step 5: API Endpoints

**Location:** `backend/routes/providers.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from backend.services.providers.registry import initialize_provider, get_provider_class
from backend.models.content_provider import ContentProvider, ProviderCredential

router = APIRouter(prefix="/api/providers", tags=["providers"])

@router.get("/available")
async def get_available_providers() -> List[Dict[str, Any]]:
    """List all available provider types"""
    # Return provider catalog
    return [
        {
            "provider_type": "school_api",
            "name": "School Management System",
            "description": "Integrate with your school's assignment system",
            "auth_type": "api_key",
            "capabilities": ["questions", "assignments"],
        },
        {
            "provider_type": "llm_generator",
            "name": "AI Question Generator",
            "description": "Generate custom questions using AI",
            "auth_type": "api_key",
            "capabilities": ["questions"],
        },
    ]

@router.post("/configure")
async def configure_provider(
    provider_type: str,
    config: Dict[str, Any],
    credentials: Dict[str, Any],
    user_id: str,
    child_id: Optional[str] = None
):
    """Configure a new provider integration"""
    # Create provider record
    provider = ContentProvider(
        provider_id=f"{user_id}_{provider_type}",
        provider_type=provider_type,
        **config
    )

    # Create credential record (encrypt credentials)
    credential = ProviderCredential(
        credential_id=f"{user_id}_{provider_type}_cred",
        provider_id=provider.provider_id,
        user_id=user_id,
        child_id=child_id,
        credentials=encrypt_credentials(credentials),  # Use encryption service
    )

    # Test connection
    try:
        provider_instance = await initialize_provider(provider, credential)
        test_result = await provider_instance.test_connection()

        if test_result["status"] != "success":
            raise HTTPException(400, f"Connection test failed: {test_result['message']}")

    except Exception as e:
        raise HTTPException(400, f"Provider setup failed: {str(e)}")

    # Save to database
    await save_provider(provider)
    await save_credential(credential)

    return {
        "provider_id": provider.provider_id,
        "status": "configured",
        "test_result": test_result,
    }

@router.get("/{provider_id}/content")
async def fetch_provider_content(
    provider_id: str,
    content_type: str,
    subject: Optional[str] = None,
    difficulty: Optional[str] = None,
    limit: int = 10
):
    """Fetch content from provider"""
    # Get provider and credential
    provider = await get_provider(provider_id)
    credential = await get_credential(provider_id)

    # Initialize provider
    provider_instance = await initialize_provider(provider, credential)

    # Fetch content
    filters = {"limit": limit}
    if subject:
        filters["subject"] = subject
    if difficulty:
        filters["difficulty"] = difficulty

    content = await provider_instance.fetch_content(content_type, filters)

    return {
        "provider_id": provider_id,
        "content_type": content_type,
        "items": content,
        "count": len(content),
    }

@router.post("/{provider_id}/sync-result")
async def sync_result_to_provider(
    provider_id: str,
    content_id: str,
    result_data: Dict[str, Any]
):
    """Sync completion result back to provider"""
    provider = await get_provider(provider_id)

    if not provider.supports_result_sync:
        raise HTTPException(400, "Provider does not support result sync")

    credential = await get_credential(provider_id)
    provider_instance = await initialize_provider(provider, credential)

    success = await provider_instance.sync_result(content_id, result_data)

    if not success:
        raise HTTPException(500, "Result sync failed")

    return {"status": "synced"}
```

### Step 6: Frontend Integration

**Provider Configuration UI:**

```typescript
// frontend/src/pages/parent-portal/providers/configure.tsx
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

export default function ConfigureProviderPage() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const configureMutation = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/providers/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      alert("Provider configured successfully!");
    },
  });

  const handleConfigure = () => {
    configureMutation.mutate({
      provider_type: selectedProvider,
      config: {
        name: "My School",
        base_url: credentials.base_url,
        auth_type: "api_key",
      },
      credentials: {
        api_key: credentials.api_key,
      },
      user_id: currentUserId,
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Configure Content Provider</h1>

      {/* Provider selection */}
      <div className="space-y-4">
        <label className="block">
          <span className="font-medium">Provider Type:</span>
          <select
            value={selectedProvider || ""}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border rounded-lg"
          >
            <option value="">Select provider...</option>
            <option value="school_api">School Management System</option>
            <option value="llm_generator">AI Question Generator</option>
          </select>
        </label>

        {selectedProvider === "school_api" && (
          <>
            <label className="block">
              <span className="font-medium">School API URL:</span>
              <input
                type="text"
                value={credentials.base_url || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, base_url: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border rounded-lg"
                placeholder="https://school.example.com/api"
              />
            </label>

            <label className="block">
              <span className="font-medium">API Key:</span>
              <input
                type="password"
                value={credentials.api_key || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, api_key: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border rounded-lg"
              />
            </label>
          </>
        )}

        <button
          onClick={handleConfigure}
          disabled={!selectedProvider || configureMutation.isPending}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {configureMutation.isPending ? "Testing connection..." : "Configure Provider"}
        </button>
      </div>
    </div>
  );
}
```

**Using Provider Content in Template:**

```typescript
// When creating a template, fetch questions from provider
const { data: questions } = useQuery({
  queryKey: ["provider-content", providerId, "questions"],
  queryFn: () =>
    fetch(
      `/api/providers/${providerId}/content?content_type=questions&subject=math&limit=20`
    ).then((r) => r.json()),
});

// Use fetched questions in template config
const templateConfig = {
  execution_handler: "interactive_quiz",
  execution_config: {
    questions: questions?.items || [],
    num_questions: 10,
    shuffle_questions: true,
  },
};
```

### Step 7: Security Considerations

**Credential Encryption:**

```python
# backend/services/encryption_service.py
from cryptography.fernet import Fernet
import os

# Use environment variable for encryption key
ENCRYPTION_KEY = os.getenv("CREDENTIAL_ENCRYPTION_KEY").encode()
cipher = Fernet(ENCRYPTION_KEY)

def encrypt_credentials(credentials: Dict[str, Any]) -> str:
    """Encrypt credentials dictionary"""
    import json
    plaintext = json.dumps(credentials).encode()
    encrypted = cipher.encrypt(plaintext)
    return encrypted.decode()

def decrypt_credentials(encrypted: str) -> Dict[str, Any]:
    """Decrypt credentials string"""
    import json
    decrypted = cipher.decrypt(encrypted.encode())
    return json.loads(decrypted.decode())
```

**Rate Limiting:**

```python
# Prevent abuse of provider APIs
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.get("/{provider_id}/content")
@limiter.limit("10/minute")  # Max 10 requests per minute
async def fetch_provider_content(...):
    ...
```

## Testing

**Mock Provider for Testing:**

```python
# backend/tests/mocks/mock_provider.py
class MockSchoolProvider(ContentProviderBase):
    """Mock provider for testing"""

    async def authenticate(self) -> bool:
        return True

    async def fetch_content(
        self, content_type: str, filters: Optional[Dict] = None
    ) -> List[Dict]:
        return [
            {
                "id": "q1",
                "text": "What is 2+2?",
                "type": "multiple_choice",
                "answer": "4",
                "choices": ["3", "4", "5", "6"],
            }
        ]

    async def sync_result(self, content_id: str, result_data: Dict) -> bool:
        return True
```

## Checklist

Before deploying a new provider integration:

- [ ] Provider class extends `ContentProviderBase`
- [ ] All abstract methods implemented
- [ ] Authentication tested with valid/invalid credentials
- [ ] Content standardization handles provider-specific schemas
- [ ] Error handling for API failures
- [ ] Credentials encrypted in database
- [ ] Rate limiting configured
- [ ] Test connection endpoint works
- [ ] Frontend configuration UI created
- [ ] Provider registered in `PROVIDER_REGISTRY`
- [ ] Documentation with example configuration
- [ ] Unit tests for provider class
- [ ] Integration tests with mock API

## Common Issues

1. **Authentication failures** - Check API key format, URL endpoints
2. **Schema mismatches** - Provider's data format doesn't match our standardization
3. **Rate limiting** - Provider API has strict limits
4. **Token expiration** - OAuth tokens need refresh logic
5. **Network timeouts** - Implement retry logic and timeouts

## Resources

- [Task Template System Plan](./plan.md)
- [Template Development Guide](./guide-template-development.md)
- [API Specification](./api-spec.md)
