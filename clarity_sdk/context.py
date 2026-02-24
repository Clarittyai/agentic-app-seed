"""
Context objects provided to agents and workflows during execution

These objects provide access to:
- Input data
- Integration credentials
- Workflow state
- Configuration
- Logging
"""

from typing import Dict, Any, Optional
from datetime import datetime
import uuid
import logging


class AgentContext:
    """
    Context provided to agents during execution.
    Contains all necessary data and integrations.

    Example:
        async def execute(self, context: AgentContext):
            # Get input
            tasks = context.get_input("tasks", [])

            # Get integration
            slack = context.get_integration("slack")

            # Get workflow data
            previous_data = context.get_workflow_data("previous_step")

            # Log
            context.log("info", f"Processing {len(tasks)} tasks")
    """

    def __init__(
        self,
        execution_id: str,
        agent_id: str,
        workflow_id: Optional[str],
        trigger_id: Optional[str],
        user_id: Optional[str],
        input_data: Dict[str, Any],
        integrations: Dict[str, Dict[str, Any]],
        workflow_data: Dict[str, Any],
        app_config: Dict[str, Any]
    ):
        self.execution_id = execution_id
        self.agent_id = agent_id
        self.workflow_id = workflow_id
        self.trigger_id = trigger_id
        self.user_id = user_id
        self._input_data = input_data
        self._integrations = integrations
        self._workflow_data = workflow_data
        self._app_config = app_config
        self.started_at = datetime.utcnow()

        # Set up logger
        self.logger = logging.getLogger(f"clarity.agent.{agent_id}")

    def get_input(self, key: str, default: Any = None) -> Any:
        """
        Get input data for this agent.

        Args:
            key: Input key
            default: Default value if key not found

        Returns:
            Input value or default
        """
        return self._input_data.get(key, default)

    def get_all_inputs(self) -> Dict[str, Any]:
        """Get all input data"""
        return self._input_data.copy()

    def get_integration(self, service: str) -> Optional[Dict[str, Any]]:
        """
        Get connected integration credentials.

        Platform provides these credentials after user connects their account.

        Args:
            service: Service identifier (slack, google-sheets, etc)

        Returns:
            Integration credentials dict or None if not connected

        Example:
            slack = context.get_integration("slack")
            if slack:
                bot_token = slack["bot_token"]
            else:
                return AgentResult(success=False, error="Slack not connected")
        """
        return self._integrations.get(service)

    def get_all_integrations(self) -> Dict[str, Dict[str, Any]]:
        """Get all connected integrations"""
        return self._integrations.copy()

    def get_workflow_data(self, key: str, default: Any = None) -> Any:
        """
        Get data from previous workflow steps.

        Args:
            key: Data key (usually output_key from previous step)
            default: Default value if key not found

        Returns:
            Workflow data or default
        """
        return self._workflow_data.get(key, default)

    def get_all_workflow_data(self) -> Dict[str, Any]:
        """Get all workflow data"""
        return self._workflow_data.copy()

    def get_config(self, key: str, default: Any = None) -> Any:
        """
        Get app configuration value.

        Args:
            key: Config key
            default: Default value if key not found

        Returns:
            Config value or default
        """
        return self._app_config.get(key, default)

    def log(self, level: str, message: str, **kwargs):
        """
        Log message with context.

        Args:
            level: Log level (debug, info, warning, error)
            message: Log message
            **kwargs: Additional context

        Example:
            context.log("info", "Processing tasks", count=len(tasks))
        """
        log_method = getattr(self.logger, level.lower(), self.logger.info)
        log_method(
            message,
            extra={
                "execution_id": self.execution_id,
                "agent_id": self.agent_id,
                "workflow_id": self.workflow_id,
                "user_id": self.user_id,
                **kwargs
            }
        )


class WorkflowContext:
    """
    Context for workflow execution.
    Tracks data flow between agents.

    Example:
        async def my_workflow(context: WorkflowContext):
            # Get trigger data
            trigger_data = context.get_trigger_data()

            # Access step outputs
            analysis = context.get_step_output("analysis")

            # Custom logic
            context.log("info", "Workflow processing")
    """

    def __init__(
        self,
        execution_id: str,
        workflow_id: str,
        trigger_id: Optional[str],
        user_id: Optional[str],
        trigger_data: Dict[str, Any],
        integrations: Dict[str, Dict[str, Any]],
        app_config: Dict[str, Any]
    ):
        self.execution_id = execution_id
        self.workflow_id = workflow_id
        self.trigger_id = trigger_id
        self.user_id = user_id
        self._trigger_data = trigger_data
        self._integrations = integrations
        self._app_config = app_config
        self._step_outputs: Dict[str, Any] = {}
        self.started_at = datetime.utcnow()
        self.completed_at: Optional[datetime] = None

        # Set up logger
        self.logger = logging.getLogger(f"clarity.workflow.{workflow_id}")

    def get_trigger_data(self) -> Dict[str, Any]:
        """Get data from trigger that started this workflow"""
        return self._trigger_data.copy()

    def set_step_output(self, step_key: str, output: Any):
        """
        Store output from a workflow step.

        Called internally by workflow executor.

        Args:
            step_key: Step identifier (usually output_key from @uses_agent)
            output: Output data from step
        """
        self._step_outputs[step_key] = output

    def get_step_output(self, step_key: str, default: Any = None) -> Any:
        """
        Get output from a previous step.

        Args:
            step_key: Step identifier
            default: Default value if key not found

        Returns:
            Step output or default
        """
        return self._step_outputs.get(step_key, default)

    def get_all_outputs(self) -> Dict[str, Any]:
        """Get all step outputs"""
        return self._step_outputs.copy()

    def get_integration(self, service: str) -> Optional[Dict[str, Any]]:
        """
        Get connected integration credentials.

        Args:
            service: Service identifier

        Returns:
            Integration credentials or None
        """
        return self._integrations.get(service)

    def get_config(self, key: str, default: Any = None) -> Any:
        """
        Get app configuration value.

        Args:
            key: Config key
            default: Default value

        Returns:
            Config value or default
        """
        return self._app_config.get(key, default)

    def log(self, level: str, message: str, **kwargs):
        """
        Log message with context.

        Args:
            level: Log level
            message: Log message
            **kwargs: Additional context
        """
        log_method = getattr(self.logger, level.lower(), self.logger.info)
        log_method(
            message,
            extra={
                "execution_id": self.execution_id,
                "workflow_id": self.workflow_id,
                "trigger_id": self.trigger_id,
                "user_id": self.user_id,
                **kwargs
            }
        )

    def mark_completed(self):
        """Mark workflow as completed"""
        self.completed_at = datetime.utcnow()

    def get_duration_seconds(self) -> Optional[float]:
        """Get workflow duration in seconds"""
        if self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
