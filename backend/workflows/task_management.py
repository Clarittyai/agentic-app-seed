"""
Task Management Workflows

Example workflows demonstrating agent chaining and execution.
"""

from clarity_sdk import workflow, uses_agent, WorkflowContext, ExecutionMode
import logging

logger = logging.getLogger(__name__)


@workflow(
    id="task-review-workflow",
    name="Daily Task Review",
    description="Analyzes pending tasks and provides prioritized recommendations",
    execution_mode=ExecutionMode.SEQUENTIAL
)
@uses_agent("task-analyzer", output_key="analysis")
async def task_review_workflow(context: WorkflowContext):
    """
    Daily workflow to review and prioritize tasks.

    This workflow:
    1. Analyzes each pending task
    2. Provides priority and duration estimates
    3. Suggests optimal scheduling

    Triggered by: daily-task-review trigger template
    """
    context.log("info", "Starting daily task review workflow")

    # The @uses_agent decorator automatically executes the task-analyzer agent
    # Results will be available in context.get_step_result("analysis")

    # In production, you can add custom logic here
    # For now, the decorator handles execution

    context.log("info", "Task review complete")


@workflow(
    id="task-notification-workflow",
    name="Task Notification Workflow",
    description="Analyzes a task and sends email notification",
    execution_mode=ExecutionMode.SEQUENTIAL
)
@uses_agent("task-analyzer", output_key="task_analysis")
@uses_agent("email-composer", output_key="email_result", input_from="task_analysis")
async def task_notification_workflow(context: WorkflowContext):
    """
    Workflow that analyzes a task and sends notification email.

    This workflow:
    1. Analyzes task using task-analyzer
    2. Composes notification email using email-composer
    3. Sends email to stakeholders

    Demonstrates chaining agents where output of first feeds into second.

    Triggered by: task-created trigger template or manual execution
    """
    context.log("info", "Starting task notification workflow")

    # Step 1: Task analysis (handled by @uses_agent decorator)
    # task_analysis = context.get_step_result("task_analysis")

    # Step 2: Email composition (handled by @uses_agent decorator)
    # email_result = context.get_step_result("email_result")

    context.log("info", "Task notification workflow complete")


# Additional example: Parallel execution workflow
@workflow(
    id="multi-channel-notification",
    name="Multi-Channel Notification",
    description="Sends notifications via multiple channels simultaneously",
    execution_mode=ExecutionMode.PARALLEL
)
@uses_agent("email-composer", output_key="email")
# @uses_agent("slack-notifier", output_key="slack")  # Could add more agents
# @uses_agent("sms-sender", output_key="sms")
async def multi_channel_notification_workflow(context: WorkflowContext):
    """
    Sends notifications via multiple channels in parallel.

    Demonstrates parallel execution mode where agents run simultaneously
    for better performance.

    Execution mode: PARALLEL
    """
    context.log("info", "Starting multi-channel notification")

    # All agents execute in parallel
    # Results available after all complete

    context.log("info", "Multi-channel notification complete")
