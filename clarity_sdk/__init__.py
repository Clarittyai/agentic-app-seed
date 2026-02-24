"""
Clarity SDK - Professional SDK for building AI-powered agentic applications

Provides decorators and utilities for defining:
- AI Agents (@agent)
- Workflows (@workflow, @uses_agent)
- Trigger Templates (@trigger_template)
- Integrations and context management

Example:
    from clarity_sdk import agent, workflow, uses_agent, BaseAgent, AgentResult

    @agent(
        id="my-agent",
        name="My Agent",
        inputs={"text": str},
        outputs={"result": str}
    )
    class MyAgent(BaseAgent):
        async def execute(self, context):
            return AgentResult(success=True, data={"result": "processed"})

    @workflow(id="my-workflow")
    @uses_agent("my-agent")
    async def my_workflow(context):
        pass
"""

__version__ = "1.0.0"
__author__ = "Clarity Platform"

# Core decorators
from clarity_sdk.agent import agent
from clarity_sdk.workflow import workflow, uses_agent
from clarity_sdk.trigger import trigger_template, TriggerTemplateType

# Base classes
from clarity_sdk.base import BaseAgent, AgentResult

# Context objects
from clarity_sdk.context import AgentContext, WorkflowContext

# Registries (for advanced usage)
from clarity_sdk.registry import AgentRegistry, WorkflowRegistry, TriggerTemplateRegistry

# Exceptions
from clarity_sdk.exceptions import (
    ClaritySDKError,
    AgentError,
    WorkflowError,
    TriggerError,
    ValidationError,
    ExecutionError
)

# Enums
from clarity_sdk.workflow import ExecutionMode

# Executors (optional - for advanced usage)
from clarity_sdk.executor import WorkflowExecutor
from clarity_sdk.trigger_manager import DynamicTriggerManager

__all__ = [
    # Decorators
    "agent",
    "workflow",
    "uses_agent",
    "trigger_template",

    # Base classes
    "BaseAgent",
    "AgentResult",

    # Context
    "AgentContext",
    "WorkflowContext",

    # Registries
    "AgentRegistry",
    "WorkflowRegistry",
    "TriggerTemplateRegistry",

    # Enums
    "ExecutionMode",
    "TriggerTemplateType",

    # Exceptions
    "ClaritySDKError",
    "AgentError",
    "WorkflowError",
    "TriggerError",
    "ValidationError",
    "ExecutionError",

    # Executors (advanced)
    "WorkflowExecutor",
    "DynamicTriggerManager",
]
