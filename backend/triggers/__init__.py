"""
Example Trigger Templates

Import all trigger templates here to register them on application startup.
"""

from backend.triggers.task_triggers import (
    DailyTaskReviewTrigger,
    TaskDeadlineReminderTrigger,
    TaskCreatedWebhookTrigger
)

__all__ = [
    "DailyTaskReviewTrigger",
    "TaskDeadlineReminderTrigger",
    "TaskCreatedWebhookTrigger"
]
