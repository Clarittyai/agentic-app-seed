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
