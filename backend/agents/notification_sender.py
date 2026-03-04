"""
Notification Sender Agent

Sends notifications for important emails via multiple channels.
Supports Email, Slack, and webhooks for maximum flexibility.
"""

from clarity_sdk import agent, BaseAgent, AgentResult, AgentContext
from typing import Dict, Any, List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


@agent(
    id="notification-sender",
    name="Notification Sender",
    description="Sends notifications for important emails via email, Slack, or webhooks",
    category="notifications",
    inputs={
        "email": {
            "type": "object",
            "description": "The email object that triggered the notification",
            "required": True
        },
        "analysis": {
            "type": "object",
            "description": "Analysis results from EmailAnalyzerAgent",
            "required": True
        },
        "notification_channels": {
            "type": "array",
            "description": "Channels to send notification: ['email', 'slack', 'webhook']",
            "required": False
        },
        "urgency_level": {
            "type": "string",
            "description": "Urgency level: 'low', 'medium', 'high', 'critical'",
            "required": False
        }
    },
    outputs={
        "sent_channels": {
            "type": "array",
            "description": "List of channels where notification was successfully sent"
        },
        "failed_channels": {
            "type": "array",
            "description": "List of channels where notification failed"
        },
        "notification_id": {
            "type": "string",
            "description": "Unique identifier for this notification"
        },
        "sent_at": {
            "type": "string",
            "description": "ISO timestamp when notification was sent"
        }
    },
    integrations=[
        {
            "service": "slack",
            "description": "Connect to Slack to send important email notifications",
            "auth_type": "api-key",
            "required": False,
            "scopes": [],
            "config_fields": [
                {
                    "key": "webhook_url",
                    "label": "Slack Webhook URL",
                    "type": "url",
                    "required": True
                }
            ]
        }
    ],
    timeout=30
)
class NotificationSenderAgent(BaseAgent):
    """
    Sends notifications for important emails across multiple channels.

    This agent:
    1. Takes email data and analysis results
    2. Formats notification message based on urgency
    3. Sends to configured channels (email, Slack, webhook)
    4. Tracks success/failure per channel
    5. Returns notification tracking information

    Supported channels:
    - Email: Send notification email to user
    - Slack: Post to Slack channel via webhook
    - Webhook: POST to custom webhook URL for integration

    Production considerations:
    - Rate limiting to prevent notification spam
    - Deduplication to avoid duplicate notifications
    - Retry logic for failed deliveries
    - Template customization per channel
    """

    async def execute(self, context: AgentContext) -> AgentResult:
        """
        Send notifications for important email.
        """
        try:
            # Get input data
            email = context.get_input("email")
            analysis = context.get_input("analysis", {})
            notification_channels = context.get_input("notification_channels", ["email"])
            urgency_level = context.get_input("urgency_level") or analysis.get("urgency_level", "medium")

            if not email:
                return AgentResult(
                    success=False,
                    error="No email provided for notification"
                )

            context.log("info", f"Sending notification for email: {email.get('subject', 'No subject')}")

            notification_id = f"notif_{context.execution_id}"
            sent_at = datetime.utcnow().isoformat()

            sent_channels = []
            failed_channels = []

            # Send to each configured channel
            for channel in notification_channels:
                try:
                    if channel == "email":
                        success = await self._send_email_notification(
                            email=email,
                            analysis=analysis,
                            urgency_level=urgency_level,
                            context=context
                        )
                    elif channel == "slack":
                        success = await self._send_slack_notification(
                            email=email,
                            analysis=analysis,
                            urgency_level=urgency_level,
                            context=context
                        )
                    elif channel == "webhook":
                        success = await self._send_webhook_notification(
                            email=email,
                            analysis=analysis,
                            urgency_level=urgency_level,
                            context=context
                        )
                    else:
                        context.log("warning", f"Unknown notification channel: {channel}")
                        success = False

                    if success:
                        sent_channels.append(channel)
                    else:
                        failed_channels.append(channel)

                except Exception as e:
                    context.log("error", f"Failed to send to {channel}: {str(e)}")
                    failed_channels.append(channel)

            context.log("info", f"Notification sent to {len(sent_channels)}/{len(notification_channels)} channels")

            return AgentResult(
                success=True,
                data={
                    "sent_channels": sent_channels,
                    "failed_channels": failed_channels,
                    "notification_id": notification_id,
                    "sent_at": sent_at
                },
                metadata={
                    "agent_id": "notification-sender",
                    "email_id": email.get("email_id"),
                    "notification_id": notification_id
                }
            )

        except Exception as e:
            logger.error(f"Notification sending failed: {e}")
            return AgentResult(
                success=False,
                error=f"Failed to send notifications: {str(e)}"
            )

    async def _send_email_notification(
        self,
        email: Dict[str, Any],
        analysis: Dict[str, Any],
        urgency_level: str,
        context: AgentContext
    ) -> bool:
        """
        Send email notification to user.

        In production, integrate with email service (SendGrid, SES, etc.)
        """
        # DEVELOPMENT MODE: Log notification instead of sending
        context.log("info", "[DEVELOPMENT MODE] Would send email notification")

        notification_subject = self._format_email_subject(email, analysis, urgency_level)
        notification_body = self._format_email_body(email, analysis, urgency_level)

        context.log("info", f"Email notification preview:\nSubject: {notification_subject}\nBody: {notification_body[:100]}...")

        # PRODUCTION CODE (uncomment when ready):
        """
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        # Get user's notification email from context or config
        to_email = context.metadata.get('user_email', 'user@example.com')

        msg = MIMEMultipart()
        msg['From'] = os.environ.get('SMTP_FROM_EMAIL', 'notifications@smartemailfilter.com')
        msg['To'] = to_email
        msg['Subject'] = notification_subject

        msg.attach(MIMEText(notification_body, 'html'))

        # Send via SMTP
        smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.environ.get('SMTP_PORT', '587'))
        smtp_user = os.environ.get('SMTP_USER')
        smtp_password = os.environ.get('SMTP_PASSWORD')

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        context.log("info", f"Email notification sent to {to_email}")
        """

        return True  # Simulated success in development mode

    async def _send_slack_notification(
        self,
        email: Dict[str, Any],
        analysis: Dict[str, Any],
        urgency_level: str,
        context: AgentContext
    ) -> bool:
        """
        Send Slack notification via webhook.
        """
        slack_credentials = context.get_integration("slack")

        if not slack_credentials or not slack_credentials.get("webhook_url"):
            context.log("warning", "Slack not configured, skipping Slack notification")
            return False

        # DEVELOPMENT MODE: Log notification instead of sending
        context.log("info", "[DEVELOPMENT MODE] Would send Slack notification")

        slack_message = self._format_slack_message(email, analysis, urgency_level)

        context.log("info", f"Slack notification preview: {slack_message}")

        # PRODUCTION CODE (uncomment when ready):
        """
        import requests

        webhook_url = slack_credentials["webhook_url"]

        payload = {
            "text": slack_message,
            "attachments": [
                {
                    "color": self._get_urgency_color(urgency_level),
                    "fields": [
                        {
                            "title": "From",
                            "value": email.get("sender", "Unknown"),
                            "short": True
                        },
                        {
                            "title": "Importance Score",
                            "value": f"{analysis.get('importance_score', 0)}/100",
                            "short": True
                        },
                        {
                            "title": "Category",
                            "value": analysis.get("category", "unknown"),
                            "short": True
                        },
                        {
                            "title": "Suggested Action",
                            "value": analysis.get("suggested_action", "read_later"),
                            "short": True
                        }
                    ],
                    "footer": "Smart Email Filter",
                    "ts": int(datetime.utcnow().timestamp())
                }
            ]
        }

        response = requests.post(webhook_url, json=payload)

        if response.status_code == 200:
            context.log("info", "Slack notification sent successfully")
            return True
        else:
            context.log("error", f"Slack notification failed: {response.status_code}")
            return False
        """

        return True  # Simulated success in development mode

    async def _send_webhook_notification(
        self,
        email: Dict[str, Any],
        analysis: Dict[str, Any],
        urgency_level: str,
        context: AgentContext
    ) -> bool:
        """
        Send notification to custom webhook.
        """
        # DEVELOPMENT MODE: Log notification instead of sending
        context.log("info", "[DEVELOPMENT MODE] Would send webhook notification")

        # PRODUCTION CODE (uncomment when ready):
        """
        import requests

        webhook_url = context.metadata.get('webhook_url')

        if not webhook_url:
            context.log("warning", "No webhook URL configured")
            return False

        payload = {
            "notification_type": "important_email",
            "email": {
                "id": email.get("email_id"),
                "sender": email.get("sender"),
                "subject": email.get("subject"),
                "snippet": email.get("snippet"),
                "received_at": email.get("received_at")
            },
            "analysis": analysis,
            "urgency_level": urgency_level,
            "timestamp": datetime.utcnow().isoformat()
        }

        response = requests.post(webhook_url, json=payload, timeout=10)

        if response.status_code == 200:
            context.log("info", "Webhook notification sent successfully")
            return True
        else:
            context.log("error", f"Webhook notification failed: {response.status_code}")
            return False
        """

        return True  # Simulated success in development mode

    def _format_email_subject(
        self,
        email: Dict[str, Any],
        analysis: Dict[str, Any],
        urgency_level: str
    ) -> str:
        """Format email notification subject."""
        urgency_prefix = {
            "critical": "🔴 CRITICAL",
            "high": "🟠 URGENT",
            "medium": "🟡 IMPORTANT",
            "low": "🟢 NEW"
        }.get(urgency_level, "📧 NEW")

        return f"{urgency_prefix}: {email.get('subject', 'Email from ' + email.get('sender', 'Unknown'))}"

    def _format_email_body(
        self,
        email: Dict[str, Any],
        analysis: Dict[str, Any],
        urgency_level: str
    ) -> str:
        """Format email notification body."""
        return f"""
<html>
<body style="font-family: Arial, sans-serif;">
    <h2 style="color: {'#d32f2f' if urgency_level == 'critical' else '#1976d2'};">
        Important Email Detected
    </h2>

    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>From:</strong> {email.get('sender', 'Unknown')}</p>
        <p><strong>Subject:</strong> {email.get('subject', 'No subject')}</p>
        <p><strong>Received:</strong> {email.get('received_at', 'Unknown')}</p>
    </div>

    <div style="margin: 20px 0;">
        <p><strong>Preview:</strong></p>
        <p style="color: #555;">{email.get('snippet', 'No preview available')}</p>
    </div>

    <div style="background: #e3f2fd; padding: 15px; border-left: 4px solid #1976d2; margin: 15px 0;">
        <p><strong>Why this is important:</strong></p>
        <p>{analysis.get('reasoning', 'Matches your importance criteria')}</p>

        <p style="margin-top: 10px;">
            <strong>Importance Score:</strong> {analysis.get('importance_score', 0)}/100<br>
            <strong>Category:</strong> {analysis.get('category', 'unknown')}<br>
            <strong>Suggested Action:</strong> {analysis.get('suggested_action', 'read_later').replace('_', ' ').title()}
        </p>
    </div>

    <p style="margin-top: 20px;">
        <a href="https://mail.google.com" style="background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View in Gmail
        </a>
    </p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

    <p style="color: #999; font-size: 12px;">
        Smart Email Filter | Powered by Clarity AI
    </p>
</body>
</html>
"""

    def _format_slack_message(
        self,
        email: Dict[str, Any],
        analysis: Dict[str, Any],
        urgency_level: str
    ) -> str:
        """Format Slack notification message."""
        urgency_emoji = {
            "critical": "🔴",
            "high": "🟠",
            "medium": "🟡",
            "low": "🟢"
        }.get(urgency_level, "📧")

        return f"""{urgency_emoji} *Important Email Detected*

*From:* {email.get('sender', 'Unknown')}
*Subject:* {email.get('subject', 'No subject')}

*Preview:*
{email.get('snippet', 'No preview available')[:200]}...

*Why important:* {analysis.get('reasoning', 'Matches your criteria')}

*Score:* {analysis.get('importance_score', 0)}/100 | *Action:* {analysis.get('suggested_action', 'read_later').replace('_', ' ').title()}"""

    def _get_urgency_color(self, urgency_level: str) -> str:
        """Get color code for Slack attachment based on urgency."""
        return {
            "critical": "#d32f2f",
            "high": "#f57c00",
            "medium": "#fbc02d",
            "low": "#388e3c"
        }.get(urgency_level, "#1976d2")
