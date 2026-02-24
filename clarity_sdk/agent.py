"""
Agent decorator for defining AI agents

The @agent decorator registers agents with metadata and makes them
discoverable by the platform.

Example:
    from clarity_sdk import agent, BaseAgent, AgentResult, AgentContext

    @agent(
        id="task-prioritizer",
        name="Task Prioritizer",
        description="Analyzes tasks and suggests priorities",
        inputs={"tasks": list},
        outputs={"priorities": dict},
        category="productivity"
    )
    class TaskPrioritizerAgent(BaseAgent):
        async def execute(self, context: AgentContext) -> AgentResult:
            tasks = context.get_input("tasks", [])
            # Your AI logic here
            return AgentResult(success=True, data={"priorities": {}})
"""

from typing import Dict, Any, List, Optional, Callable
from functools import wraps
from clarity_sdk.models import AgentMetadata, IntegrationRequirement
from clarity_sdk.registry import AgentRegistry
from clarity_sdk.exceptions import ValidationError, AgentError
import inspect


def agent(
    id: str,
    name: str,
    description: str,
    inputs: Dict[str, Any],
    outputs: Dict[str, Any],
    category: str = "general",
    integrations: Optional[List[Dict[str, Any]]] = None,
    capabilities: Optional[List[str]] = None,
    version: str = "1.0.0",
    rate_limit: Optional[Dict[str, int]] = None,
    timeout: int = 300,
    retry_policy: Optional[Dict[str, Any]] = None
):
    """
    Decorator to define an AI agent with metadata.

    The decorated class must inherit from BaseAgent and implement execute().

    Args:
        id: Unique agent identifier (lowercase, hyphens only)
        name: User-facing name
        description: What this agent does
        inputs: Expected input schema (dict of key: type)
        outputs: Expected output schema (dict of key: type)
        category: Category for organization (default: "general")
        integrations: List of integration requirements (optional)
        capabilities: List of capability tags (optional)
        version: Agent version (default: "1.0.0")
        rate_limit: Rate limiting config {"calls": 100, "period": 3600}
        timeout: Execution timeout in seconds (default: 300)
        retry_policy: Retry configuration (optional)

    Returns:
        Decorated class with agent metadata

    Raises:
        ValidationError: If agent definition is invalid
        TypeError: If class doesn't implement execute()

    Example:
        @agent(
            id="slack-notifier",
            name="Slack Notifier",
            description="Send notifications to Slack",
            inputs={"channel": str, "message": str},
            outputs={"message_id": str, "success": bool},
            category="integration",
            integrations=[{
                "service": "slack",
                "auth_type": "oauth",
                "description": "Connect your Slack workspace",
                "scopes": ["chat:write"],
                "config_fields": [{
                    "key": "bot_token",
                    "label": "Bot Token",
                    "type": "password",
                    "required": True
                }]
            }],
            timeout=60
        )
        class SlackNotifierAgent(BaseAgent):
            async def execute(self, context: AgentContext) -> AgentResult:
                slack = context.get_integration("slack")
                if not slack:
                    return AgentResult(
                        success=False,
                        error="Slack not connected"
                    )
                # Send to Slack...
                return AgentResult(success=True, data={...})
    """

    def decorator(cls):
        # Validate class has execute method
        if not hasattr(cls, 'execute'):
            raise TypeError(
                f"Agent class {cls.__name__} must implement execute() method. "
                f"Make sure your class inherits from BaseAgent."
            )

        # Validate execute is async
        execute_method = getattr(cls, 'execute')
        if not inspect.iscoroutinefunction(execute_method):
            raise TypeError(
                f"Agent {cls.__name__}.execute() must be an async method. "
                f"Use: async def execute(self, context)"
            )

        # Parse integrations
        integration_objs = []
        if integrations:
            try:
                for integ in integrations:
                    integration_objs.append(IntegrationRequirement(**integ))
            except Exception as e:
                raise ValidationError(f"Invalid integration requirement: {e}")

        # Create metadata
        try:
            metadata = AgentMetadata(
                id=id,
                name=name,
                description=description,
                version=version,
                category=category,
                inputs=inputs,
                outputs=outputs,
                integrations=integration_objs,
                capabilities=capabilities or [],
                rate_limit=rate_limit,
                timeout=timeout,
                retry_policy=retry_policy or {"max_retries": 3, "backoff": "exponential"}
            )
        except Exception as e:
            raise ValidationError(f"Invalid agent metadata for {id}: {e}")

        # Store metadata on class
        cls._clarity_metadata = metadata
        cls._clarity_type = "agent"

        # Register agent globally
        AgentRegistry.register(metadata, cls)

        # Add helper methods to class
        cls.get_metadata = classmethod(lambda c: metadata)

        return cls

    return decorator
