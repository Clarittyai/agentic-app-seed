# Agent Implementation Prompt

**Quick reference for implementing new agents**

---

## 📂 File Location

Create: `backend/agents/{your_agent_name}.py`

---

## 🎯 Agent Template

```python
"""
[Agent Name] Agent

[Brief description of what this agent does]
"""

from claritty_sdk import agent, BaseAgent, AgentResult, AgentContext
from typing import Dict, Any
import logging
import os

logger = logging.getLogger(__name__)


@agent(
    id="your-agent-id",  # kebab-case, unique
    name="Your Agent Name",  # Human-readable
    description="What this agent does in one sentence",
    category="productivity",  # or "communication", "analytics", etc.
    inputs={
        "input_field_1": {
            "type": "string",  # string, number, boolean, array, object
            "description": "What this input is for",
            "required": True
        },
        "input_field_2": {
            "type": "number",
            "description": "Optional input",
            "required": False
        }
    },
    outputs={
        "output_field_1": {
            "type": "string",
            "description": "What this output contains"
        },
        "output_field_2": {
            "type": "array",
            "description": "List of results"
        }
    },
    timeout=30  # seconds (default: 30)
)
class YourAgentName(BaseAgent):
    """
    Detailed agent description.

    This agent:
    1. Does X
    2. Then does Y
    3. Returns Z
    """

    async def execute(self, context: AgentContext) -> AgentResult:
        """
        Main execution logic.
        """
        try:
            # Step 1: Get inputs
            input1 = context.get_input("input_field_1")
            input2 = context.get_input("input_field_2", default_value=None)

            context.log("info", f"Processing: {input1}")

            # Step 2: Your logic here
            # - Call Claude API
            # - Fetch external data
            # - Process information
            # - Generate results
            result = await self._process(input1, input2, context)

            # Step 3: Return success
            return AgentResult(
                success=True,
                data={
                    "output_field_1": result["field1"],
                    "output_field_2": result["field2"]
                },
                metadata={
                    "agent_id": "your-agent-id",
                    "processing_time_ms": 123
                }
            )

        except Exception as e:
            logger.error(f"Agent execution failed: {e}")
            return AgentResult(
                success=False,
                error=f"Failed to process: {str(e)}"
            )

    async def _process(
        self,
        input1: str,
        input2: Any,
        context: AgentContext
    ) -> Dict[str, Any]:
        """
        Helper method for processing logic.
        """
        # Your implementation here
        return {
            "field1": "result1",
            "field2": ["item1", "item2"]
        }
```

---

## 🔌 Common Patterns

### Pattern 1: Claude via the Claritty LLM proxy (NO API keys)

Never use a raw `Anthropic(api_key=...)` client — apps hold no provider keys.
Always call the model through `claritty_sdk.llm.get_llm_client`, which routes to
the platform's metered, BYOK-aware proxy (auth is injected at deploy):

```python
from claritty_sdk.llm import get_llm_client
import asyncio

async def _call_claude(self, prompt: str) -> str:
    """Call Claude through the Claritty proxy (no ANTHROPIC_API_KEY)."""
    client = get_llm_client("claude-sonnet-4-6")
    # chat() is sync; off-load it so the event loop isn't blocked.
    result = await asyncio.to_thread(
        client.chat,
        [{"role": "user", "content": prompt}],
        max_tokens=1024,
    )
    return result.content
```

### Pattern 2: Database Query (Multi-Tenant!)

```python
from backend.database import get_db
from backend.models import YourModel

async def _fetch_data(self, context: AgentContext):
    """
    Fetch data from database (multi-tenant aware).
    """
    db = get_db()

    # ✅ CRITICAL: Always filter by the caller's user_id (context.user_id,
    # which the platform resolves from the X-User-ID header).
    items = db.query(YourModel).filter(
        YourModel.user_id == context.user_id
    ).all()

    return items
```

### Pattern 3: External API Call

```python
import httpx

async def _fetch_external_data(self, api_key: str):
    """
    Call external API.
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.example.com/data",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10.0
        )

        if response.status_code != 200:
            raise Exception(f"API call failed: {response.status_code}")

        return response.json()
```

### Pattern 4: Error Handling

```python
async def execute(self, context: AgentContext) -> AgentResult:
    try:
        # Your logic
        result = await self._process()

        return AgentResult(success=True, data=result)

    except ValueError as e:
        # User input errors
        context.log("warning", f"Invalid input: {e}")
        return AgentResult(
            success=False,
            error=f"Invalid input: {str(e)}"
        )

    except httpx.TimeoutException:
        # Network timeouts
        context.log("error", "External API timeout")
        return AgentResult(
            success=False,
            error="External service timeout - please try again"
        )

    except Exception as e:
        # Unexpected errors
        logger.exception("Unexpected error in agent")
        return AgentResult(
            success=False,
            error=f"Unexpected error: {str(e)}"
        )
```

---

## ✅ Checklist

Before marking agent complete:

- [ ] Decorator has unique `id` (kebab-case)
- [ ] All inputs defined with type and description
- [ ] All outputs defined with type and description
- [ ] Database queries filter by the caller's `user_id` (X-User-ID)
- [ ] AI via `get_llm_client` (no provider keys)
- [ ] Error handling for common failure cases
- [ ] Logging at key steps (`context.log()`)
- [ ] Timeout set appropriately (default: 30s)
- [ ] Returns `AgentResult` with `success` + `data`/`error`

---

## 🧪 Testing

```python
# Test locally
import asyncio
from backend.agents.your_agent import YourAgentName

async def test_agent():
    agent = YourAgentName()

    # Mock context
    class MockContext:
        def get_input(self, key, default_value=None):
            inputs = {
                "input_field_1": "test value",
                "input_field_2": 42
            }
            return inputs.get(key, default_value)

        def log(self, level, message):
            print(f"[{level}] {message}")

    result = await agent.execute(MockContext())
    print(f"Success: {result.success}")
    print(f"Data: {result.data}")

asyncio.run(test_agent())
```

---

## 📚 Related

- `backend/agents/example_agent.py` - Reference implementation
- `CLAUDE.md` - Full agent development guide
- `LLM_PROXY.md` - calling Claude via the SDK proxy
