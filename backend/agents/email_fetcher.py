"""
Email Fetcher Agent

Connects to Gmail API and fetches new emails for monitoring.
Supports filtering by date range and limiting results.
"""

from clarity_sdk import agent, BaseAgent, AgentResult, AgentContext
from typing import Dict, Any, List
from datetime import datetime, timedelta
import logging
import base64

logger = logging.getLogger(__name__)


@agent(
    id="email-fetcher",
    name="Email Fetcher",
    description="Fetches new emails from Gmail inbox for monitoring and analysis",
    category="email",
    inputs={
        "since_timestamp": {
            "type": "string",
            "description": "Fetch emails received after this ISO timestamp",
            "required": False
        },
        "max_emails": {
            "type": "integer",
            "description": "Maximum number of emails to fetch",
            "required": False
        },
        "include_body": {
            "type": "boolean",
            "description": "Whether to fetch email body content (slower but more context)",
            "required": False
        }
    },
    outputs={
        "emails": {
            "type": "array",
            "description": "List of email objects with metadata and content"
        },
        "fetched_count": {
            "type": "integer",
            "description": "Number of emails fetched"
        },
        "fetch_timestamp": {
            "type": "string",
            "description": "ISO timestamp when fetch was performed"
        }
    },
    integrations=[
        {
            "service": "gmail",
            "description": "Connect to Gmail to fetch and monitor your emails",
            "auth_type": "oauth",
            "required": True,
            "scopes": [
                "https://www.googleapis.com/auth/gmail.readonly",
                "https://www.googleapis.com/auth/gmail.metadata"
            ],
            "config_fields": []
        }
    ],
    timeout=120  # Gmail API can be slow
)
class EmailFetcherAgent(BaseAgent):
    """
    Fetches emails from Gmail using the Gmail API.

    This agent:
    1. Connects to Gmail via OAuth credentials
    2. Fetches emails matching criteria (timestamp, count)
    3. Extracts metadata (sender, subject, timestamp, labels)
    4. Optionally fetches full body content
    5. Returns structured email objects for analysis

    Production note: In a real deployment, consider:
    - Caching Gmail API calls to reduce quota usage
    - Using Gmail push notifications for real-time monitoring
    - Handling pagination for large inboxes
    - Rate limiting and retry logic
    """

    async def execute(self, context: AgentContext) -> AgentResult:
        """
        Fetch emails from Gmail.
        """
        try:
            # Get input parameters
            since_timestamp = context.get_input("since_timestamp")
            max_emails = context.get_input("max_emails", 50)
            include_body = context.get_input("include_body", False)

            # Get Gmail integration
            gmail_credentials = context.get_integration("gmail")

            if not gmail_credentials:
                context.log("error", "Gmail not connected. Please connect Gmail integration.")
                return AgentResult(
                    success=False,
                    error="Gmail integration not configured. Please connect your Gmail account."
                )

            context.log("info", f"Fetching up to {max_emails} emails from Gmail...")

            # Fetch emails from Gmail
            emails = await self._fetch_emails_from_gmail(
                credentials=gmail_credentials,
                since_timestamp=since_timestamp,
                max_emails=max_emails,
                include_body=include_body,
                context=context
            )

            fetch_timestamp = datetime.utcnow().isoformat()

            context.log("info", f"Successfully fetched {len(emails)} emails")

            return AgentResult(
                success=True,
                data={
                    "emails": emails,
                    "fetched_count": len(emails),
                    "fetch_timestamp": fetch_timestamp
                },
                metadata={
                    "agent_id": "email-fetcher",
                    "fetch_timestamp": fetch_timestamp,
                    "total_emails": len(emails)
                }
            )

        except Exception as e:
            logger.error(f"Email fetch failed: {e}")
            return AgentResult(
                success=False,
                error=f"Failed to fetch emails: {str(e)}"
            )

    async def _fetch_emails_from_gmail(
        self,
        credentials: Dict[str, Any],
        since_timestamp: str,
        max_emails: int,
        include_body: bool,
        context: AgentContext
    ) -> List[Dict[str, Any]]:
        """
        Fetch emails from Gmail API.

        In production, this would use google-api-python-client:
        from googleapiclient.discovery import build
        service = build('gmail', 'v1', credentials=credentials)

        For now, we'll simulate with mock data for development.
        """

        # TODO: PRODUCTION - Replace with actual Gmail API calls
        # from googleapiclient.discovery import build
        # service = build('gmail', 'v1', credentials=credentials)

        # Build query
        query_parts = []
        if since_timestamp:
            # Convert ISO timestamp to Gmail query format
            try:
                dt = datetime.fromisoformat(since_timestamp.replace('Z', '+00:00'))
                # Gmail uses format: after:yyyy/mm/dd
                query_parts.append(f"after:{dt.strftime('%Y/%m/%d')}")
            except Exception as e:
                context.log("warning", f"Invalid since_timestamp: {e}")

        query = " ".join(query_parts) if query_parts else "in:inbox"

        context.log("info", f"Gmail query: {query}")

        # DEVELOPMENT MODE: Return mock emails for testing
        # Remove this section and uncomment production code below when deploying
        mock_emails = [
            {
                "email_id": "msg_001",
                "sender": "boss@company.com",
                "sender_name": "Sarah Johnson",
                "subject": "URGENT: Q4 Strategy Meeting Tomorrow",
                "snippet": "Hi team, we need to finalize our Q4 roadmap. Meeting at 2pm tomorrow...",
                "body": "Hi team,\n\nWe need to finalize our Q4 roadmap. Meeting at 2pm tomorrow in Conference Room A.\n\nPlease review the attached deck beforehand.\n\nBest,\nSarah" if include_body else None,
                "received_at": (datetime.utcnow() - timedelta(minutes=15)).isoformat(),
                "labels": ["INBOX", "IMPORTANT"],
                "has_attachments": True,
                "is_unread": True
            },
            {
                "email_id": "msg_002",
                "sender": "newsletter@techcrunch.com",
                "sender_name": "TechCrunch Daily",
                "subject": "TechCrunch Daily: Top Stories Today",
                "snippet": "Your daily dose of tech news: AI advances, startup funding, and more...",
                "body": "Top Stories:\n1. AI startup raises $100M\n2. New smartphone released\n...\n\nUnsubscribe" if include_body else None,
                "received_at": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
                "labels": ["INBOX", "CATEGORY_PROMOTIONS"],
                "has_attachments": False,
                "is_unread": True
            },
            {
                "email_id": "msg_003",
                "sender": "client@bigcorp.com",
                "sender_name": "John Smith",
                "subject": "Re: Project Approval - Need Decision",
                "snippet": "Following up on the project proposal. We need your approval by EOD...",
                "body": "Hi,\n\nFollowing up on the project proposal I sent last week.\n\nWe need your approval by end of day to meet the deadline.\n\nLet me know if you have questions.\n\nJohn" if include_body else None,
                "received_at": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
                "labels": ["INBOX"],
                "has_attachments": False,
                "is_unread": True
            },
            {
                "email_id": "msg_004",
                "sender": "noreply@linkedin.com",
                "sender_name": "LinkedIn",
                "subject": "You have 5 new profile views",
                "snippet": "People are checking out your LinkedIn profile this week...",
                "body": "Your weekly profile update:\n\n- 5 profile views\n- 2 search appearances\n\nView your dashboard" if include_body else None,
                "received_at": (datetime.utcnow() - timedelta(hours=4)).isoformat(),
                "labels": ["INBOX", "CATEGORY_SOCIAL"],
                "has_attachments": False,
                "is_unread": False
            }
        ]

        # Limit to max_emails
        result_emails = mock_emails[:max_emails]

        context.log("info", f"[DEVELOPMENT MODE] Returning {len(result_emails)} mock emails")

        return result_emails

        # PRODUCTION CODE (uncomment when ready for production):
        """
        try:
            # Build Gmail API client
            from googleapiclient.discovery import build
            service = build('gmail', 'v1', credentials=credentials)

            # List messages
            results = service.users().messages().list(
                userId='me',
                q=query,
                maxResults=max_emails
            ).execute()

            messages = results.get('messages', [])

            if not messages:
                context.log("info", "No messages found matching criteria")
                return []

            # Fetch full message details
            emails = []
            for msg in messages:
                message = service.users().messages().get(
                    userId='me',
                    id=msg['id'],
                    format='full' if include_body else 'metadata'
                ).execute()

                # Parse email data
                headers = message.get('payload', {}).get('headers', [])

                # Extract headers
                sender = next((h['value'] for h in headers if h['name'].lower() == 'from'), '')
                subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), '')
                date = next((h['value'] for h in headers if h['name'].lower() == 'date'), '')

                # Extract body if requested
                body = None
                if include_body:
                    body = self._extract_email_body(message.get('payload', {}))

                emails.append({
                    "email_id": message['id'],
                    "sender": sender,
                    "subject": subject,
                    "snippet": message.get('snippet', ''),
                    "body": body,
                    "received_at": date,
                    "labels": message.get('labelIds', []),
                    "has_attachments": 'attachment' in str(message.get('payload', {})),
                    "is_unread": 'UNREAD' in message.get('labelIds', [])
                })

            return emails

        except Exception as e:
            logger.error(f"Gmail API error: {e}")
            raise
        """

    def _extract_email_body(self, payload: Dict[str, Any]) -> str:
        """
        Extract email body from Gmail API payload.
        Handles both plain text and HTML bodies.
        """
        # For production Gmail API integration
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body'].get('data', '')
                    if data:
                        return base64.urlsafe_b64decode(data).decode('utf-8')

        # Single-part message
        if 'body' in payload and 'data' in payload['body']:
            data = payload['body']['data']
            return base64.urlsafe_b64decode(data).decode('utf-8')

        return ""
