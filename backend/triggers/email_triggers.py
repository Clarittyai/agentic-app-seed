"""
Email Monitoring Trigger Templates

User-configurable triggers for email monitoring.
Users can set their own schedules and preferences.
"""

from clarity_sdk import trigger_template, TriggerTemplateType
import logging

logger = logging.getLogger(__name__)


@trigger_template(
    id="scheduled-email-check",
    name="Scheduled Email Check",
    description="Check your email at regular intervals and get notified about important messages",
    template_type=TriggerTemplateType.SCHEDULE_INTERVAL,
    workflow_id="email-monitoring-workflow",
    category="email",
    config_fields=[
        {
            "key": "check_interval_minutes",
            "label": "How often should I check your email?",
            "type": "select",
            "required": True,
            "default": 30,
            "options": [
                {"value": 5, "label": "Every 5 minutes (very frequent)"},
                {"value": 15, "label": "Every 15 minutes (frequent)"},
                {"value": 30, "label": "Every 30 minutes (balanced)"},
                {"value": 60, "label": "Every hour (moderate)"},
                {"value": 120, "label": "Every 2 hours (low frequency)"},
                {"value": 240, "label": "Every 4 hours (minimal)"}
            ],
            "validation": {
                "min": 5,
                "max": 1440  # Max 24 hours
            }
        },
        {
            "key": "quiet_hours_enabled",
            "label": "Enable quiet hours (don't notify during specific times)?",
            "type": "boolean",
            "required": False,
            "default": True
        },
        {
            "key": "quiet_hours_start",
            "label": "Quiet hours start time",
            "type": "time",
            "required": False,
            "default": "22:00",
            "validation": {
                "format": "HH:MM"
            }
        },
        {
            "key": "quiet_hours_end",
            "label": "Quiet hours end time",
            "type": "time",
            "required": False,
            "default": "08:00",
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
            "key": "importance_threshold",
            "label": "Only notify for emails with importance score above",
            "type": "number",
            "required": False,
            "default": 70,
            "validation": {
                "min": 0,
                "max": 100
            }
        },
        {
            "key": "max_emails_per_check",
            "label": "Maximum emails to check per run",
            "type": "number",
            "required": False,
            "default": 50,
            "validation": {
                "min": 10,
                "max": 200
            }
        },
        {
            "key": "notification_channels",
            "label": "How should I notify you?",
            "type": "multiselect",
            "required": False,
            "default": ["email"],
            "options": [
                {"value": "email", "label": "Email notification"},
                {"value": "slack", "label": "Slack message"},
                {"value": "webhook", "label": "Custom webhook"}
            ]
        }
    ],
    max_instances_per_user=1  # Only one active schedule per user
)
class ScheduledEmailCheckTrigger:
    """
    Interval-based trigger for scheduled email monitoring.

    Example user configurations:
    - User A: Check every 30 min, quiet hours 10pm-8am EST, notify via email
    - User B: Check every 15 min, no quiet hours, notify via Slack
    - User C: Check every 2 hours, quiet hours 11pm-7am PST, notify via email + Slack

    The DynamicTriggerManager will:
    1. Schedule interval job based on check_interval_minutes
    2. Respect quiet hours (skip execution if current time is in quiet hours)
    3. Pass config to workflow (importance_threshold, max_emails, etc.)
    4. Workflow executes and sends notifications
    """
    pass


@trigger_template(
    id="importance-threshold-trigger",
    name="High-Importance Email Alert",
    description="Get immediately alerted when a critical or high-priority email arrives",
    template_type=TriggerTemplateType.DATA_THRESHOLD,
    workflow_id="email-monitoring-workflow",
    category="email",
    config_fields=[
        {
            "key": "check_interval_minutes",
            "label": "How often to check for high-priority emails",
            "type": "select",
            "required": True,
            "default": 5,
            "options": [
                {"value": 1, "label": "Every minute (real-time)"},
                {"value": 5, "label": "Every 5 minutes (very frequent)"},
                {"value": 10, "label": "Every 10 minutes (frequent)"},
                {"value": 15, "label": "Every 15 minutes (moderate)"}
            ]
        },
        {
            "key": "importance_threshold",
            "label": "Alert only when importance score is above",
            "type": "number",
            "required": True,
            "default": 85,
            "validation": {
                "min": 70,
                "max": 100
            }
        },
        {
            "key": "urgency_filter",
            "label": "Alert for these urgency levels",
            "type": "multiselect",
            "required": False,
            "default": ["high", "critical"],
            "options": [
                {"value": "medium", "label": "Medium urgency"},
                {"value": "high", "label": "High urgency"},
                {"value": "critical", "label": "Critical urgency"}
            ]
        },
        {
            "key": "notification_channels",
            "label": "How to alert you (supports multiple)",
            "type": "multiselect",
            "required": False,
            "default": ["email", "slack"],
            "options": [
                {"value": "email", "label": "Email notification"},
                {"value": "slack", "label": "Slack message"},
                {"value": "webhook", "label": "Custom webhook"}
            ]
        },
        {
            "key": "max_alerts_per_hour",
            "label": "Maximum alerts per hour (prevent spam)",
            "type": "number",
            "required": False,
            "default": 10,
            "validation": {
                "min": 1,
                "max": 60
            }
        }
    ],
    max_instances_per_user=3  # Allow up to 3 different threshold triggers
)
class ImportanceThresholdTrigger:
    """
    Data threshold trigger for high-importance emails.

    Example configurations:
    - User A: Check every 5 min, alert if score > 85, critical only
    - User B: Check every minute, alert if score > 90, high + critical
    - User C: Check every 10 min, alert if score > 80, all urgencies

    The DynamicTriggerManager will:
    1. Schedule interval job to check for new high-priority emails
    2. Filter emails by importance_threshold and urgency_filter
    3. Track alert count to respect max_alerts_per_hour
    4. Execute workflow only for emails meeting criteria
    """
    pass


@trigger_template(
    id="vip-sender-alert",
    name="VIP Sender Alert",
    description="Get instantly notified when important people email you",
    template_type=TriggerTemplateType.SCHEDULE_INTERVAL,
    workflow_id="email-monitoring-workflow",
    category="email",
    config_fields=[
        {
            "key": "check_interval_minutes",
            "label": "How often to check for VIP emails",
            "type": "select",
            "required": True,
            "default": 5,
            "options": [
                {"value": 1, "label": "Every minute (instant)"},
                {"value": 5, "label": "Every 5 minutes (very fast)"},
                {"value": 10, "label": "Every 10 minutes (fast)"},
                {"value": 15, "label": "Every 15 minutes (moderate)"}
            ]
        },
        {
            "key": "vip_senders",
            "label": "VIP email addresses or domains (comma-separated)",
            "type": "text",
            "required": True,
            "default": "",
            "validation": {
                "pattern": r"^[\w\.\-\@]+(\,\s*[\w\.\-\@]+)*$"
            }
        },
        {
            "key": "notification_channels",
            "label": "Alert me via",
            "type": "multiselect",
            "required": False,
            "default": ["email", "slack"],
            "options": [
                {"value": "email", "label": "Email"},
                {"value": "slack", "label": "Slack"},
                {"value": "webhook", "label": "Webhook"}
            ]
        },
        {
            "key": "include_body",
            "label": "Include email preview in notification?",
            "type": "boolean",
            "required": False,
            "default": True
        }
    ],
    max_instances_per_user=5  # Allow multiple VIP groups
)
class VIPSenderAlertTrigger:
    """
    Fast-check trigger for VIP senders.

    Example configurations:
    - User A: Check every minute for boss@company.com, client@bigcorp.com
    - User B: Check every 5 min for @executive-team.com domain
    - User C: Check every 10 min for top-5-clients list

    This is like a "watch list" for specific important senders.

    The workflow will:
    1. Fetch emails from VIP senders only
    2. Auto-mark as high importance (bypassing AI analysis for speed)
    3. Send immediate notifications
    """
    pass


@trigger_template(
    id="email-digest",
    name="Daily Email Digest",
    description="Get a summary of important emails once per day at your preferred time",
    template_type=TriggerTemplateType.SCHEDULE_DAILY,
    workflow_id="email-monitoring-workflow",
    category="email",
    config_fields=[
        {
            "key": "time",
            "label": "What time should I send your daily digest?",
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
            "default": "America/New_York"
        },
        {
            "key": "days_of_week",
            "label": "Which days should I send the digest?",
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
        },
        {
            "key": "importance_threshold",
            "label": "Include emails with importance score above",
            "type": "number",
            "required": False,
            "default": 60,
            "validation": {
                "min": 0,
                "max": 100
            }
        },
        {
            "key": "max_emails_in_digest",
            "label": "Maximum emails to include in digest",
            "type": "number",
            "required": False,
            "default": 20,
            "validation": {
                "min": 5,
                "max": 100
            }
        },
        {
            "key": "digest_format",
            "label": "Digest format",
            "type": "select",
            "required": False,
            "default": "detailed",
            "options": [
                {"value": "summary", "label": "Brief summary (subject lines only)"},
                {"value": "detailed", "label": "Detailed (with previews and analysis)"}
            ]
        }
    ],
    max_instances_per_user=2  # Allow morning and evening digest
)
class EmailDigestTrigger:
    """
    Daily digest trigger for email summaries.

    Example configurations:
    - User A: 9am EST, Mon-Fri, score > 60, detailed format
    - User B: 6pm PST, Every day, score > 50, summary format
    - User C: 8am + 5pm, Mon-Fri, score > 70, detailed (2 instances)

    This is for users who prefer batch notifications over real-time alerts.

    The workflow will:
    1. Fetch emails from last 24 hours (or since last digest)
    2. Analyze all emails for importance
    3. Group and format as digest email
    4. Send single notification with summary of all important emails
    """
    pass
