"""
Trigger template decorator for user-configurable triggers

The @trigger_template decorator defines templates that users can configure
to create their own trigger instances.

Example:
    from clarity_sdk import trigger_template, TriggerTemplateType

    @trigger_template(
        id="daily-review",
        name="Daily Task Review",
        description="Review your tasks at a specific time each day",
        template_type=TriggerTemplateType.SCHEDULE_DAILY,
        workflow_id="task-review-workflow",
        config_fields=[
            {"key": "time", "label": "Time", "type": "time", "default": "09:00"},
            {"key": "timezone", "label": "Timezone", "type": "timezone"}
        ]
    )
    class DailyReviewTrigger:
        pass
"""

from typing import Dict, Any, List, Optional
from clarity_sdk.models import TriggerTemplate, TriggerTemplateType, ConfigField
from clarity_sdk.registry import TriggerTemplateRegistry
from clarity_sdk.exceptions import ValidationError


def trigger_template(
    id: str,
    name: str,
    description: str,
    template_type: TriggerTemplateType,
    workflow_id: str,
    config_fields: List[Dict[str, Any]],
    category: str = "automation",
    icon: Optional[str] = None,
    max_instances_per_user: Optional[int] = None,
    requires_premium: bool = False
):
    """
    Decorator to define a trigger template.

    Users will create instances of this template with their own configuration.

    Developer defines WHAT triggers are possible.
    Users configure WHEN/HOW they want them to run.

    Args:
        id: Unique template identifier
        name: User-facing name
        description: What this trigger does
        template_type: Type of trigger (schedule, data, webhook, etc)
        workflow_id: Which workflow to execute when triggered
        config_fields: List of fields users can configure
        category: Category for organization (default: "automation")
        icon: Icon identifier (optional)
        max_instances_per_user: Limit how many instances per user (optional)
        requires_premium: Premium feature flag (default: False)

    Returns:
        Decorated class with trigger template metadata

    Raises:
        ValidationError: If template definition is invalid

    Example - Daily Schedule:
        @trigger_template(
            id="daily-task-review",
            name="Daily Task Review",
            description="Review your tasks at a specific time each day",
            template_type=TriggerTemplateType.SCHEDULE_DAILY,
            workflow_id="task-review-workflow",
            config_fields=[
                {
                    "key": "time",
                    "label": "What time?",
                    "type": "time",
                    "required": True,
                    "default": "09:00",
                    "help_text": "Choose when to review your tasks"
                },
                {
                    "key": "timezone",
                    "label": "Your Timezone",
                    "type": "timezone",
                    "required": True,
                    "default": "UTC"
                },
                {
                    "key": "days",
                    "label": "Which days?",
                    "type": "multiselect",
                    "options": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                    "default": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
                }
            ],
            max_instances_per_user=5
        )
        class DailyTaskReviewTrigger:
            pass

    Example - Custom Cron:
        @trigger_template(
            id="custom-schedule",
            name="Custom Schedule",
            description="Advanced: Define your own cron expression",
            template_type=TriggerTemplateType.SCHEDULE_CRON,
            workflow_id="task-review-workflow",
            config_fields=[
                {
                    "key": "cron_expression",
                    "label": "Cron Expression",
                    "type": "cron",
                    "required": True,
                    "help_text": "Use cron syntax (e.g., '0 9 * * 1-5' for weekdays at 9am)",
                    "validation": {"pattern": "cron"}
                },
                {
                    "key": "timezone",
                    "label": "Timezone",
                    "type": "timezone",
                    "required": True,
                    "default": "UTC"
                }
            ],
            requires_premium=True
        )
        class CustomScheduleTrigger:
            pass

    Example - Data Threshold:
        @trigger_template(
            id="task-overload-alert",
            name="Task Overload Alert",
            description="Get notified when you have too many pending tasks",
            template_type=TriggerTemplateType.DATA_THRESHOLD,
            workflow_id="overload-notification-workflow",
            config_fields=[
                {
                    "key": "threshold",
                    "label": "How many pending tasks?",
                    "type": "number",
                    "required": True,
                    "default": 20,
                    "validation": {"min": 1, "max": 1000},
                    "help_text": "Alert when pending tasks exceed this number"
                },
                {
                    "key": "check_interval",
                    "label": "Check every",
                    "type": "select",
                    "options": [
                        {"value": 300, "label": "5 minutes"},
                        {"value": 900, "label": "15 minutes"},
                        {"value": 3600, "label": "1 hour"}
                    ],
                    "default": 900
                }
            ]
        )
        class TaskOverloadAlertTrigger:
            pass

    Example - Webhook:
        @trigger_template(
            id="external-webhook",
            name="External Webhook",
            description="Trigger workflow when external service calls your webhook",
            template_type=TriggerTemplateType.WEBHOOK,
            workflow_id="external-data-processor",
            config_fields=[
                {
                    "key": "webhook_secret",
                    "label": "Webhook Secret",
                    "type": "secret",
                    "required": True,
                    "help_text": "Secret key for webhook validation (auto-generated)"
                },
                {
                    "key": "allowed_ips",
                    "label": "Allowed IP Addresses (optional)",
                    "type": "text",
                    "required": False,
                    "help_text": "Comma-separated IPs that can trigger this webhook"
                }
            ]
        )
        class ExternalWebhookTrigger:
            pass

    User Experience:
        1. User sees template in platform UI
        2. User clicks "Create Trigger"
        3. Dynamic form generated from config_fields
        4. User configures their values (time, threshold, etc)
        5. User saves - trigger instance created in database
        6. Platform loads trigger at runtime
        7. Trigger fires workflow when conditions met
    """

    def decorator(cls):
        # Parse config fields
        try:
            field_objs = [ConfigField(**field) for field in config_fields]
        except Exception as e:
            raise ValidationError(f"Invalid config field in trigger template {id}: {e}")

        # Validate at least one config field
        if not field_objs:
            raise ValidationError(
                f"Trigger template {id} must have at least one config field. "
                f"Even manual triggers should have an 'enabled' field."
            )

        # Create template
        try:
            template = TriggerTemplate(
                id=id,
                name=name,
                description=description,
                template_type=template_type,
                workflow_id=workflow_id,
                config_fields=field_objs,
                category=category,
                icon=icon,
                max_instances_per_user=max_instances_per_user,
                requires_premium=requires_premium
            )
        except Exception as e:
            raise ValidationError(f"Invalid trigger template metadata for {id}: {e}")

        # Store metadata on class
        cls._clarity_template = template
        cls._clarity_type = "trigger_template"

        # Register template
        TriggerTemplateRegistry.register(template)

        # Add helper method
        cls.get_template = classmethod(lambda c: template)

        return cls

    return decorator


# Re-export TriggerTemplateType for convenience
__all__ = ["trigger_template", "TriggerTemplateType"]
