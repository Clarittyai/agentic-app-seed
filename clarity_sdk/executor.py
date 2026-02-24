"""
Workflow Executor - Orchestrates agent execution

Supports multiple execution modes:
- Sequential: Execute agents one by one
- Parallel: Execute independent agents simultaneously
- Conditional: Skip steps based on conditions
- DAG: Execute with dependency resolution
"""

from typing import Dict, Any, Optional, List, Set
from clarity_sdk.context import WorkflowContext, AgentContext
from clarity_sdk.registry import WorkflowRegistry, AgentRegistry
from clarity_sdk.models import ExecutionMode, AgentResult, WorkflowStep
from clarity_sdk.exceptions import WorkflowError, AgentError
import uuid
from datetime import datetime
import asyncio
import logging

logger = logging.getLogger(__name__)


class WorkflowExecutor:
    """
    Executes workflows by orchestrating agents.

    Handles:
    - Sequential execution (one by one)
    - Parallel execution (all at once)
    - DAG execution (dependency-based)
    - Error handling and retries
    - Conditional step execution
    """

    def __init__(self, max_retries: int = 3, retry_delay: float = 1.0):
        """
        Initialize executor.

        Args:
            max_retries: Maximum retry attempts for failed steps
            retry_delay: Delay between retries in seconds
        """
        self.max_retries = max_retries
        self.retry_delay = retry_delay

    async def execute_workflow(
        self,
        workflow_id: str,
        trigger_data: Dict[str, Any],
        user_id: Optional[str] = None,
        integrations: Optional[Dict[str, Dict[str, Any]]] = None,
        app_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a complete workflow.

        Args:
            workflow_id: ID of workflow to execute
            trigger_data: Data from trigger
            user_id: User ID (optional)
            integrations: User's connected integrations (optional)
            app_config: App configuration (optional)

        Returns:
            Dict with execution results:
            {
                "execution_id": str,
                "workflow_id": str,
                "success": bool,
                "outputs": dict,
                "duration_seconds": float,
                "error": str (optional)
            }

        Raises:
            WorkflowError: If workflow execution fails
        """
        # Get workflow metadata
        metadata = WorkflowRegistry.get_metadata(workflow_id)
        if not metadata:
            raise WorkflowError(f"Workflow not found: {workflow_id}")

        # Create workflow context
        execution_id = str(uuid.uuid4())
        context = WorkflowContext(
            execution_id=execution_id,
            workflow_id=workflow_id,
            trigger_id=None,
            user_id=user_id,
            trigger_data=trigger_data,
            integrations=integrations or {},
            app_config=app_config or {}
        )

        logger.info(f"Starting workflow execution: {workflow_id} (execution_id={execution_id})")

        # Execute based on mode
        try:
            if metadata.execution_mode == ExecutionMode.SEQUENTIAL:
                result = await self._execute_sequential(metadata, context, integrations, app_config)
            elif metadata.execution_mode == ExecutionMode.PARALLEL:
                result = await self._execute_parallel(metadata, context, integrations, app_config)
            elif metadata.execution_mode == ExecutionMode.DAG:
                result = await self._execute_dag(metadata, context, integrations, app_config)
            elif metadata.execution_mode == ExecutionMode.CONDITIONAL:
                result = await self._execute_conditional(metadata, context, integrations, app_config)
            else:
                raise WorkflowError(f"Unsupported execution mode: {metadata.execution_mode}")

            context.mark_completed()

            logger.info(
                f"Workflow execution completed: {workflow_id} "
                f"(duration={context.get_duration_seconds()}s)"
            )

            return {
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "success": True,
                "outputs": context.get_all_outputs(),
                "duration_seconds": context.get_duration_seconds()
            }

        except Exception as e:
            context.log("error", f"Workflow execution failed: {e}")
            logger.error(f"Workflow execution failed: {workflow_id} - {e}")

            return {
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "success": False,
                "outputs": context.get_all_outputs(),
                "duration_seconds": context.get_duration_seconds(),
                "error": str(e)
            }

    async def _execute_sequential(
        self,
        metadata,
        context: WorkflowContext,
        integrations: Optional[Dict],
        app_config: Optional[Dict]
    ):
        """
        Execute steps one by one in order.

        Each step waits for the previous to complete.
        Output from each step can be used as input to next steps.
        """
        context.log("info", f"Executing {len(metadata.steps)} steps sequentially")

        for i, step in enumerate(metadata.steps):
            context.log("info", f"Step {i+1}/{len(metadata.steps)}: {step.agent_id}")

            # Check condition if present
            if step.condition:
                if not self._evaluate_condition(step.condition, context):
                    context.log("info", f"Skipping step {step.agent_id} (condition not met)")
                    continue

            # Execute step with retry
            result = await self._execute_step_with_retry(
                step, context, integrations, app_config
            )

            # Store output
            if step.output_key:
                context.set_step_output(step.output_key, result.data)
                context.log("info", f"Step output stored as '{step.output_key}'")

        return context.get_all_outputs()

    async def _execute_parallel(
        self,
        metadata,
        context: WorkflowContext,
        integrations: Optional[Dict],
        app_config: Optional[Dict]
    ):
        """
        Execute all steps in parallel.

        All steps start simultaneously using asyncio.gather.
        Best for independent steps with no dependencies.
        """
        context.log("info", f"Executing {len(metadata.steps)} steps in parallel")

        # Create tasks for all steps
        tasks = []
        for step in metadata.steps:
            # Check condition
            if step.condition:
                if not self._evaluate_condition(step.condition, context):
                    context.log("info", f"Skipping step {step.agent_id} (condition not met)")
                    continue

            task = self._execute_step_with_retry(
                step, context, integrations, app_config
            )
            tasks.append((step, task))

        # Execute all in parallel
        results = await asyncio.gather(
            *[task for _, task in tasks],
            return_exceptions=True
        )

        # Store outputs
        for (step, _), result in zip(tasks, results):
            if isinstance(result, Exception):
                context.log("error", f"Step {step.agent_id} failed: {result}")
                raise WorkflowError(f"Step {step.agent_id} failed: {result}")

            if step.output_key:
                context.set_step_output(step.output_key, result.data)

        return context.get_all_outputs()

    async def _execute_dag(
        self,
        metadata,
        context: WorkflowContext,
        integrations: Optional[Dict],
        app_config: Optional[Dict]
    ):
        """
        Execute steps as a Directed Acyclic Graph.

        Steps execute as soon as their dependencies are satisfied.
        Provides maximum parallelism while respecting dependencies.

        Algorithm:
        1. Build dependency graph from input_mapping
        2. Topologically sort steps
        3. Execute in waves (all steps with satisfied dependencies)
        """
        context.log("info", f"Executing {len(metadata.steps)} steps as DAG")

        # Build dependency graph
        dependencies = self._build_dependency_graph(metadata.steps)

        # Track completed steps
        completed: Set[str] = set()
        pending = {step.agent_id: step for step in metadata.steps}

        while pending:
            # Find steps with satisfied dependencies
            ready = []
            for agent_id, step in pending.items():
                deps = dependencies.get(agent_id, set())
                if deps.issubset(completed):
                    ready.append(step)

            if not ready:
                # Circular dependency detected
                raise WorkflowError(
                    f"Circular dependency detected. "
                    f"Pending steps: {list(pending.keys())}, "
                    f"Completed steps: {list(completed)}"
                )

            context.log("info", f"Wave: executing {len(ready)} steps in parallel")

            # Execute ready steps in parallel
            tasks = []
            for step in ready:
                # Check condition
                if step.condition:
                    if not self._evaluate_condition(step.condition, context):
                        context.log("info", f"Skipping step {step.agent_id}")
                        completed.add(step.agent_id)
                        del pending[step.agent_id]
                        continue

                task = self._execute_step_with_retry(
                    step, context, integrations, app_config
                )
                tasks.append((step, task))

            # Wait for wave to complete
            results = await asyncio.gather(
                *[task for _, task in tasks],
                return_exceptions=True
            )

            # Process results
            for (step, _), result in zip(tasks, results):
                if isinstance(result, Exception):
                    raise WorkflowError(f"Step {step.agent_id} failed: {result}")

                # Store output
                if step.output_key:
                    context.set_step_output(step.output_key, result.data)

                # Mark completed
                completed.add(step.agent_id)
                del pending[step.agent_id]

        return context.get_all_outputs()

    async def _execute_conditional(
        self,
        metadata,
        context: WorkflowContext,
        integrations: Optional[Dict],
        app_config: Optional[Dict]
    ):
        """
        Execute steps conditionally.

        Similar to sequential but heavily uses conditions.
        Steps can branch based on previous step outputs.
        """
        # For now, just use sequential with condition checking
        return await self._execute_sequential(metadata, context, integrations, app_config)

    async def _execute_step_with_retry(
        self,
        step: WorkflowStep,
        workflow_context: WorkflowContext,
        integrations: Optional[Dict],
        app_config: Optional[Dict]
    ) -> AgentResult:
        """
        Execute a step with retry logic.

        Args:
            step: Workflow step to execute
            workflow_context: Workflow execution context
            integrations: User integrations
            app_config: App configuration

        Returns:
            AgentResult from successful execution

        Raises:
            AgentError: If all retry attempts fail
        """
        last_error = None

        for attempt in range(self.max_retries):
            try:
                result = await self._execute_step(
                    step, workflow_context, integrations, app_config
                )

                if result.success:
                    if attempt > 0:
                        workflow_context.log(
                            "info",
                            f"Step {step.agent_id} succeeded on attempt {attempt + 1}"
                        )
                    return result
                else:
                    # Agent returned failure
                    last_error = result.error or "Unknown error"
                    workflow_context.log(
                        "warning",
                        f"Step {step.agent_id} failed (attempt {attempt + 1}): {last_error}"
                    )

            except Exception as e:
                last_error = str(e)
                workflow_context.log(
                    "warning",
                    f"Step {step.agent_id} error (attempt {attempt + 1}): {e}"
                )

            # Wait before retry (except on last attempt)
            if attempt < self.max_retries - 1:
                await asyncio.sleep(self.retry_delay * (2 ** attempt))  # Exponential backoff

        # All retries failed
        raise AgentError(
            f"Agent {step.agent_id} failed after {self.max_retries} attempts. "
            f"Last error: {last_error}"
        )

    async def _execute_step(
        self,
        step: WorkflowStep,
        workflow_context: WorkflowContext,
        integrations: Optional[Dict],
        app_config: Optional[Dict]
    ) -> AgentResult:
        """
        Execute a single workflow step (one agent).

        Args:
            step: Workflow step definition
            workflow_context: Workflow execution context
            integrations: User integrations
            app_config: App configuration

        Returns:
            AgentResult from agent execution

        Raises:
            AgentError: If agent execution fails
        """
        # Get agent
        agent_class = AgentRegistry.get_agent(step.agent_id)
        if not agent_class:
            raise AgentError(f"Agent not found: {step.agent_id}")

        # Prepare input data
        input_data = self._map_inputs(step, workflow_context)

        # Create agent context
        agent_context = AgentContext(
            execution_id=workflow_context.execution_id,
            agent_id=step.agent_id,
            workflow_id=workflow_context.workflow_id,
            trigger_id=workflow_context.trigger_id,
            user_id=workflow_context.user_id,
            input_data=input_data,
            integrations=integrations or {},
            workflow_data=workflow_context.get_all_outputs(),
            app_config=app_config or {}
        )

        # Execute agent
        agent = agent_class()

        try:
            # Call before hook
            await agent.before_execute(agent_context)

            # Validate input if method exists
            if hasattr(agent, 'validate_input'):
                if not agent.validate_input(agent_context):
                    raise AgentError(f"Input validation failed for agent {step.agent_id}")

            # Execute
            result = await agent.execute(agent_context)

            # Call after hook
            await agent.after_execute(agent_context, result)

            return result

        except Exception as e:
            # Call error hook if exists
            if hasattr(agent, 'on_error'):
                await agent.on_error(agent_context, e)

            raise AgentError(f"Agent {step.agent_id} execution failed: {e}")

    def _map_inputs(self, step: WorkflowStep, context: WorkflowContext) -> Dict[str, Any]:
        """
        Map workflow data to agent inputs.

        Takes output from previous steps and maps it to agent input parameters.

        Args:
            step: Workflow step with input_mapping
            context: Workflow context with step outputs

        Returns:
            Dict of agent input parameters
        """
        if not step.input_mapping:
            # No mapping, use trigger data
            return context.trigger_data

        mapped = {}
        for agent_input_key, workflow_data_key in step.input_mapping.items():
            if workflow_data_key:
                # Get data from previous step output
                value = context.get_step_output(workflow_data_key)
                if value is not None:
                    mapped[agent_input_key] = value

        return mapped

    def _evaluate_condition(self, condition: str, context: WorkflowContext) -> bool:
        """
        Evaluate condition expression.

        Conditions are simple expressions like:
        - "step1.success == true"
        - "step1.data.count > 10"
        - "step1.data.status == 'completed'"

        Args:
            condition: Condition expression string
            context: Workflow context with step outputs

        Returns:
            True if condition is met, False otherwise

        Security Note:
            This uses a safe evaluation approach.
            For production, consider using a proper expression evaluator.
        """
        try:
            # For now, simple implementation
            # In production, use a safe expression evaluator like simpleeval

            # Get all step outputs
            outputs = context.get_all_outputs()

            # Create safe namespace
            namespace = {
                'outputs': outputs,
                'trigger_data': context.trigger_data
            }

            # Simple eval (SECURITY: This should be replaced with safe evaluator)
            # For now, just return True if the condition string is not empty
            # TODO: Implement safe expression evaluation

            return True  # Placeholder - implement proper evaluation

        except Exception as e:
            logger.warning(f"Condition evaluation failed: {condition} - {e}")
            return False

    def _build_dependency_graph(self, steps: List[WorkflowStep]) -> Dict[str, Set[str]]:
        """
        Build dependency graph from workflow steps.

        Analyzes input_mapping to determine which steps depend on which.

        Args:
            steps: List of workflow steps

        Returns:
            Dict mapping agent_id to set of agent_ids it depends on
        """
        dependencies: Dict[str, Set[str]] = {}

        for step in steps:
            deps = set()

            if step.input_mapping:
                # Input mapping: {"agent_input": "previous_step_output"}
                # Extract previous step names from values
                for workflow_data_key in step.input_mapping.values():
                    if workflow_data_key:
                        # workflow_data_key is the output_key from previous step
                        # Find which agent produced this output
                        for other_step in steps:
                            if other_step.output_key == workflow_data_key:
                                deps.add(other_step.agent_id)

            dependencies[step.agent_id] = deps

        return dependencies
