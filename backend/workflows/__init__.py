"""
Example Workflow Definitions

Import all workflows here to register them on application startup.
"""

from backend.workflows.task_management import task_review_workflow, task_notification_workflow

__all__ = [
    "task_review_workflow",
    "task_notification_workflow"
]
