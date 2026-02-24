"""
Global registries for agents, workflows, and trigger templates

These registries store metadata about all registered components
and provide lookup functionality.
"""

from typing import Dict, List, Optional, Callable, Any
from clarity_sdk.models import AgentMetadata, WorkflowMetadata, TriggerTemplate
from clarity_sdk.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)


class AgentRegistry:
    """
    Global registry of all agents.

    Agents register themselves when the @agent decorator is applied.
    """
    _agents: Dict[str, AgentMetadata] = {}
    _instances: Dict[str, Callable] = {}

    @classmethod
    def register(cls, metadata: AgentMetadata, instance: Callable):
        """Register an agent with metadata and class reference"""
        if metadata.id in cls._agents:
            logger.warning(f"Agent {metadata.id} already registered, overwriting")

        cls._agents[metadata.id] = metadata
        cls._instances[metadata.id] = instance

        logger.debug(f"Registered agent: {metadata.id} ({metadata.name})")

    @classmethod
    def get_agent(cls, agent_id: str) -> Optional[Callable]:
        """Get agent class by ID"""
        return cls._instances.get(agent_id)

    @classmethod
    def get_metadata(cls, agent_id: str) -> Optional[AgentMetadata]:
        """Get agent metadata by ID"""
        return cls._agents.get(agent_id)

    @classmethod
    def list_agents(cls) -> List[AgentMetadata]:
        """List all registered agents"""
        return list(cls._agents.values())

    @classmethod
    def list_by_category(cls, category: str) -> List[AgentMetadata]:
        """List agents by category"""
        return [a for a in cls._agents.values() if a.category == category]

    @classmethod
    def clear(cls):
        """Clear registry (mainly for testing)"""
        cls._agents.clear()
        cls._instances.clear()

    @classmethod
    def exists(cls, agent_id: str) -> bool:
        """Check if agent exists"""
        return agent_id in cls._agents


class WorkflowRegistry:
    """
    Global registry of all workflows.

    Workflows register themselves when the @workflow decorator is applied.
    """
    _workflows: Dict[str, WorkflowMetadata] = {}
    _instances: Dict[str, Callable] = {}

    @classmethod
    def register(cls, metadata: WorkflowMetadata, instance: Callable):
        """Register a workflow with metadata and function reference"""
        if metadata.id in cls._workflows:
            logger.warning(f"Workflow {metadata.id} already registered, overwriting")

        cls._workflows[metadata.id] = metadata
        cls._instances[metadata.id] = instance

        logger.debug(f"Registered workflow: {metadata.id} ({metadata.name})")

    @classmethod
    def get_workflow(cls, workflow_id: str) -> Optional[Callable]:
        """Get workflow function by ID"""
        return cls._instances.get(workflow_id)

    @classmethod
    def get_metadata(cls, workflow_id: str) -> Optional[WorkflowMetadata]:
        """Get workflow metadata by ID"""
        return cls._workflows.get(workflow_id)

    @classmethod
    def list_workflows(cls) -> List[WorkflowMetadata]:
        """List all registered workflows"""
        return list(cls._workflows.values())

    @classmethod
    def clear(cls):
        """Clear registry (mainly for testing)"""
        cls._workflows.clear()
        cls._instances.clear()

    @classmethod
    def exists(cls, workflow_id: str) -> bool:
        """Check if workflow exists"""
        return workflow_id in cls._workflows


class TriggerTemplateRegistry:
    """
    Global registry of all trigger templates.

    Trigger templates register themselves when the @trigger_template decorator is applied.
    """
    _templates: Dict[str, TriggerTemplate] = {}

    @classmethod
    def register(cls, template: TriggerTemplate):
        """Register a trigger template"""
        if template.id in cls._templates:
            logger.warning(f"Trigger template {template.id} already registered, overwriting")

        cls._templates[template.id] = template

        logger.debug(f"Registered trigger template: {template.id} ({template.name})")

    @classmethod
    def get_template(cls, template_id: str) -> Optional[TriggerTemplate]:
        """Get trigger template by ID"""
        return cls._templates.get(template_id)

    @classmethod
    def list_templates(cls, template_type: Optional[str] = None) -> List[TriggerTemplate]:
        """List all trigger templates, optionally filtered by type"""
        if template_type:
            return [t for t in cls._templates.values() if t.template_type == template_type]
        return list(cls._templates.values())

    @classmethod
    def list_by_category(cls, category: str) -> List[TriggerTemplate]:
        """List templates by category"""
        return [t for t in cls._templates.values() if t.category == category]

    @classmethod
    def clear(cls):
        """Clear registry (mainly for testing)"""
        cls._templates.clear()

    @classmethod
    def exists(cls, template_id: str) -> bool:
        """Check if template exists"""
        return template_id in cls._templates
