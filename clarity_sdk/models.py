"""
Pydantic models for Clarity SDK

These models provide type safety and validation for:
- Agent metadata
- Workflow definitions
- Trigger templates
- Integration requirements
- Configuration fields
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, validator
from enum import Enum
import re


class IntegrationRequirement(BaseModel):
    """
    Defines an external service integration requirement.
    Platform will prompt user to connect this service.
    """
    service: str = Field(..., description="Service identifier (slack, google-sheets, etc)")
    auth_type: str = Field(..., description="oauth, api-key, basic, none")
    description: str = Field(..., description="User-facing description")
    required: bool = Field(default=True, description="Is this integration required?")
    scopes: Optional[List[str]] = Field(default=None, description="OAuth scopes if applicable")
    config_fields: List[Dict[str, Any]] = Field(default_factory=list, description="Configuration fields")

    @validator('auth_type')
    def validate_auth_type(cls, v):
        valid_types = ['oauth', 'api-key', 'basic', 'none']
        if v not in valid_types:
            raise ValueError(f"auth_type must be one of {valid_types}")
        return v


class AgentMetadata(BaseModel):
    """Complete agent metadata for platform registration"""
    id: str = Field(..., description="Unique agent identifier")
    name: str = Field(..., description="User-facing name")
    description: str = Field(..., description="What this agent does")
    version: str = Field(default="1.0.0", description="Agent version")
    category: str = Field(default="general", description="Category for organization")
    inputs: Dict[str, Any] = Field(..., description="Expected input schema")
    outputs: Dict[str, Any] = Field(..., description="Expected output schema")
    integrations: List[IntegrationRequirement] = Field(default_factory=list)
    capabilities: List[str] = Field(default_factory=list, description="Agent capabilities")
    rate_limit: Optional[Dict[str, int]] = Field(default=None, description="Rate limiting")
    timeout: int = Field(default=300, description="Execution timeout in seconds")
    retry_policy: Dict[str, Any] = Field(
        default_factory=lambda: {"max_retries": 3, "backoff": "exponential"}
    )

    @validator('id')
    def validate_id(cls, v):
        if not re.match(r'^[a-z0-9-]+$', v):
            raise ValueError("id must contain only lowercase letters, numbers, and hyphens")
        return v

    @validator('timeout')
    def validate_timeout(cls, v):
        if v < 1 or v > 3600:
            raise ValueError("timeout must be between 1 and 3600 seconds")
        return v


class ExecutionMode(str, Enum):
    """Workflow execution modes"""
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    CONDITIONAL = "conditional"
    DAG = "dag"  # Directed Acyclic Graph


class WorkflowStep(BaseModel):
    """Single step in a workflow"""
    agent_id: str = Field(..., description="Agent to execute")
    name: str = Field(..., description="Step name")
    input_mapping: Optional[Dict[str, str]] = Field(
        default=None,
        description="Map workflow data to agent inputs"
    )
    output_key: Optional[str] = Field(default=None, description="Store output in workflow context")
    condition: Optional[str] = Field(default=None, description="Python expression for conditional execution")
    retry_on_failure: bool = Field(default=True)
    timeout_override: Optional[int] = Field(default=None)


class WorkflowMetadata(BaseModel):
    """Complete workflow metadata"""
    id: str = Field(..., description="Unique workflow identifier")
    name: str = Field(..., description="User-facing name")
    description: str = Field(..., description="What this workflow does")
    version: str = Field(default="1.0.0")
    trigger_ids: List[str] = Field(default_factory=list, description="Associated triggers")
    execution_mode: ExecutionMode = Field(default=ExecutionMode.SEQUENTIAL)
    steps: List[WorkflowStep] = Field(default_factory=list)
    timeout: int = Field(default=600, description="Workflow timeout in seconds")
    max_retries: int = Field(default=3)
    error_handling: str = Field(default="fail", description="fail, continue, retry")

    @validator('id')
    def validate_id(cls, v):
        if not re.match(r'^[a-z0-9-]+$', v):
            raise ValueError("id must contain only lowercase letters, numbers, and hyphens")
        return v


class TriggerTemplateType(str, Enum):
    """Types of trigger templates"""
    # Time-based
    SCHEDULE_CRON = "schedule.cron"
    SCHEDULE_INTERVAL = "schedule.interval"
    SCHEDULE_DAILY = "schedule.daily"
    SCHEDULE_WEEKLY = "schedule.weekly"
    SCHEDULE_MONTHLY = "schedule.monthly"
    SCHEDULE_ONCE = "schedule.once"

    # Data-based
    DATA_CHANGE = "data.change"
    DATA_THRESHOLD = "data.threshold"
    DATA_PATTERN = "data.pattern"

    # Event-based
    WEBHOOK = "webhook"
    USER_ACTION = "user.action"
    EXTERNAL_EVENT = "external.event"

    # Manual
    MANUAL = "manual"


class ConfigField(BaseModel):
    """User-configurable field in a trigger template"""
    key: str = Field(..., description="Field identifier")
    label: str = Field(..., description="User-facing label")
    type: str = Field(..., description="Field type (time, number, text, select, etc)")
    required: bool = Field(default=True)
    default: Optional[Any] = Field(default=None)
    options: Optional[List[Any]] = Field(default=None, description="For select/multiselect")
    validation: Optional[Dict[str, Any]] = Field(default=None, description="Validation rules")
    help_text: Optional[str] = Field(default=None, description="Help text for users")

    @validator('type')
    def validate_type(cls, v):
        valid_types = [
            'time', 'timezone', 'number', 'text', 'select', 'multiselect',
            'boolean', 'cron', 'secret', 'date', 'datetime'
        ]
        if v not in valid_types:
            raise ValueError(f"type must be one of {valid_types}")
        return v


class TriggerTemplate(BaseModel):
    """
    Template for a trigger that users can configure.
    Defined by developer, instantiated by users.
    """
    id: str = Field(..., description="Unique template ID")
    name: str = Field(..., description="User-facing name")
    description: str = Field(..., description="What this trigger does")
    template_type: TriggerTemplateType
    workflow_id: str = Field(..., description="Which workflow this triggers")
    config_fields: List[ConfigField] = Field(
        ...,
        description="Fields user can configure"
    )
    category: str = Field(default="automation")
    icon: Optional[str] = Field(default=None)
    max_instances_per_user: Optional[int] = Field(default=None)
    requires_premium: bool = Field(default=False)

    @validator('id')
    def validate_id(cls, v):
        if not re.match(r'^[a-z0-9-]+$', v):
            raise ValueError("id must contain only lowercase letters, numbers, and hyphens")
        return v


class AgentResult(BaseModel):
    """Result returned by agent execution"""
    success: bool = Field(..., description="Whether execution succeeded")
    data: Dict[str, Any] = Field(default_factory=dict, description="Output data")
    error: Optional[str] = Field(default=None, description="Error message if failed")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    class Config:
        # Allow arbitrary types for flexibility
        arbitrary_types_allowed = True
