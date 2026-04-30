"""
Example Trigger - Daily Review

This is a MINIMAL example to demonstrate:
- How to create a trigger template with @trigger_template decorator
- User-configurable fields (time, timezone, preferences)
- Different trigger types (schedule, interval, webhook, data threshold)
- How the platform generates UI from config_fields

REPLACE THIS with your own trigger!

Key Concept:
- YOU define the TEMPLATE with config_fields
- USERS create INSTANCES with their own values
- PLATFORM loads from database and schedules dynamically

Example: You define "daily review", User A sets "9am EST", User B sets "6pm PST"
"""

from clarity_sdk import trigger_template, TriggerTemplateType
import logging

logger = logging.getLogger(__name__)


@trigger_template(
    id="example-trigger",
    name="Example Daily Trigger",
    description="Runs your workflow at a scheduled time each day (replace with your trigger)",
    template_type=TriggerTemplateType.SCHEDULE_DAILY,
    workflow_id="example-workflow",  # Links to your workflow
    category="productivity",
    config_fields=[
        {
            "key": "time",
            "label": "What time should this run?",
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
    max_instances_per_user=3  # Users can create up to 3 different schedules
)
class ExampleTrigger:
    """
    User-configurable daily trigger template.

    Example user configurations:
    - User A: 9:00 AM EST, Mon-Fri
    - User B: 6:00 PM PST, Mon-Sat
    - User C: 12:00 PM UTC, Every day

    The platform will:
    1. Generate UI from config_fields (time picker, timezone selector, day checkboxes)
    2. Store user's values in UserTriggerInstance.config database table
    3. Load from database and schedule dynamically
    4. Execute your workflow at the configured time

    TODO: Replace with your own trigger logic!
    """
    pass


# Additional trigger type examples (commented out - uncomment to use)

"""
# Example: Interval trigger (runs every X minutes/hours)
@trigger_template(
    id="interval-trigger-example",
    name="Interval Trigger Example",
    description="Runs every X minutes",
    template_type=TriggerTemplateType.SCHEDULE_INTERVAL,
    workflow_id="example-workflow",
    config_fields=[
        {
            "key": "interval_minutes",
            "label": "Run every:",
            "type": "select",
            "required": True,
            "default": 60,
            "options": [
                {"value": 15, "label": "15 minutes"},
                {"value": 30, "label": "30 minutes"},
                {"value": 60, "label": "1 hour"},
                {"value": 120, "label": "2 hours"}
            ]
        }
    ]
)
class IntervalTriggerExample:
    pass


# Example: Webhook trigger (triggered by external HTTP POST)
@trigger_template(
    id="webhook-trigger-example",
    name="Webhook Trigger Example",
    description="Triggered by external event",
    template_type=TriggerTemplateType.WEBHOOK,
    workflow_id="example-workflow",
    config_fields=[
        {
            "key": "notify_via_email",
            "label": "Send email notification?",
            "type": "boolean",
            "required": False,
            "default": True
        },
        {
            "key": "filter_priority",
            "label": "Only trigger for:",
            "type": "select",
            "required": False,
            "default": "all",
            "options": [
                {"value": "all", "label": "All events"},
                {"value": "high", "label": "High priority only"},
                {"value": "urgent", "label": "Urgent only"}
            ]
        }
    ]
)
class WebhookTriggerExample:
    # Webhook endpoint will be: POST /webhooks/{your-app-id}/webhook-trigger-example
    # Platform automatically creates endpoint
    # User instances can filter based on config_fields
    pass


# Example: Data threshold trigger (triggered when data exceeds threshold)
@trigger_template(
    id="threshold-trigger-example",
    name="Data Threshold Trigger Example",
    description="Alert when data exceeds threshold",
    template_type=TriggerTemplateType.DATA_THRESHOLD,
    workflow_id="example-workflow",
    config_fields=[
        {
            "key": "threshold",
            "label": "Alert when count exceeds:",
            "type": "number",
            "required": True,
            "default": 20,
            "validation": {
                "min": 1,
                "max": 1000
            }
        },
        {
            "key": "check_interval_minutes",
            "label": "Check every:",
            "type": "select",
            "required": True,
            "default": 60,
            "options": [
                {"value": 30, "label": "30 minutes"},
                {"value": 60, "label": "1 hour"},
                {"value": 120, "label": "2 hours"}
            ]
        }
    ]
)
class ThresholdTriggerExample:
    # Platform schedules interval job to check data
    # Compares against threshold
    # Executes workflow if threshold exceeded
    pass
"""
