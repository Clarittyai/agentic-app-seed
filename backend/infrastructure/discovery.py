"""
Auto-Discovery System

Automatically discovers and registers agents, workflows, and triggers.
No more manual __init__.py editing!

How it works:
1. Scans backend/agents/, backend/workflows/, backend/triggers/ directories
2. Imports all .py files (except __init__.py)
3. Decorators (@agent, @workflow, @trigger_template) auto-register on import
4. Components become available immediately

Usage:
    from backend.infrastructure.discovery import discover_and_register_components

    # At app startup:
    discover_and_register_components()

    # That's it! All components are now registered.
"""

import os
import sys
import importlib.util
from pathlib import Path
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)


def discover_and_register_components() -> Tuple[int, int, int]:
    """
    Discover and register all agents, workflows, and triggers automatically.

    Returns:
        Tuple[int, int, int]: (agents_count, workflows_count, triggers_count)
    """
    logger.info("🔍 Auto-discovering components...")

    backend_path = Path(__file__).parent.parent

    # Discover agents
    agents_discovered = _discover_modules(backend_path / "agents", "backend.agents")

    # Discover workflows
    workflows_discovered = _discover_modules(backend_path / "workflows", "backend.workflows")

    # Discover triggers
    triggers_discovered = _discover_modules(backend_path / "triggers", "backend.triggers")

    # Get registration counts from registries
    from claritty_sdk.registry import AgentRegistry, WorkflowRegistry, TriggerTemplateRegistry

    agent_count = len(AgentRegistry.list_agents())
    workflow_count = len(WorkflowRegistry.list_workflows())
    trigger_count = len(TriggerTemplateRegistry.list_templates())

    logger.info(f"✅ Auto-discovery complete!")
    logger.info(f"   📁 Scanned {agents_discovered} agent files")
    logger.info(f"   📁 Scanned {workflows_discovered} workflow files")
    logger.info(f"   📁 Scanned {triggers_discovered} trigger files")
    logger.info(f"   🤖 Registered {agent_count} agents")
    logger.info(f"   🔄 Registered {workflow_count} workflows")
    logger.info(f"   ⏰ Registered {trigger_count} trigger templates")

    return agent_count, workflow_count, trigger_count


def _discover_modules(directory: Path, package_name: str) -> int:
    """
    Discover and import all Python modules in a directory.

    Args:
        directory: Path to directory to scan
        package_name: Python package name (e.g., "backend.agents")

    Returns:
        int: Number of modules discovered
    """
    if not directory.exists():
        logger.warning(f"⚠️  Directory not found: {directory}")
        return 0

    discovered_count = 0

    for file_path in directory.glob("*.py"):
        # Skip __init__.py and private files
        if file_path.name.startswith('_'):
            continue

        module_name = file_path.stem
        full_module_name = f"{package_name}.{module_name}"

        try:
            # Import the module
            # This causes decorators to execute and register components
            spec = importlib.util.spec_from_file_location(full_module_name, file_path)
            if spec and spec.loader:
                module = importlib.util.module_from_spec(spec)
                sys.modules[full_module_name] = module
                spec.loader.exec_module(module)

                logger.debug(f"   ✓ Loaded {full_module_name}")
                discovered_count += 1
        except Exception as e:
            logger.error(f"   ✗ Failed to load {full_module_name}: {e}")
            # Don't fail startup for one bad module
            continue

    return discovered_count


def get_discovery_summary() -> dict:
    """
    Get a summary of all discovered components.

    Useful for debugging and monitoring.

    Returns:
        dict: Summary with counts and details
    """
    from claritty_sdk.registry import AgentRegistry, WorkflowRegistry, TriggerTemplateRegistry

    agents = AgentRegistry.list_agents()
    workflows = WorkflowRegistry.list_workflows()
    templates = TriggerTemplateRegistry.list_templates()

    return {
        "agents": {
            "count": len(agents),
            "ids": [agent.id for agent in agents],
            "categories": list(set(agent.category for agent in agents if agent.category))
        },
        "workflows": {
            "count": len(workflows),
            "ids": [wf.id for wf in workflows],
            "execution_modes": list(set(wf.execution_mode.value for wf in workflows))
        },
        "triggers": {
            "count": len(templates),
            "ids": [t.id for t in templates],
            "types": list(set(t.template_type.value for t in templates)),
            "categories": list(set(t.category for t in templates if t.category))
        }
    }
