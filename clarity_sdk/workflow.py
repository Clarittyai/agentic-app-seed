"""
Workflow decorators for chaining agents

The @workflow decorator defines a multi-step workflow.
The @uses_agent decorator chains agents together.

Example:
    from clarity_sdk import workflow, uses_agent, ExecutionMode

    @workflow(
        id="daily-summary",
        name="Daily Summary",
        description="Analyzes tasks and sends summary",
        execution_mode=ExecutionMode.SEQUENTIAL
    )
    @uses_agent("task-analyzer", output_key="analysis")
    @uses_agent("slack-notifier", input_from="analysis", output_key="notification")
    async def daily_summary(context):
        # Optional custom logic
        # Workflow executes automatically based on @uses_agent chain
        pass
"""

from typing import Dict, Any, List, Optional, Callable
from functools import wraps
from clarity_sdk.models import WorkflowMetadata, WorkflowStep, ExecutionMode
from clarity_sdk.registry import WorkflowRegistry
from clarity_sdk.exceptions import ValidationError, WorkflowError
import inspect


def workflow(
    id: str,
    name: str,
    description: str,
    execution_mode: ExecutionMode = ExecutionMode.SEQUENTIAL,
    version: str = "1.0.0",
    timeout: int = 600,
    max_retries: int = 3,
    error_handling: str = "fail"
):
    """
    Decorator to define a workflow.

    Workflows orchestrate multiple agents to accomplish complex tasks.

    Args:
        id: Unique workflow identifier
        name: User-facing name
        description: What this workflow does
        execution_mode: How to execute steps (sequential, parallel, dag)
        version: Workflow version (default: "1.0.0")
        timeout: Workflow timeout in seconds (default: 600)
        max_retries: Maximum retry attempts (default: 3)
        error_handling: How to handle errors ("fail", "continue", "retry")

    Returns:
        Decorated function with workflow metadata

    Raises:
        ValidationError: If workflow definition is invalid

    Example:
        @workflow(
            id="meeting-summary",
            name="Meeting Summary",
            description="Analyzes meeting and creates summary",
            execution_mode=ExecutionMode.SEQUENTIAL,
            timeout=300
        )
        @uses_agent("transcript-analyzer", output_key="analysis")
        @uses_agent("summary-generator", input_from="analysis", output_key="summary")
        async def meeting_summary(context):
            # Workflow executes automatically
            # Optional custom logic here
            pass
    """

    def decorator(func):
        # Validate function is async (optional but recommended)
        if not inspect.iscoroutinefunction(func):
            # Allow non-async for simple workflows
            pass

        # Extract steps from @uses_agent decorators
        steps = getattr(func, '_clarity_steps', [])

        # Validate error_handling
        valid_error_handling = ["fail", "continue", "retry"]
        if error_handling not in valid_error_handling:
            raise ValidationError(
                f"error_handling must be one of {valid_error_handling}, got: {error_handling}"
            )

        # Create metadata
        try:
            metadata = WorkflowMetadata(
                id=id,
                name=name,
                description=description,
                version=version,
                execution_mode=execution_mode,
                steps=steps,
                timeout=timeout,
                max_retries=max_retries,
                error_handling=error_handling
            )
        except Exception as e:
            raise ValidationError(f"Invalid workflow metadata for {id}: {e}")

        # Store metadata on function
        func._clarity_metadata = metadata
        func._clarity_type = "workflow"

        # Register workflow
        WorkflowRegistry.register(metadata, func)

        # Add helper method
        func.get_metadata = lambda: metadata

        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Workflow will be executed by WorkflowExecutor
            # This wrapper is for direct invocation
            return await func(*args, **kwargs)

        wrapper._clarity_metadata = metadata
        wrapper._clarity_type = "workflow"
        wrapper.get_metadata = lambda: metadata

        return wrapper

    return decorator


def uses_agent(
    agent_id: str,
    name: Optional[str] = None,
    input_from: Optional[str] = None,
    output_key: Optional[str] = None,
    condition: Optional[str] = None,
    timeout_override: Optional[int] = None,
    retry_on_failure: bool = True
):
    """
    Decorator to chain an agent into a workflow.

    Must be used with @workflow decorator. Agents execute in the order
    they are declared (bottom to top due to decorator application order).

    Args:
        agent_id: ID of agent to execute
        name: Optional custom name for this step
        input_from: Key to get data from previous step (maps to agent input)
        output_key: Key to store this agent's output in workflow context
        condition: Optional Python expression for conditional execution
        timeout_override: Override agent's default timeout
        retry_on_failure: Whether to retry on failure (default: True)

    Returns:
        Decorated function with step added

    Example:
        @workflow(id="task-processing")
        @uses_agent("task-analyzer", output_key="analysis")
        @uses_agent("task-prioritizer", input_from="analysis", output_key="priorities")
        @uses_agent("slack-notifier", input_from="priorities", condition="len(priorities) > 0")
        async def task_processing(context):
            # Steps execute: analyzer → prioritizer → notifier (if condition met)
            pass

    Advanced Example with Input Mapping:
        @workflow(id="data-processing")
        @uses_agent(
            "data-validator",
            output_key="validated_data"
        )
        @uses_agent(
            "data-transformer",
            input_from="validated_data",
            output_key="transformed_data",
            condition="validated_data.get('valid') == True"
        )
        async def data_processing(context):
            pass
    """

    def decorator(func):
        # Create step
        step = WorkflowStep(
            agent_id=agent_id,
            name=name or agent_id,
            input_mapping={"data": input_from} if input_from else None,
            output_key=output_key,
            condition=condition,
            retry_on_failure=retry_on_failure,
            timeout_override=timeout_override
        )

        # Store steps on function (decorators apply bottom-up, so insert at beginning)
        if not hasattr(func, '_clarity_steps'):
            func._clarity_steps = []

        # Insert at beginning because decorators apply bottom-up
        func._clarity_steps.insert(0, step)

        return func

    return decorator


# Re-export ExecutionMode for convenience
__all__ = ["workflow", "uses_agent", "ExecutionMode"]
