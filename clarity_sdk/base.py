"""
Base classes for Clarity SDK

Provides abstract base classes that developers inherit from.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict
from clarity_sdk.models import AgentResult
from clarity_sdk.context import AgentContext


class BaseAgent(ABC):
    """
    Base class for all agents.

    Developers inherit from this class and implement the execute() method.

    Example:
        @agent(id="my-agent", name="My Agent", inputs={...}, outputs={...})
        class MyAgent(BaseAgent):
            async def execute(self, context: AgentContext) -> AgentResult:
                # Your agent logic here
                return AgentResult(success=True, data={...})
    """

    def __init__(self):
        """Initialize the agent"""
        pass

    @abstractmethod
    async def execute(self, context: AgentContext) -> AgentResult:
        """
        Execute the agent logic.

        Args:
            context: AgentContext with input data, integrations, etc.

        Returns:
            AgentResult with success status and output data

        Raises:
            AgentError: If execution fails
        """
        pass

    def validate_input(self, context: AgentContext) -> bool:
        """
        Optional: Validate input data before execution.

        Override this method to add custom validation logic.

        Args:
            context: AgentContext to validate

        Returns:
            True if valid, False otherwise
        """
        return True

    async def before_execute(self, context: AgentContext):
        """
        Optional: Hook called before execute().

        Use for setup, logging, etc.
        """
        pass

    async def after_execute(self, context: AgentContext, result: AgentResult):
        """
        Optional: Hook called after execute().

        Use for cleanup, logging, etc.
        """
        pass

    async def on_error(self, context: AgentContext, error: Exception):
        """
        Optional: Hook called when execute() raises an exception.

        Use for error handling, logging, etc.
        """
        pass


class BaseWorkflow(ABC):
    """
    Base class for workflows (optional).

    Most workflows don't need a class - they use the @workflow decorator
    with @uses_agent to define steps. This class is for advanced use cases.
    """

    @abstractmethod
    async def execute(self, context):
        """Execute the workflow"""
        pass
