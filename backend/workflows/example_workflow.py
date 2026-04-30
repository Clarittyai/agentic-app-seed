"""
Example Workflow - Daily Task Review

This is a MINIMAL example to demonstrate:
- How to create a workflow with @workflow decorator
- Chaining agents with @uses_agent
- Sequential vs parallel execution modes
- Accessing step results

REPLACE THIS with your own workflow!
"""

from clarity_sdk import workflow, uses_agent, WorkflowContext, ExecutionMode
import logging

logger = logging.getLogger(__name__)


@workflow(
    id="example-workflow",
    name="Example Workflow",
    description="Analyzes tasks and provides prioritized recommendations (replace with your logic)",
    execution_mode=ExecutionMode.SEQUENTIAL
)
@uses_agent("example-agent", output_key="analysis")
async def example_workflow(context: WorkflowContext):
    """
    Minimal workflow example demonstrating agent chaining.

    This workflow:
    1. Executes the example-agent
    2. Results are stored with key "analysis"
    3. You can access results with context.get_step_result("analysis")

    Triggered by: example-trigger or manual execution

    TODO: Replace with your own workflow logic!
    """
    context.log("info", "Starting example workflow")

    # The @uses_agent decorator automatically executes the agent
    # Results are available via:
    # analysis_result = context.get_step_result("analysis")

    # Add your custom logic here:
    # - Chain multiple agents
    # - Add conditional logic
    # - Call external APIs
    # - Store results in database

    context.log("info", "Example workflow complete")


# Example: Multi-agent workflow (commented out - uncomment to use)
"""
@workflow(
    id="multi-step-workflow",
    name="Multi-Step Workflow",
    description="Chains multiple agents together",
    execution_mode=ExecutionMode.SEQUENTIAL
)
@uses_agent("agent-1", output_key="step1")
@uses_agent("agent-2", output_key="step2", input_from="step1")
@uses_agent("agent-3", output_key="step3", input_from="step2")
async def multi_step_workflow(context: WorkflowContext):
    # Agent 1 runs first
    # Agent 2 receives output from Agent 1
    # Agent 3 receives output from Agent 2
    # All run sequentially
    pass


@workflow(
    id="parallel-workflow",
    name="Parallel Workflow",
    description="Runs agents in parallel for speed",
    execution_mode=ExecutionMode.PARALLEL
)
@uses_agent("agent-1", output_key="result1")
@uses_agent("agent-2", output_key="result2")
@uses_agent("agent-3", output_key="result3")
async def parallel_workflow(context: WorkflowContext):
    # All agents run simultaneously
    # Faster execution, no dependencies between agents
    # Results available after all complete
    pass
"""
