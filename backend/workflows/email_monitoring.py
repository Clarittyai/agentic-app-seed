"""
Email Monitoring Workflows

Workflows for intelligent email monitoring and notification.
"""

from clarity_sdk import workflow, uses_agent, WorkflowContext, ExecutionMode
import logging

logger = logging.getLogger(__name__)


@workflow(
    id="email-monitoring-workflow",
    name="Smart Email Monitoring",
    description="Fetches new emails, analyzes importance with AI, and sends notifications for important ones",
    execution_mode=ExecutionMode.SEQUENTIAL
)
async def email_monitoring_workflow(context: WorkflowContext):
    """
    Main email monitoring workflow.

    This workflow:
    1. Fetches new emails from Gmail (EmailFetcherAgent)
    2. Analyzes each email for importance (EmailAnalyzerAgent)
    3. Sends notifications for important emails (NotificationSenderAgent)

    Triggered by:
    - scheduled-email-check (user-configured interval)
    - importance-threshold-trigger (data threshold)

    Input data (from trigger config):
    - since_timestamp: Last check timestamp (optional)
    - max_emails: Limit number of emails to fetch
    - importance_threshold: Minimum score to trigger notification (default: 70)
    - notification_channels: ["email", "slack", "webhook"]

    Workflow state:
    - Stateless - fetches emails based on timestamp
    - Stores processed email IDs in database to prevent duplicates
    - Uses user's importance criteria from UserEmailCriteria model
    """
    context.log("info", "🚀 Starting smart email monitoring workflow")

    # Step 1: Fetch new emails
    context.log("info", "📧 Step 1: Fetching new emails from Gmail...")

    # Get configuration from trigger
    since_timestamp = context.get_input("since_timestamp")
    max_emails = context.get_input("max_emails", 50)
    include_body = context.get_input("include_body", False)

    # Execute EmailFetcherAgent
    from clarity_sdk import AgentRegistry, AgentContext as AC

    fetcher_agent_class = AgentRegistry.get_agent("email-fetcher")
    if not fetcher_agent_class:
        context.log("error", "EmailFetcherAgent not found")
        return

    fetcher_agent = fetcher_agent_class()
    fetcher_context = AC(
        user_id=context.user_id,
        input_data={
            "since_timestamp": since_timestamp,
            "max_emails": max_emails,
            "include_body": include_body
        },
        integrations=context.integrations,
        metadata=context.metadata,
        execution_id=context.execution_id
    )

    fetch_result = await fetcher_agent.execute(fetcher_context)

    if not fetch_result.success:
        context.log("error", f"Failed to fetch emails: {fetch_result.error}")
        return

    emails = fetch_result.data.get("emails", [])
    context.log("info", f"✅ Fetched {len(emails)} emails")

    if not emails:
        context.log("info", "No new emails to process")
        return

    # Get user's importance criteria
    # In production, fetch from UserEmailCriteria model via database
    importance_criteria = context.get_input("importance_criteria", {
        "important_senders": ["boss@company.com", "client@"],
        "ignore_senders": ["noreply@", "newsletter@", "@linkedin"],
        "keywords_important": ["urgent", "deadline", "meeting", "approval", "asap"],
        "keywords_ignore": ["unsubscribe", "promotional", "newsletter"]
    })

    user_context = context.get_input("user_context", "")

    # Step 2: Analyze each email
    context.log("info", f"🤖 Step 2: Analyzing {len(emails)} emails with AI...")

    analyzer_agent_class = AgentRegistry.get_agent("email-analyzer")
    if not analyzer_agent_class:
        context.log("error", "EmailAnalyzerAgent not found")
        return

    analyzer_agent = analyzer_agent_class()

    important_emails = []

    for email in emails:
        context.log("info", f"Analyzing: {email.get('subject', 'No subject')}")

        analyzer_context = AC(
            user_id=context.user_id,
            input_data={
                "email": email,
                "importance_criteria": importance_criteria,
                "user_context": user_context
            },
            integrations=context.integrations,
            metadata=context.metadata,
            execution_id=f"{context.execution_id}_analyze_{email.get('email_id')}"
        )

        analysis_result = await analyzer_agent.execute(analyzer_context)

        if not analysis_result.success:
            context.log("warning", f"Failed to analyze email {email.get('email_id')}: {analysis_result.error}")
            continue

        analysis = analysis_result.data

        context.log("info", f"Score: {analysis['importance_score']}/100 - {analysis['category']}")

        # Check if email meets importance threshold
        importance_threshold = context.get_input("importance_threshold", 70)

        if analysis.get("is_important") and analysis.get("importance_score", 0) >= importance_threshold:
            important_emails.append({
                "email": email,
                "analysis": analysis
            })
            context.log("info", f"✓ Important: {email.get('subject')}")

    context.log("info", f"✅ Found {len(important_emails)} important emails")

    if not important_emails:
        context.log("info", "No important emails to notify about")
        return

    # Step 3: Send notifications for important emails
    context.log("info", f"📬 Step 3: Sending notifications for {len(important_emails)} important emails...")

    notifier_agent_class = AgentRegistry.get_agent("notification-sender")
    if not notifier_agent_class:
        context.log("error", "NotificationSenderAgent not found")
        return

    notifier_agent = notifier_agent_class()

    notification_channels = context.get_input("notification_channels", ["email"])

    notifications_sent = 0

    for item in important_emails:
        email = item["email"]
        analysis = item["analysis"]

        context.log("info", f"Sending notification for: {email.get('subject')}")

        notifier_context = AC(
            user_id=context.user_id,
            input_data={
                "email": email,
                "analysis": analysis,
                "notification_channels": notification_channels,
                "urgency_level": analysis.get("urgency_level", "medium")
            },
            integrations=context.integrations,
            metadata=context.metadata,
            execution_id=f"{context.execution_id}_notify_{email.get('email_id')}"
        )

        notification_result = await notifier_agent.execute(notifier_context)

        if notification_result.success:
            notifications_sent += 1
            context.log("info", f"✓ Notification sent via {notification_result.data.get('sent_channels')}")
        else:
            context.log("warning", f"Failed to send notification: {notification_result.error}")

    context.log("info", f"✅ Email monitoring complete: {notifications_sent}/{len(important_emails)} notifications sent")

    # Store summary in workflow output
    context.set_output("total_emails_fetched", len(emails))
    context.set_output("important_emails_found", len(important_emails))
    context.set_output("notifications_sent", notifications_sent)
    context.set_output("fetch_timestamp", fetch_result.data.get("fetch_timestamp"))


@workflow(
    id="criteria-learning-workflow",
    name="Importance Criteria Learning",
    description="Learns from user feedback to improve importance detection accuracy",
    execution_mode=ExecutionMode.SEQUENTIAL
)
async def criteria_learning_workflow(context: WorkflowContext):
    """
    Learning workflow that improves importance criteria based on user feedback.

    This workflow:
    1. Analyzes user feedback history (correct, false_positive, false_negative)
    2. Identifies patterns in misclassifications
    3. Suggests improvements to importance criteria
    4. Updates user's criteria with approval

    Triggered by:
    - Manual execution by user
    - Automatic weekly review (future feature)

    Input data:
    - feedback_period_days: How many days of feedback to analyze (default: 30)
    - auto_update: Whether to automatically update criteria (default: false)

    This is a Phase 2 feature for continuous improvement.
    """
    context.log("info", "🎓 Starting criteria learning workflow")

    feedback_period_days = context.get_input("feedback_period_days", 30)

    context.log("info", f"Analyzing feedback from last {feedback_period_days} days...")

    # Phase 2: Implement learning logic
    # 1. Query ProcessedEmail table for feedback data
    # 2. Identify patterns (e.g., "always marks emails from X as false_positive")
    # 3. Use Claude AI to suggest criteria improvements
    # 4. Store suggestions for user review

    context.log("info", "Learning workflow complete (Phase 2 feature - placeholder)")

    context.set_output("suggestions", [
        "Consider adding 'project-name' to important keywords",
        "Emails from 'newsletter@' are consistently marked unimportant"
    ])
