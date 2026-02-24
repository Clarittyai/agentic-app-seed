"""
Email Composer Agent

Composes professional emails based on context and purpose.
Demonstrates integration requirements (email service).
"""

from clarity_sdk import agent, BaseAgent, AgentResult, AgentContext
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


@agent(
    id="email-composer",
    name="Email Composer",
    description="Composes professional emails based on context, tone, and purpose",
    category="communication",
    inputs={
        "recipient_name": {
            "type": "string",
            "description": "Recipient's name",
            "required": True
        },
        "purpose": {
            "type": "string",
            "description": "Purpose of the email (e.g., 'follow-up', 'meeting request', 'thank you')",
            "required": True
        },
        "context": {
            "type": "string",
            "description": "Additional context or key points to include",
            "required": False
        },
        "tone": {
            "type": "string",
            "description": "Email tone (formal, casual, friendly)",
            "required": False
        },
        "send_now": {
            "type": "boolean",
            "description": "Whether to send immediately or just draft",
            "required": False
        }
    },
    outputs={
        "subject": {
            "type": "string",
            "description": "Email subject line"
        },
        "body": {
            "type": "string",
            "description": "Email body content"
        },
        "sent": {
            "type": "boolean",
            "description": "Whether email was sent"
        },
        "draft_id": {
            "type": "string",
            "description": "Draft ID if not sent immediately"
        }
    },
    integrations=[
        {
            "service": "gmail",
            "auth_type": "oauth",
            "required": False,  # Optional - only needed if send_now=True
            "scopes": ["https://www.googleapis.com/auth/gmail.send"],
            "config_fields": []
        }
    ],
    timeout=60
)
class EmailComposerAgent(BaseAgent):
    """
    Composes professional emails using AI.
    Optionally sends via Gmail integration.
    """

    async def execute(self, context: AgentContext) -> AgentResult:
        """
        Compose and optionally send email.
        """
        try:
            # Get input data
            recipient_name = context.get_input("recipient_name")
            purpose = context.get_input("purpose")
            email_context = context.get_input("context", "")
            tone = context.get_input("tone", "professional")
            send_now = context.get_input("send_now", False)

            context.log("info", f"Composing {tone} email for {purpose} to {recipient_name}")

            # Compose email
            subject, body = self._compose_email(recipient_name, purpose, email_context, tone)

            result_data = {
                "subject": subject,
                "body": body,
                "sent": False,
                "draft_id": None
            }

            # Send email if requested
            if send_now:
                gmail_credentials = context.get_integration("gmail")

                if not gmail_credentials:
                    context.log("warning", "Gmail not connected, saving as draft")
                    result_data["draft_id"] = "draft_" + context.execution_id
                else:
                    # In production, actually send via Gmail API
                    context.log("info", "Sending email via Gmail...")
                    result_data["sent"] = True
                    # sent_message_id = await self._send_via_gmail(gmail_credentials, subject, body)
                    # result_data["message_id"] = sent_message_id
            else:
                result_data["draft_id"] = "draft_" + context.execution_id

            context.log("info", f"Email composed successfully")

            return AgentResult(
                success=True,
                data=result_data,
                metadata={
                    "agent_id": "email-composer",
                    "recipient": recipient_name,
                    "purpose": purpose
                }
            )

        except Exception as e:
            logger.error(f"Email composition failed: {e}")
            return AgentResult(
                success=False,
                error=f"Failed to compose email: {str(e)}"
            )

    def _compose_email(self, recipient: str, purpose: str, context: str, tone: str) -> tuple:
        """
        Compose email subject and body.
        In production, use Claude API for better composition.
        """
        # Simple template-based composition
        templates = {
            "follow-up": {
                "subject": f"Following Up: {context[:50] if context else 'Our Recent Conversation'}",
                "body": f"Hi {recipient},\n\nI wanted to follow up on {context or 'our recent conversation'}.\n\n{self._get_tone_text(tone)}\n\nLooking forward to hearing from you.\n\nBest regards"
            },
            "meeting request": {
                "subject": f"Meeting Request: {context[:50] if context else 'Discussion'}",
                "body": f"Hi {recipient},\n\nI'd like to schedule a meeting to discuss {context or 'our upcoming project'}.\n\nWould you be available sometime this week?\n\nBest regards"
            },
            "thank you": {
                "subject": "Thank You",
                "body": f"Hi {recipient},\n\nThank you for {context or 'your time and assistance'}.\n\n{self._get_tone_text(tone)}\n\nBest regards"
            }
        }

        template = templates.get(purpose.lower(), templates["follow-up"])
        return template["subject"], template["body"]

    def _get_tone_text(self, tone: str) -> str:
        """
        Get additional text based on tone.
        """
        tone_texts = {
            "formal": "I appreciate your time and consideration.",
            "casual": "Thanks for your help with this!",
            "friendly": "Really appreciate your support on this!"
        }
        return tone_texts.get(tone.lower(), tone_texts["formal"])

    async def _send_via_gmail(self, credentials: Dict[str, Any], subject: str, body: str) -> str:
        """
        Send email via Gmail API.
        In production, implement actual Gmail API integration.
        """
        # TODO: Implement Gmail API sending
        # from googleapiclient.discovery import build
        # service = build('gmail', 'v1', credentials=credentials)
        # message = create_message('me', 'recipient@example.com', subject, body)
        # sent = service.users().messages().send(userId='me', body=message).execute()
        # return sent['id']

        return "sent_message_id_placeholder"
