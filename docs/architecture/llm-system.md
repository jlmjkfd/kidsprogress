# LLM System Architecture

> **Created**: 2025-12-16
> **Status**: Implemented
> **Pattern**: Strategy + Factory + Facade

## Overview

Unified LLM system providing a single interface for all AI features across the application. Uses Strategy Pattern for provider abstraction, Factory Pattern for provider creation, and Facade Pattern for simplified API.

## Problem Statement

### Before Refactoring

**Multiple LLM calling patterns**:
- AI Schedule Service → `gemini_client.py` (direct)
- Chat Service → `llm_service.py` (wrapper)
- Writing Service → `llm_service.py` (wrapper)

**Issues**:
- ❌ Code duplication (2 different LLM clients)
- ❌ Inconsistent error handling
- ❌ Hard-coded provider (Gemini)
- ❌ Difficult to switch providers
- ❌ Logging inconsistencies

### After Refactoring

**Unified architecture**:
```
All Features → llm_interface.py → Provider Registry → Gemini/Mock/Future Providers
```

**Benefits**:
- ✅ Single interface for all features
- ✅ Consistent error handling
- ✅ Provider abstraction (easy to add OpenAI, Anthropic, etc.)
- ✅ Automatic logging for all calls
- ✅ Centralized configuration

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Feature Layer                             │
│  ┌───────────────┐  ┌────────────┐  ┌──────────────────┐   │
│  │ AI Schedule   │  │ Chat       │  │ Writing Template │   │
│  │ Service       │  │ Service    │  │ Handler          │   │
│  └───────┬───────┘  └─────┬──────┘  └────────┬─────────┘   │
└──────────┼─────────────────┼──────────────────┼─────────────┘
           │                 │                  │
           └─────────────────┼──────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Unified LLM Interface (Facade)                  │
│  backend/services/llm_interface.py                          │
│                                                              │
│  async def call_llm(                                         │
│      messages: List[Dict],                                   │
│      service: str,                                           │
│      feature: str,                                           │
│      child_id: Optional[str],                               │
│      return_json: bool = False                              │
│  ) -> Optional[Union[str, Dict]]                            │
│                                                              │
│  Responsibilities:                                           │
│  - Route to correct provider                                │
│  - Log all calls to database                                │
│  - Handle errors gracefully                                 │
│  - Format responses                                          │
└─────────────────┬───────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────┐
│               Provider Registry (Factory)                    │
│  backend/ai/providers/registry.py                           │
│                                                              │
│  def get_provider(name: Optional[str]) -> LLMProvider       │
│                                                              │
│  Responsibilities:                                           │
│  - Create provider instances                                │
│  - Cache provider instances (Singleton)                     │
│  - Read configuration from .env                             │
└─────────────────┬───────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────┐
│            Provider Implementations (Strategy)               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ LLMProvider (Abstract Base)                         │   │
│  │ backend/ai/providers/base.py                        │   │
│  │                                                      │   │
│  │ - async generate(messages, **kwargs) → LLMResponse  │   │
│  │ - async generate_json(messages, **kwargs) → LLMResp │   │
│  │ - property provider_name → str                      │   │
│  │ - property model_name → str                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Gemini       │  │ Mock         │  │ Future:      │     │
│  │ Provider     │  │ Provider     │  │ OpenAI,      │     │
│  │              │  │              │  │ Anthropic    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Design Patterns

### 1. Strategy Pattern (Provider Abstraction)

**Intent**: Define a family of algorithms (LLM providers), encapsulate each one, and make them interchangeable.

**Implementation**:
- **Context**: `llm_interface.py`
- **Strategy Interface**: `LLMProvider` (abstract base class)
- **Concrete Strategies**: `GeminiProvider`, `MockProvider`, (future: `OpenAIProvider`, `AnthropicProvider`)

**Benefits**:
- Adding new providers doesn't modify existing code
- Each provider is independently testable
- Client code doesn't know about concrete providers

**Example**:
```python
# All providers implement same interface
class LLMProvider(ABC):
    async def generate(self, messages, **kwargs) -> LLMResponse:
        pass

class GeminiProvider(LLMProvider):
    async def generate(self, messages, **kwargs) -> LLMResponse:
        # Call Gemini API
        ...

class MockProvider(LLMProvider):
    async def generate(self, messages, **kwargs) -> LLMResponse:
        # Return mock response
        ...
```

### 2. Factory Pattern (Provider Creation)

**Intent**: Create provider instances without specifying their exact classes.

**Implementation**:
- **Factory**: `ProviderRegistry`
- **Products**: Concrete LLM providers

**Benefits**:
- Centralized provider creation
- Easy to add new providers
- Configuration-driven selection

**Example**:
```python
# Factory creates correct provider based on config
provider = get_provider()  # Returns GeminiProvider or MockProvider based on .env
```

### 3. Facade Pattern (Simplified Interface)

**Intent**: Provide a simplified interface to a complex subsystem.

**Implementation**:
- **Facade**: `call_llm()` function
- **Subsystem**: Provider registry, providers, logging, error handling

**Benefits**:
- Features don't need to know about providers, logging, error handling
- Single function call for all LLM needs
- Consistent interface across all features

**Example**:
```python
# Simple interface hides complexity
response = await call_llm(
    messages=[...],
    service="chat",
    feature="conversation"
)
# Behind the scenes: provider selection, logging, error handling, formatting
```

### 4. Singleton Pattern (Provider Caching)

**Intent**: Ensure only one instance of each provider exists.

**Implementation**:
- `ProviderRegistry` maintains cache of provider instances
- First call creates provider, subsequent calls return cached instance

**Benefits**:
- Avoid repeated initialization (API clients, etc.)
- Share connection pools
- Reduce memory usage

---

## Configuration

### Environment Variables (.env)

```bash
# LLM Provider Selection
USE_MOCK_AI=false              # Use mock provider (no API calls)
LLM_PROVIDER=gemini           # Which provider to use

# Gemini Configuration
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-2.0-flash-lite
```

### Provider Priority

1. If `USE_MOCK_AI=true` → Use `MockProvider`
2. Else use provider specified in `LLM_PROVIDER`
3. Default: `gemini`

---

## Usage Examples

### Example 1: Get Text Response (Chat)

```python
from backend.services.llm_interface import call_llm

response = await call_llm(
    messages=[
        {"role": "system", "content": "You are a helpful assistant"},
        {"role": "user", "content": "What is 2+2?"}
    ],
    temperature=0.7,
    service="chat",
    feature="conversation",
    child_id="123",
    return_json=False
)

# response = "2+2 equals 4." or None if error
```

### Example 2: Get JSON Response (AI Schedule)

```python
from backend.services.llm_interface import call_llm

response = await call_llm(
    messages=[
        {"role": "system", "content": prompts.SYSTEM_INSTRUCTION},
        {"role": "user", "content": formatted_prompt}
    ],
    temperature=0.3,
    service="ai_schedule",
    feature="recommendation",
    child_id="123",
    return_json=True
)

# response = {"recommended_tasks": [...], "overall_reasoning": "..."} or None if error
```

### Example 3: Override Provider (Testing)

```python
from backend.services.llm_interface import call_llm

response = await call_llm(
    messages=[...],
    service="test",
    feature="unit_test",
    provider_override="mock"  # Force mock provider
)
```

---

## Error Handling

### Graceful Degradation

All LLM calls return `None` on error instead of raising exceptions. Features implement fallback logic.

**Example Flow**:
```python
# 1. Try LLM
response = await call_llm(...)

# 2. If failed (quota, network, etc.), response = None
if response is None:
    # 3. Feature implements fallback
    return fallback_logic()
```

### Error Logging

All errors are automatically logged to database (`llm_logs` collection) with:
- Error message
- Error type (quota_exceeded, api_error, json_parse_error, etc.)
- Full context (service, feature, child_id, etc.)
- Latency

---

## Monitoring

### Database Logging

Every LLM call (success or failure) is logged to `llm_logs` collection:

```javascript
{
  service: "chat",
  feature: "conversation",
  provider: "gemini",
  model: "gemini-2.0-flash-lite",
  messages: [...],
  response_text: "...",
  response_raw: {...},  // Parsed JSON for JSON responses
  child_id: ObjectId("..."),
  temperature: 0.7,
  prompt_tokens: 150,
  completion_tokens: 50,
  total_tokens: 200,
  latency_ms: 1234,
  error: null,
  error_type: null,
  created_at: ISODate("...")
}
```

### Usage Statistics

Query logs to get usage stats:

```python
from backend.services.llm_logger import llm_logger

# Get stats for a service
stats = await llm_logger.get_stats(service="chat")

# Get error logs
errors = await llm_logger.get_logs(has_error=True, limit=10)
```

---

## Adding New Providers

### Step 1: Implement Provider Class

Create `backend/ai/providers/openai.py`:

```python
from backend.ai.providers.base import LLMProvider, LLMResponse

class OpenAIProvider(LLMProvider):
    def __init__(self):
        # Initialize OpenAI client
        ...

    @property
    def provider_name(self) -> str:
        return "openai"

    @property
    def model_name(self) -> str:
        return self.settings.openai_model

    async def generate(self, messages, temperature=0.7, **kwargs) -> LLMResponse:
        # Call OpenAI API
        ...

    async def generate_json(self, messages, temperature=0.3, **kwargs) -> LLMResponse:
        # Call OpenAI API with JSON mode
        ...
```

### Step 2: Register in Factory

Update `backend/ai/providers/registry.py`:

```python
def _create_provider(self, provider_name: str) -> LLMProvider:
    if provider_name == "gemini":
        from backend.ai.providers.gemini import GeminiProvider
        return GeminiProvider()

    elif provider_name == "openai":
        from backend.ai.providers.openai import OpenAIProvider
        return OpenAIProvider()

    # ... other providers
```

### Step 3: Add Configuration

Update `.env.example`:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-4o-mini
```

### Step 4: Use It

```bash
# In .env
LLM_PROVIDER=openai
```

That's it! All features automatically use OpenAI.

---

## Migration Guide

### From Old gemini_client.py

**Before**:
```python
from backend.ai.gemini_client import GeminiClient

gemini = GeminiClient()
response = await gemini.generate_structured(
    prompt=prompt,
    system_instruction=system_instruction
)
```

**After**:
```python
from backend.services.llm_interface import call_llm

response = await call_llm(
    messages=[
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": prompt}
    ],
    service="your_service",
    feature="your_feature",
    return_json=True
)
```

### From Old llm_service.py

**Before**:
```python
from backend.services.llm_service import call_llm

response = await call_llm(
    system_prompt=system_prompt,
    user_prompt=user_prompt,
    service="chat",
    feature="conversation"
)
```

**After**:
```python
from backend.services.llm_interface import call_llm

response = await call_llm(
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ],
    service="chat",
    feature="conversation",
    return_json=False
)
```

---

## Testing

### Unit Tests

Test providers independently:

```python
from backend.ai.providers.mock import MockProvider

async def test_mock_provider():
    provider = MockProvider()
    response = await provider.generate([
        {"role": "user", "content": "Hello"}
    ])
    assert response.is_success()
    assert response.content is not None
```

### Integration Tests

Test with mock provider:

```python
from backend.services.llm_interface import call_llm

async def test_chat_service():
    response = await call_llm(
        messages=[...],
        service="chat",
        feature="test",
        provider_override="mock"
    )
    assert response is not None
```

---

## References

- **Architecture Patterns**: `.claude/skills/architecture-patterns.md`
- **Provider Base**: `backend/ai/providers/base.py`
- **Unified Interface**: `backend/services/llm_interface.py`
- **Configuration**: `backend/.env.example`

---

## Decision Log

### Why Strategy Pattern?

**Decision**: Use Strategy Pattern for provider abstraction

**Rationale**:
- Need to support multiple LLM providers
- Each provider has different API
- Want to switch providers without changing feature code
- Want to add new providers without modifying existing code

**Alternatives Considered**:
- ❌ If/else statements in features → Violates Open/Closed Principle
- ❌ Inheritance → Too rigid, doesn't support runtime switching

### Why Facade Pattern?

**Decision**: Provide single `call_llm()` function

**Rationale**:
- Features shouldn't care about provider selection, logging, error handling
- Reduces cognitive load for developers
- Consistent interface across all features
- Easier to add cross-cutting concerns (rate limiting, caching, etc.)

**Alternatives Considered**:
- ❌ Direct provider access → Features need to handle logging, errors, etc.
- ❌ Service class → More verbose, less functional style

### Why Not Per-Template Provider Selection?

**Decision**: System-wide provider configuration only (no per-template selection)

**Rationale**:
- **Security**: User-provided API keys are security risk (need encryption, quotas, validation)
- **Complexity**: Template-level configuration adds significant complexity
- **Cost**: Difficult to track costs per template
- **Support**: Harder to debug issues with user-provided keys

**Future Consideration**: Could add this later if needed, with proper security measures.

---

## Maintenance

### Adding New Feature

1. Import `call_llm` from `backend.services.llm_interface`
2. Call it with appropriate service/feature names
3. Handle `None` response (implement fallback)
4. Done! Logging, error handling, provider selection automatic

### Changing Provider

1. Update `.env`: `LLM_PROVIDER=openai`
2. Restart server
3. Done! All features automatically use new provider

### Debugging LLM Issues

1. Check logs: Query `llm_logs` collection
2. Filter by service/feature/child
3. Look for errors, latency issues
4. Check prompt/response for debugging

---

## Future Enhancements

### Potential Additions

1. **Response Caching**: Cache identical requests
2. **Rate Limiting**: Per-child or per-provider limits
3. **Cost Tracking**: Track costs per child/feature
4. **A/B Testing**: Compare providers for same task
5. **Fallback Chain**: Try provider 1, if fail try provider 2
6. **Streaming**: Stream responses for long generations
7. **Function Calling**: Support LLM function calling
8. **Vision**: Support image input (for homework photos)

### Implementation Notes

All enhancements can be added to `llm_interface.py` without changing feature code (Facade pattern benefit).
