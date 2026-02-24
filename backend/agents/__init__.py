"""
Example Agent Implementations

Import all agents here to register them on application startup.
"""

from backend.agents.task_analyzer import TaskAnalyzerAgent
from backend.agents.email_composer import EmailComposerAgent

__all__ = [
    "TaskAnalyzerAgent",
    "EmailComposerAgent"
]
