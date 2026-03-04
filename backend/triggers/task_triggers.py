"""
Task Management Trigger Templates

Demonstrates user-configurable triggers where:
- Developer defines the TEMPLATE with config_fields
- User creates INSTANCES with their own values
- System loads from database and schedules dynamically

Example: Developer defines "daily review possible", User A configures "9am EST", User B configures "6pm PST"
"""

from clarity_sdk import trigger_template, TriggerTemplateType
import logging

logger = logging.getLogger(__name__)


@trigger_template(
    id="daily-task-review",
    name="Daily Task Review",
    description="Review your pending tasks at a scheduled time each day",
    template_type=TriggerTemplateType.SCHEDULE_DAILY,
    workflow_id="task-review-workflow",
    category="productivity",
    config_fields=[
        {
            "key": "time",
            "label": "What time should we review your tasks?",
            "type": "time",
            "required": True,
            "default": "09:00",
            "validation": {
                "format": "HH:MM"
            }
        },
        {
            "key": "timezone",
            "label": "Your timezone",
            "type": "timezone",
            "required": True,
            "default": "America/New_York",
            "validation": {}
        },
        {
            "key": "days_of_week",
            "label": "Which days?",
            "type": "multiselect",
            "required": False,
            "default": ["monday", "tuesday", "wednesday", "thursday", "friday"],
            "options": [
                {"value": "monday", "label": "Monday"},
                {"value": "tuesday", "label": "Tuesday"},
                {"value": "wednesday", "label": "Wednesday"},
                {"value": "thursday", "label": "Thursday"},
                {"value": "friday", "label": "Friday"},
                {"value": "saturday", "label": "Saturday"},
                {"value": "sunday", "label": "Sunday"}
            ]
        }
    ],
    max_instances_per_user=3  # Users can create up to 3 different daily reviews
)
class DailyTaskReviewTrigger:
    """
    User-configurable daily task review trigger.

    Example user configurations:
    - User A: 9:00 AM EST, Mon-Fri
    - User B: 6:00 PM PST, Mon-Sat
    - User C: 12:00 PM UTC, Every day

    The platform will:
    1. Generate UI from config_fields
    2. Store user's values in UserTriggerInstance.config
    3. Load from database and schedule dynamically
    """
    pass


@trigger_template(
    id="task-deadline-reminder",
    name="Task Deadline Reminder",
    description="Get notified before task deadlines",
    template_type=TriggerTemplateType.SCHEDULE_INTERVAL,
    workflow_id="task-notification-workflow",
    category="productivity",
    config_fields=[
        {
            "key": "check_interval_minutes",
            "label": "How often should we check for upcoming deadlines?",
            "type": "select",
            "required": True,
            "default": 60,
            "options": [
                {"value": 15, "label": "Every 15 minutes"},
                {"value": 30, "label": "Every 30 minutes"},
                {"value": 60, "label": "Every hour"},
                {"value": 120, "label": "Every 2 hours"},
                {"value": 240, "label": "Every 4 hours"}
            ]
        },
        {
            "key": "advance_notice_hours",
            "label": "How many hours before deadline should we notify you?",
            "type": "number",
            "required": True,
            "default": 24,
            "validation": {
                "min": 1,
                "max": 168  # 1 week
            }
        },
        {
            "key": "priority_filter",
            "label": "Only notify for tasks with priority:",
            "type": "multiselect",
            "required": False,
            "default": ["high", "urgent"],
            "options": [
                {"value": "low", "label": "Low"},
                {"value": "medium", "label": "Medium"},
                {"value": "high", "label": "High"},
                {"value": "urgent", "label": "Urgent"}
            ]
        }
    ],
    max_instances_per_user=5
)
class TaskDeadlineReminderTrigger:
    """
    Interval-based trigger that checks for upcoming task deadlines.

    Example configurations:
    - User A: Check every hour, notify 24 hours before, high + urgent only
    - User B: Check every 15 minutes, notify 2 hours before, all priorities

    The DynamicTriggerManager will:
    1. Schedule interval job based on check_interval_minutes
    2. Pass config to workflow (advance_notice_hours, priority_filter)
    3. Workflow queries tasks and sends notifications
    """
    pass


@trigger_template(
    id="task-created-webhook",
    name="New Task Created",
    description="Triggered when a new task is created",
    template_type=TriggerTemplateType.WEBHOOK,
    workflow_id="task-notification-workflow",
    category="automation",
    config_fields=[
        {
            "key": "notify_via_email",
            "label": "Send email notification?",
            "type": "boolean",
            "required": False,
            "default": True
        },
        {
            "key": "email_recipients",
            "label": "Email recipients (comma-separated)",
            "type": "text",
            "required": False,
            "default": "",
            "validation": {
                "pattern": r"^[\w\.\-]+@[\w\.\-]+(\,\s*[\w\.\-]+@[\w\.\-]+)*$"
            }
        },
        {
            "key": "filter_by_priority",
            "label": "Only trigger for tasks with priority:",
            "type": "select",
            "required": False,
            "default": "all",
            "options": [
                {"value": "all", "label": "All tasks"},
                {"value": "high", "label": "High priority and above"},
                {"value": "urgent", "label": "Urgent only"}
            ]
        }
    ],
    max_instances_per_user=10
)
class TaskCreatedWebhookTrigger:
    """
    Webhook trigger for task creation events.

    Example configurations:
    - User A: Email to team@company.com, only urgent tasks
    - User B: Email to manager@company.com, high priority and above

    The webhook endpoint will:
    1. Receive POST /webhooks/task-created
    2. Match against user instances with this template
    3. Check filter_by_priority config
    4. Execute workflow if conditions met
    """
    pass


# Additional example: Data threshold trigger
@trigger_template(
    id="high-task-count-alert",
    name="High Task Count Alert",
    description="Alert when pending task count exceeds threshold",
    template_type=TriggerTemplateType.DATA_THRESHOLD,
    workflow_id="task-notification-workflow",
    category="monitoring",
    config_fields=[
        {
            "key": "threshold",
            "label": "Alert when pending tasks exceed:",
            "type": "number",
            "required": True,
            "default": 20,
            "validation": {
                "min": 5,
                "max": 1000
            }
        },
        {
            "key": "check_interval_minutes",
            "label": "Check interval",
            "type": "select",
            "required": True,
            "default": 60,
            "options": [
                {"value": 30, "label": "Every 30 minutes"},
                {"value": 60, "label": "Every hour"},
                {"value": 120, "label": "Every 2 hours"},
                {"value": 240, "label": "Every 4 hours"}
            ]
        },
        {
            "key": "cooldown_hours",
            "label": "Wait this long before alerting again:",
            "type": "number",
            "required": False,
            "default": 4,
            "validation": {
                "min": 1,
                "max": 24
            }
        }
    ],
    max_instances_per_user=3
)
class HighTaskCountAlertTrigger:
    """
    Data threshold trigger for high task counts.

    Example configurations:
    - User A: Alert when > 20 tasks, check hourly, cooldown 4 hours
    - User B: Alert when > 50 tasks, check every 2 hours, cooldown 12 hours

    The DynamicTriggerManager will:
    1. Schedule interval job to check data
    2. Query pending task count
    3. Compare against threshold
    4. Respect cooldown period
    5. Execute workflow if threshold exceeded
    """
    pass
