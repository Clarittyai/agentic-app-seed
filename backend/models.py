"""
Database models for Clarity backend

Models:
- UserTriggerInstance: User-configured trigger instances
- TriggerExecution: Audit trail of trigger executions
- UserIntegration: User-connected integrations
- WorkflowExecution: Workflow execution history
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from backend.database import Base


class UserTriggerInstance(Base):
    """
    User-configured trigger instances.

    Users create instances from trigger templates with their own configuration.
    Example: User A creates "Daily Review" at 9am EST, User B at 6pm PST
    """
    __tablename__ = "user_trigger_instances"

    # Identity
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    template_id = Column(String, nullable=False, index=True)  # References TriggerTemplate

    # User configuration
    name = Column(String, nullable=False)  # User's custom name for this instance
    config = Column(JSON, nullable=False)  # User's configured values

    # State
    enabled = Column(Boolean, default=True, index=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Statistics
    last_triggered_at = Column(DateTime)
    total_executions = Column(Integer, default=0)
    total_failures = Column(Integer, default=0)

    # Relationships
    executions = relationship("TriggerExecution", back_populates="trigger_instance", cascade="all, delete-orphan")


class TriggerExecution(Base):
    """
    Audit trail of trigger executions.

    Records every time a trigger fires (success or failure).
    """
    __tablename__ = "trigger_executions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    trigger_instance_id = Column(String, ForeignKey('user_trigger_instances.id'), index=True)
    user_id = Column(String, index=True)
    workflow_execution_id = Column(String, index=True)  # Links to workflow execution

    triggered_at = Column(DateTime, default=datetime.utcnow, index=True)
    success = Column(Boolean)
    error_message = Column(Text)
    trigger_data = Column(JSON)  # Data at time of trigger

    # Relationships
    trigger_instance = relationship("UserTriggerInstance", back_populates="executions")


class UserIntegration(Base):
    """
    User-connected integrations (OAuth, API keys).

    Stores encrypted credentials for third-party services.
    """
    __tablename__ = "user_integrations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    service = Column(String, nullable=False, index=True)  # slack, google-sheets, etc
    auth_type = Column(String)  # oauth, api-key, basic
    credentials = Column(JSON)  # Encrypted credentials
    scopes = Column(JSON)  # OAuth scopes
    connected_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True, index=True)

    def __repr__(self):
        return f"<UserIntegration user={self.user_id} service={self.service}>"


class WorkflowExecution(Base):
    """
    Workflow execution history.

    Records every workflow run with inputs, outputs, and timing.
    """
    __tablename__ = "workflow_executions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workflow_id = Column(String, nullable=False, index=True)
    trigger_id = Column(String, index=True)
    user_id = Column(String, index=True)

    status = Column(String, index=True)  # pending, running, completed, failed
    input_data = Column(JSON)
    output_data = Column(JSON)
    error_message = Column(Text)

    started_at = Column(DateTime, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime)
    duration_seconds = Column(Integer)

    def __repr__(self):
        return f"<WorkflowExecution id={self.id} workflow={self.workflow_id} status={self.status}>"


class UserEmailCriteria(Base):
    """
    User's importance criteria for email filtering.

    Stores user-defined rules for what makes an email important.
    Used by EmailAnalyzerAgent to personalize importance detection.
    """
    __tablename__ = "user_email_criteria"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, unique=True, index=True)

    # Importance rules
    important_senders = Column(JSON, default=list)  # ["boss@company.com", "client@"]
    ignore_senders = Column(JSON, default=list)  # ["noreply@", "newsletter@"]
    keywords_important = Column(JSON, default=list)  # ["urgent", "deadline", "meeting"]
    keywords_ignore = Column(JSON, default=list)  # ["unsubscribe", "promotional"]

    # User context for AI analysis
    work_context = Column(Text)  # "I'm a Product Manager at TechCo working on AI products"
    role = Column(String)  # "Product Manager", "Software Engineer", etc.
    company = Column(String)  # "TechCo"

    # Learning data
    feedback_count = Column(Integer, default=0)
    accuracy_score = Column(Integer, default=0)  # Percentage 0-100
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<UserEmailCriteria user={self.user_id} accuracy={self.accuracy_score}%>"


class ProcessedEmail(Base):
    """
    Record of processed emails with AI analysis results.

    Stores every email analyzed by the system for:
    - Preventing duplicate processing
    - Tracking notification history
    - Learning from user feedback
    - Analytics and reporting
    """
    __tablename__ = "processed_emails"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    email_id = Column(String, nullable=False, index=True)  # Gmail message ID

    # Email metadata
    sender = Column(String, index=True)
    sender_name = Column(String)
    subject = Column(String)
    snippet = Column(Text)
    received_at = Column(DateTime, index=True)
    processed_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Analysis results
    is_important = Column(Boolean, index=True)
    importance_score = Column(Integer)  # 0-100
    category = Column(String, index=True)  # work, personal, newsletter, promotional, urgent
    urgency_level = Column(String, index=True)  # low, medium, high, critical
    reasoning = Column(Text)  # AI explanation
    suggested_action = Column(String)  # read_now, read_later, archive, delete

    # Notification status
    notification_sent = Column(Boolean, default=False, index=True)
    notification_sent_at = Column(DateTime)
    notification_channels = Column(JSON)  # ["email", "slack"]
    notification_id = Column(String)

    # User feedback (for learning)
    user_feedback = Column(String, index=True)  # correct, false_positive, false_negative, no_feedback
    feedback_at = Column(DateTime)
    feedback_note = Column(Text)  # Optional user note

    # Metadata
    has_attachments = Column(Boolean, default=False)
    is_unread = Column(Boolean, default=True)
    labels = Column(JSON)  # Gmail labels

    def __repr__(self):
        return f"<ProcessedEmail id={self.email_id} score={self.importance_score} important={self.is_important}>"
